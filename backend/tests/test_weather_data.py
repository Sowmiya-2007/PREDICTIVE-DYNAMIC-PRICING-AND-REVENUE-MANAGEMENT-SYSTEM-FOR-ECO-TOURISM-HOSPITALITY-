import datetime
import pytest
from app import create_app
from app.services.weather_service import WeatherService
from app.ml.data_preprocessing import clean_and_handle_missing_values, load_and_preprocess_historical_data
import pandas as pd

@pytest.fixture
def app_instance():
    app = create_app()
    app.config['TESTING'] = True
    return app

def test_weather_service_lookup(app_instance):
    with app_instance.app_context():
        today = datetime.date.today()
        weather = WeatherService.get_weather_for_date("Wayanad, Kerala", today)
        assert weather is not None
        assert 'temp_c' in weather
        assert 'rainfall_mm' in weather
        assert 'eco_suitability_score' in weather
        assert weather['eco_suitability_score'] > 0

def test_weather_impact_calculation():
    dry_weather = {'temp_c': 22.0, 'rainfall_mm': 1.0, 'eco_suitability_score': 0.94, 'weather_condition': 'Clear & Sunny'}
    impact_dry = WeatherService.calculate_weather_impact(dry_weather)
    assert impact_dry['multiplier'] >= 1.0

    rainy_weather = {'temp_c': 23.0, 'rainfall_mm': 45.0, 'eco_suitability_score': 0.60, 'weather_condition': 'Heavy Rain'}
    impact_rain = WeatherService.calculate_weather_impact(rainy_weather)
    assert impact_rain['multiplier'] < 1.0

def test_data_preprocessing_cleaning():
    raw_df = pd.DataFrame([
        {'booking_code': 'B1', 'property_id': 1, 'check_in_date': '2026-10-15', 'lead_time_days': None, 'price_per_night': None},
        {'booking_code': 'B2', 'property_id': 1, 'check_in_date': '2026-10-16', 'lead_time_days': 12, 'price_per_night': 4200.0}
    ])
    cleaned = clean_and_handle_missing_values(raw_df, dataset_type='bookings')
    assert cleaned['lead_time_days'].isna().sum() == 0
    assert cleaned['price_per_night'].isna().sum() == 0
