from flask import Blueprint, request, jsonify
from app.services.analytics_service import AnalyticsService
from app.utils.validators import parse_date

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/kpis', methods=['GET'])
def get_kpis():
    property_id = request.args.get('property_id')
    location = request.args.get('location')
    start_date = parse_date(request.args.get('start_date'))
    end_date = parse_date(request.args.get('end_date'))

    kpis = AnalyticsService.get_dashboard_kpis(
        property_id=property_id,
        location=location,
        start_date=start_date,
        end_date=end_date
    )
    return jsonify({'success': True, 'kpis': kpis}), 200

@analytics_bp.route('/trends', methods=['GET'])
def get_trends():
    property_id = request.args.get('property_id')
    days = int(request.args.get('days', 30))
    trends = AnalyticsService.get_demand_and_revenue_trends(property_id=property_id, days_lookback=days)
    return jsonify({'success': True, 'trends': trends}), 200

@analytics_bp.route('/event-impact', methods=['GET'])
def get_event_impact():
    property_id = request.args.get('property_id')
    analysis = AnalyticsService.get_event_impact_analysis(property_id=property_id)
    return jsonify({'success': True, 'analysis': analysis}), 200

@analytics_bp.route('/simulation', methods=['GET'])
def get_simulation():
    property_id = request.args.get('property_id')
    days = int(request.args.get('days', 30))
    pid = int(property_id) if property_id and property_id != 'all' else None
    sim = AnalyticsService.simulate_pricing_strategies(property_id=pid, simulation_days=days)
    return jsonify({'success': True, 'simulation': sim}), 200


@analytics_bp.route('/revenue', methods=['GET'])
def get_revenue():
    property_id = request.args.get('property_id')
    preset = request.args.get('preset')
    start_date = parse_date(request.args.get('start_date'))
    end_date = parse_date(request.args.get('end_date'))
    interval = request.args.get('interval', 'daily')
    date_basis = request.args.get('date_basis', 'check_in')

    data = AnalyticsService.get_revenue_analytics(
        property_id=property_id,
        start_date=start_date,
        end_date=end_date,
        preset=preset,
        interval=interval,
        date_basis=date_basis
    )
    return jsonify(data), (200 if data.get('success', True) else 400)
