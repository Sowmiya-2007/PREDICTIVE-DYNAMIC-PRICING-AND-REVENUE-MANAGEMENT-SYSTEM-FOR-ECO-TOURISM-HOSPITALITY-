from flask import Blueprint, request, jsonify
import datetime
from app.database import db_session
from app.models.recommendation import PricingRecommendation, PriceHistory
from app.services.pricing_service import PricingEngineService
from app.utils.auth_helpers import token_required
from app.utils.validators import parse_date

recommendation_bp = Blueprint('recommendations', __name__, url_prefix='/api/pricing')

@recommendation_bp.route('/recommend', methods=['POST'])
@token_required
def generate_recommendation(current_user):
    data = request.get_json() or {}
    property_id = data.get('property_id')
    room_type_id = data.get('room_type_id')
    target_date_str = data.get('target_date')

    if not property_id or not target_date_str:
        return jsonify({'success': False, 'message': 'Property ID and target date are required.'}), 400

    target_date = parse_date(target_date_str)
    if not target_date:
        return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    model_name = data.get('model_name', 'best')

    try:
        rec = PricingEngineService.generate_recommendation(
            property_id=int(property_id),
            room_type_id=int(room_type_id) if room_type_id else 1,
            target_date=target_date,
            model_name=model_name,
            user_id=current_user.id
        )
        return jsonify({
            'success': True,
            'message': f"Pricing recommendation calculated successfully using {rec.selected_model_name}.",
            'recommendation': rec.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Engine execution error: {str(e)}"}), 500

@recommendation_bp.route('/recommendations', methods=['GET'])
def list_recommendations():
    status = request.args.get('status', '').strip()
    property_id = request.args.get('property_id', '').strip()

    query = db_session.query(PricingRecommendation)
    if status and status != 'all':
        query = query.filter(PricingRecommendation.status == status)
    if property_id and property_id != 'all':
        query = query.filter(PricingRecommendation.property_id == int(property_id))

    records = query.order_by(PricingRecommendation.created_at.desc()).limit(50).all()
    return jsonify({
        'success': True,
        'count': len(records),
        'recommendations': [r.to_dict() for r in records]
    }), 200

@recommendation_bp.route('/recommendations/<int:rec_id>/approve', methods=['POST'])
@token_required
def approve_recommendation(current_user, rec_id: int):
    try:
        rec = PricingEngineService.approve_recommendation(recommendation_id=rec_id, user=current_user)
        return jsonify({
            'success': True,
            'message': f"Recommendation #{rec.id} approved and applied to room inventory at ₹{rec.recommended_price:.0f}.",
            'recommendation': rec.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Error: {str(e)}"}), 500

@recommendation_bp.route('/recommendations/<int:rec_id>/override', methods=['POST'])
@token_required
def override_recommendation(current_user, rec_id: int):
    data = request.get_json() or {}
    override_price = data.get('override_price')
    if override_price is None:
        return jsonify({'success': False, 'message': 'Override price is required.'}), 400

    try:
        rec = PricingEngineService.approve_recommendation(
            recommendation_id=rec_id,
            user=current_user,
            override_price=float(override_price)
        )
        return jsonify({
            'success': True,
            'message': f"Recommendation #{rec.id} manually overridden and applied at ₹{rec.override_price:.0f}.",
            'recommendation': rec.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Error: {str(e)}"}), 500

@recommendation_bp.route('/recommendations/<int:rec_id>/reject', methods=['POST'])
@token_required
def reject_recommendation(current_user, rec_id: int):
    data = request.get_json() or {}
    reason = data.get('reason', 'Hospitality manager rejected adjustment.')

    try:
        rec = PricingEngineService.reject_recommendation(
            recommendation_id=rec_id,
            user=current_user,
            rejection_reason=reason
        )
        return jsonify({
            'success': True,
            'message': f"Recommendation #{rec.id} rejected.",
            'recommendation': rec.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f"Error: {str(e)}"}), 500

@recommendation_bp.route('/history', methods=['GET'])
def get_price_history():
    property_id = request.args.get('property_id')
    query = db_session.query(PriceHistory)
    if property_id and property_id != 'all':
        query = query.filter(PriceHistory.property_id == int(property_id))

    records = query.order_by(PriceHistory.created_at.desc()).limit(40).all()
    return jsonify({
        'success': True,
        'history': [r.to_dict() for r in records]
    }), 200
