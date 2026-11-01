from flask import Blueprint, request, jsonify
import datetime
from app.services.weather_service import WeatherService
from app.utils.validators import parse_date

weather_bp = Blueprint('weather', __name__, url_prefix='/api/weather')

@weather_bp.route('/destinations', methods=['GET'])
def get_destinations_weather():
    """Returns today's climate conditions & demand impact for all eco-tourism properties."""
    data = WeatherService.get_all_destinations_weather()
    return jsonify({
        'success': True,
        'destinations': data
    }), 200

@weather_bp.route('/forecast', methods=['GET'])
def get_property_forecast():
    """Returns multi-day weather forecast for a given property."""
    property_id = request.args.get('property_id')
    days = int(request.args.get('days', 7))

    if not property_id:
        return jsonify({'success': False, 'message': 'Property ID is required.'}), 400

    forecast = WeatherService.get_forecast_for_property(property_id=int(property_id), days=days)
    return jsonify({
        'success': True,
        'forecast': forecast
    }), 200

@weather_bp.route('/lookup', methods=['GET'])
def lookup_weather_for_date():
    """Returns weather observation or prediction for a specific date and location."""
    location = request.args.get('location', 'Wayanad, Kerala')
    date_str = request.args.get('date')
    target_date = parse_date(date_str) if date_str else datetime.date.today()

    w = WeatherService.get_weather_for_date(location, target_date)
    impact = WeatherService.calculate_weather_impact(w)
    return jsonify({
        'success': True,
        'weather': w,
        'impact': impact
    }), 200
