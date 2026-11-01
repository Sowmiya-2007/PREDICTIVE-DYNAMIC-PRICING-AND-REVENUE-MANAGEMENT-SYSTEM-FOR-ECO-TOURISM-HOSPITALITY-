from flask import Blueprint, request, jsonify
import datetime
import logging
import numpy as np
from app.database import db_session
from app.models.property import Property, RoomType
from app.models.event import LocalEvent
from app.models.prediction import DemandPrediction, ModelTrainingRun
from app.models.audit import AuditLog
from app.ml.feature_engineering import construct_feature_vector
from app.ml.demand_model import global_demand_model
from app.ml.multi_model import global_multi_model, MODEL_DISPLAY_NAMES
from app.ml.train_pipeline import run_model_training
from app.utils.auth_helpers import token_required
from app.utils.validators import parse_date

logger = logging.getLogger(__name__)

pred_bp = Blueprint('predictions', __name__, url_prefix='/api')

@pred_bp.route('/predictions/predict', methods=['POST'])
@token_required
def predict_demand(current_user):
    data = request.get_json() or {}
    property_id = data.get('property_id')
    room_type_id = data.get('room_type_id')
    target_date_str = data.get('target_date')
    chosen_model = data.get('model_name', 'best')

    if not property_id or not target_date_str:
        return jsonify({'success': False, 'message': 'Property ID and target date are required.'}), 400

    target_date = parse_date(target_date_str)
    if not target_date:
        return jsonify({'success': False, 'message': 'Invalid target date format. Use YYYY-MM-DD.'}), 400

    prop = db_session.query(Property).filter_by(id=property_id).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Property not found.'}), 404

    rt = None
    if room_type_id:
        rt = db_session.query(RoomType).filter_by(id=room_type_id, property_id=property_id).first()

    events = db_session.query(LocalEvent).filter(LocalEvent.status != 'cancelled').all()
    from app.services.weather_service import WeatherService
    weather_info = WeatherService.get_weather_for_date(prop.location, target_date, property_id=prop.id)
    lead_time = max(1, (target_date - datetime.date.today()).days)

    feature_dict, vector, _ = construct_feature_vector(
        target_date=target_date,
        property_obj=prop,
        room_type_obj=rt,
        active_events=events,
        lead_time_days=lead_time,
        current_occupancy_pct=50.0,
        weather_dict=weather_info
    )

    pred_price, all_model_prices, confidence, model_used = global_multi_model.predict(feature_dict, model_name=chosen_model)

    # Compute real SHAP explanation
    shap_explanation = global_multi_model.explain_prediction(feature_dict, model_name=model_used)

    total_rooms = rt.total_rooms if rt else prop.total_capacity
    est_rooms = float(np.clip(round((feature_dict['current_occupancy_pct'] / 100.0) * total_rooms, 1), 1.0, total_rooms))
    prediction = DemandPrediction(
        property_id=prop.id,
        room_type_id=rt.id if rt else None,
        target_date=target_date,
        predicted_demand=est_rooms,
        predicted_occupancy_rate=feature_dict['current_occupancy_pct'],
        predicted_price=pred_price,
        all_model_prices=all_model_prices,
        confidence_score=confidence,
        influencing_factors=feature_dict,
        model_version=global_multi_model.version
    )
    db_session.add(prediction)
    db_session.commit()

    return jsonify({
        'success': True,
        'prediction': prediction.to_dict(),
        'predicted_price': pred_price,
        'all_model_prices': all_model_prices,
        'model_used': model_used,
        'model_display': MODEL_DISPLAY_NAMES.get(model_used, model_used),
        'shap_explanation': shap_explanation,
        'feature_summary': {
            'base_price': feature_dict.get('base_price'),
            'competitor_price': feature_dict.get('competitor_price'),
            'room_category_code': feature_dict.get('room_category_code'),
            'is_weekend': bool(feature_dict['is_weekend']),
            'season_index': feature_dict['season_index'],
            'is_holiday': bool(feature_dict.get('is_holiday')),
            'has_event': bool(feature_dict['has_event']),
            'primary_event': feature_dict.get('primary_event_title', 'None'),
            'event_intensity': feature_dict.get('max_event_intensity', 1.0),
            'weather_condition': feature_dict.get('weather_condition', 'Clear & Sunny'),
            'temp_c': feature_dict.get('temp_c', 24.0),
            'rainfall_mm': feature_dict.get('rainfall_mm', 0.0),
            'eco_suitability_score': feature_dict.get('eco_suitability_score', 0.85)
        }
    }), 200

