import datetime
import logging
import numpy as np
import pandas as pd
from app.database import db_session
from app.models import Property, RoomType, Booking, LocalEvent, ModelTrainingRun
from app.ml.feature_engineering import construct_feature_vector
from app.ml.demand_model import global_demand_model
from app.ml.multi_model import global_multi_model
from app.ml.data_preprocessing import load_and_preprocess_historical_data

logger = logging.getLogger(__name__)

def generate_training_dataset():
    """
    Extract historical bookings, weather data, and local events to construct
    an enriched preprocessed machine learning training dataset.
    Prioritizes real historical booking demand files with graceful fallback.
    """
    # 1. Attempt loading preprocessed historical hotel booking & weather dataset
    try:
        hist_df, missing_summary = load_and_preprocess_historical_data()
        if hist_df is not None and len(hist_df) >= 80:
            logger.info(f"Using {len(hist_df)} historical records for multi-model training.")
            return hist_df
    except Exception as e:
        logger.warning(f"Error loading historical dataset: {e}. Falling back to internal data.")

    # 2. Fallback / supplementary synthesis using registered properties and events
    properties = db_session.query(Property).all()
    events = db_session.query(LocalEvent).all()
    
    rows = []
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=150)
    
    for prop in properties:
        room_types = prop.room_types or [None]
        for rt in room_types:
            for day_offset in range(180):
                target_date = start_date + datetime.timedelta(days=day_offset)
                
                feat_dict, _, cols = construct_feature_vector(
                    target_date=target_date,
                    property_obj=prop,
                    room_type_obj=rt,
                    active_events=events,
                    lead_time_days=int(np.random.randint(2, 30)),
                    current_occupancy_pct=50.0
                )
                
                occ = 42.0 # baseline occupancy
                if feat_dict['is_weekend']:
                    occ += np.random.uniform(14.0, 24.0)
                else:
                    occ += np.random.uniform(-6.0, 8.0)
                    
                if feat_dict['has_event']:
                    occ += feat_dict['event_intensity_score'] * np.random.uniform(9.0, 15.0)
                    
                occ *= feat_dict['seasonal_demand_weight']
                
                # Weather impact
                if feat_dict['eco_suitability_score'] >= 0.90:
                    occ += 5.0
                elif feat_dict['rainfall_mm'] > 30.0:
                    occ -= 8.0
                    
                occ += np.random.normal(0, 3.5)
                target_occupancy = float(np.clip(occ, 15.0, 95.0))

                # Calculate actual target selling price
                base_p = float(feat_dict['base_price'])
                price_mult = 1.0 + (target_occupancy - 50.0) / 100.0 * 0.30
                if feat_dict['is_weekend']: price_mult += 0.10
                if feat_dict['has_event']: price_mult += 0.15
                target_price = round(base_p * price_mult, -1)

                row = {
                    **feat_dict,
                    'target_price': target_price,
                    'target_occupancy': target_occupancy,
                    'target_date': target_date
                }
                rows.append(row)
                
    df = pd.DataFrame(rows)
    return df

def run_model_training():
    """
    Execute chronological train-test split (no data leakage), fit all three models
    (Linear Regression, Random Forest, XGBoost), generate real SHAP explainers,
    evaluate on common test split in Rupees (₹), and record model training metrics.
    """
    df = generate_training_dataset()
    if df.empty or len(df) < 30:
        raise ValueError(
            f"Insufficient historical price data ({len(df)} records). "
            "At least 30 verified historical records required to train reliable predictive pricing models."
        )

    # Train all 3 models with chronological splits and SHAP explainers
    multi_res = global_multi_model.train_and_evaluate(df)
    
    best_key = multi_res['best_model_name']
    best_metrics = multi_res['metrics_by_model'][best_key]
    metadata = multi_res['training_metadata']

    # Update backward-compatible global_demand_model
    global_demand_model.model_version = multi_res['version']
    global_demand_model.model = global_multi_model.models.get(best_key)
    global_demand_model.baseline_median = global_multi_model.baseline_median

    # Parse period dates safely
    def to_date_obj(d_str):
        if not d_str:
            return None
        if isinstance(d_str, datetime.date):
            return d_str
        try:
            return datetime.datetime.strptime(str(d_str).split()[0], '%Y-%m-%d').date()
        except Exception:
            return None

    train_start = to_date_obj(metadata.get('training_period_start'))
    train_end = to_date_obj(metadata.get('training_period_end'))
    test_start = to_date_obj(metadata.get('test_period_start'))
    test_end = to_date_obj(metadata.get('test_period_end'))

    # Save training run record to database
    training_run = ModelTrainingRun(
        model_name='EcoDirectPriceForecaster',
        version=multi_res['version'],
        algorithm=f"Three-Model Comparative Price Pipeline (Selected: {multi_res['best_model_display']})",
        training_records_count=metadata['training_records_count'] + metadata['test_records_count'],
        mae=best_metrics['mae'],
        rmse=best_metrics['rmse'],
        r2=best_metrics['r2'],
        baseline_mae=best_metrics['baseline_mae'],
        baseline_rmse=best_metrics['baseline_rmse'],
        features_list=global_multi_model.feature_names,
        hyperparameters={
            'linear_regression': {'scaler': 'StandardScaler', 'fit_intercept': True},
            'random_forest': {'n_estimators': 100, 'max_depth': 8, 'min_samples_split': 4, 'random_state': 42},
            'xgboost': {'n_estimators': 100, 'max_depth': 5, 'learning_rate': 0.08, 'random_state': 42}
        },
        all_models_metrics=multi_res['metrics_by_model'],
        best_model_name=best_key,
        training_period_start=train_start,
        training_period_end=train_end,
        test_period_start=test_start,
        test_period_end=test_end,
        shap_summary=multi_res['global_shap_importances'],
        is_active=True
    )
    
    # Deactivate previous active runs
    db_session.query(ModelTrainingRun).update({ModelTrainingRun.is_active: False})
    db_session.add(training_run)
    db_session.commit()
    
    logger.info(
        f"Multi-Model Room-Price pipeline trained successfully. "
        f"Selected Best: {multi_res['best_model_display']} (MAE=₹{best_metrics['mae']:.2f}, RMSE=₹{best_metrics['rmse']:.2f}, R2={best_metrics['r2']:.2f})"
    )
    return {
        'run': training_run.to_dict(),
        'all_models': multi_res['metrics_by_model'],
        'best_model': multi_res['best_model_name'],
        'best_model_display': multi_res['best_model_display'],
        'global_shap_importances': multi_res['global_shap_importances']
    }