@pred_bp.route('/predictions/history', methods=['GET'])
def get_prediction_history():
    property_id = request.args.get('property_id')
    query = db_session.query(DemandPrediction)
    if property_id and property_id != 'all':
        query = query.filter(DemandPrediction.property_id == int(property_id))

    records = query.order_by(DemandPrediction.created_at.desc()).limit(30).all()
    return jsonify({
        'success': True,
        'predictions': [r.to_dict() for r in records]
    }), 200

@pred_bp.route('/ml/train', methods=['POST'])
@token_required
def train_model(current_user):
    try:
        training_result = run_model_training()
        run_dict = training_result['run']
        
        audit = AuditLog(
            user_id=current_user.id,
            action='MULTI_MODEL_TRAINED',
            entity_type='model_training_run',
            entity_id=run_dict['id'],
            details={
                'version': run_dict['version'],
                'best_model': training_result['best_model'],
                'all_models': training_result['all_models']
            }
        )
        db_session.add(audit)
        db_session.commit()

        return jsonify({
            'success': True,
            'message': (
                f"Trained 3 regression models (Linear Regression, Random Forest, XGBoost). "
                f"Best validated model: {training_result['best_model_display']} (MAE: {run_dict['mae']}%)."
            ),
            'run': run_dict,
            'all_models': training_result['all_models'],
            'best_model': training_result['best_model'],
            'best_model_display': training_result['best_model_display'],
            'global_shap_importances': training_result['global_shap_importances']
        }), 200
    except Exception as e:
        logger.error(f"Error training models: {e}")
        return jsonify({'success': False, 'message': f"Training failed: {str(e)}"}), 500

@pred_bp.route('/ml/status', methods=['GET'])
def get_ml_status():
    active_run = db_session.query(ModelTrainingRun).filter_by(is_active=True).first()
    if not active_run:
        active_run = db_session.query(ModelTrainingRun).order_by(ModelTrainingRun.trained_at.desc()).first()

    # Load multi-model state
    all_models = global_multi_model.metrics_by_model
    best_model = global_multi_model.best_model_name
    shap_importances = global_multi_model.global_shap_importances

    return jsonify({
        'success': True,
        'has_active_model': bool(global_multi_model.models or active_run),
        'active_run': active_run.to_dict() if active_run else None,
        'all_models': all_models,
        'best_model': best_model,
        'best_model_display': MODEL_DISPLAY_NAMES.get(best_model, best_model),
        'global_shap_importances': shap_importances,
        'available_models': [
            {'key': 'best', 'name': f"Best Validated Model ({MODEL_DISPLAY_NAMES.get(best_model, 'Random Forest')})"},
            {'key': 'random_forest', 'name': 'Random Forest Regressor'},
            {'key': 'xgboost', 'name': 'XGBoost Regressor'},
            {'key': 'linear_regression', 'name': 'Linear Regression'}
        ],
        'methodology_note': (
            "Three regression models (Linear Regression, Random Forest, XGBoost) are trained on the exact same "
            "chronological train/test split to prevent temporal future-leakage. Preprocessing scalers are fitted "
            "strictly on training observations. Explainability is provided via real computed SHAP values "
            "(LinearExplainer & TreeExplainer)."
        )
    }), 200

@pred_bp.route('/ml/explain', methods=['POST'])
@token_required
def explain_demand_prediction(current_user):
    """Compute on-demand SHAP explanation for a feature dictionary and model."""
    data = request.get_json() or {}
    feature_dict = data.get('features')
    model_name = data.get('model_name', 'best')

    if not feature_dict:
        return jsonify({'success': False, 'message': 'Features dictionary required.'}), 400

    explanation = global_multi_model.explain_prediction(feature_dict, model_name=model_name)
    return jsonify({
        'success': True,
        'explanation': explanation
    }), 200
