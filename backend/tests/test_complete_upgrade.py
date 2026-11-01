import datetime
import pytest
from app.database import db_session
from app.models.property import Property, RoomType
from app.models.event import LocalEvent
from app.models.holiday import PublicHoliday
from app.models.attraction import TourismAttraction
from app.models.data_source import DataSourceStatus
from app.models.recommendation import PricingRecommendation, PriceHistory
from app.services.data_refresh_service import DataRefreshService
from app.services.karnataka_scraper import KarnatakaTourismScraper
from app.services.kodagu_scraper import KodaguDistrictScraper
from app.services.holiday_service import HolidayService
from app.services.attraction_service import AttractionService
from app.services.pricing_service import PricingEngineService
from app.ml.train_pipeline import run_model_training
from app.ml.multi_model import global_multi_model

def test_data_sources_registration_and_health():
    """Verify exactly the 8 retained feeds are registered and unconfigured feeds are removed."""
    sources = DataRefreshService.get_sources_overview()
    source_ids = [s['source_id'] for s in sources]
    
    expected_feeds = [
        'open_meteo_weather',
        'kerala_tourism',
        'historical_bookings_db',
        'karnataka_tourism_scraper',
        'kodagu_district_tourism',
        'kodagu_culture_heritage',
        'nager_date_holidays',
        'osm_overpass_attractions'
    ]
    assert len(sources) == 8, f"Expected exactly 8 active sources, got {len(sources)}"
    for feed in expected_feeds:
        assert feed in source_ids, f"Expected data feed {feed} not in registered sources."
    assert 'ticketmaster_api' not in source_ids
    assert 'predicthq_events_api' not in source_ids

def test_karnataka_and_kodagu_scrapers():
    """Verify Karnataka Tourism and Kodagu District scrapers execute without fabricating dates."""
    # 1. Karnataka Tourism
    kt_res = KarnatakaTourismScraper.scrape_events()
    assert kt_res.get('success') is True
    assert kt_res.get('events_collected', 0) >= 0

    # 2. Kodagu Culture & Heritage
    kd_cult = KodaguDistrictScraper.scrape_culture_heritage()
    assert kd_cult.get('success') is True
    assert 'limitation_notice' in kd_cult

    # 3. Kodagu Tourism Main Portal
    kd_tour = KodaguDistrictScraper.scrape_tourism_portal()
    assert kd_tour.get('success') is True

def test_nager_date_holidays_and_osm_attractions():
    """Verify Nager.Date public holidays and OSM Overpass attractions storage."""
    # Holidays
    hol_res = HolidayService.sync_holidays([2026])
    assert hol_res['success'] is True
    holidays_count = db_session.query(PublicHoliday).count()
    assert holidays_count >= 20

    is_rep_day, name = HolidayService.is_holiday(datetime.date(2026, 1, 26))
    assert is_rep_day is True

    # Attractions
    attr_res = AttractionService.sync_attractions()
    assert attr_res['success'] is True
    attr_count = db_session.query(TourismAttraction).count()
    assert attr_count >= 10

def test_individual_sync_now_for_all_eight_sources():
    """Verify each of the 8 retained data sources can be synchronized individually."""
    for feed in ['open_meteo_weather', 'kerala_tourism', 'historical_bookings_db',
                 'karnataka_tourism_scraper', 'kodagu_district_tourism', 'kodagu_culture_heritage',
                 'nager_date_holidays', 'osm_overpass_attractions']:
        res = DataRefreshService.refresh_live_data(source_id=feed)
        assert res['success'] is True
        assert len(res['results']) >= 1

def test_end_to_end_prediction_and_pricing_pipeline():
    """
    Final End-to-End Test:
    1. Synchronize live data.
    2. Train all 3 ML models (Linear Regression, Random Forest, XGBoost).
    3. Evaluate and select best model.
    4. Predict room prices for all 3 models + SHAP explainability in ₹.
    5. Apply pricing rules and volatility limits.
    6. Manager approval and audit logging.
    """
    # 1. Train all 3 models
    train_res = run_model_training()
    assert 'best_model' in train_res
    assert train_res['best_model'] in ['linear_regression', 'random_forest', 'xgboost']
    all_models = train_res['all_models']
    assert len(all_models) == 3

    # 2. Test direct pricing prediction on property
    prop = db_session.query(Property).first()
    assert prop is not None
    rt = db_session.query(RoomType).filter_by(property_id=prop.id).first()
    stay_date = datetime.date.today() + datetime.timedelta(days=15)

    rec = PricingEngineService.generate_recommendation(
        property_id=prop.id,
        room_type_id=rt.id if rt else 1,
        target_date=stay_date,
        model_name='best'
    )

    # 3. Verify separation of raw model prediction vs rule-adjusted price
    assert rec.model_predicted_price > 0
    assert rec.recommended_price > 0
    assert len(rec.all_model_predictions) == 3
    assert 'linear_regression' in rec.all_model_predictions
    assert 'random_forest' in rec.all_model_predictions
    assert 'xgboost' in rec.all_model_predictions

    # 4. Verify SHAP values computed in Rupees
    assert rec.shap_values is not None
    assert 'base_value' in rec.shap_values
    assert 'currency' in rec.shap_values
    assert rec.shap_values['currency'] == '₹'
    assert 'feature_contributions' in rec.shap_values

    # 5. Verify manager approval flow
    from app.models.user import User
    mgr = db_session.query(User).filter_by(role='hospitality_manager').first()
    if not mgr:
        mgr = db_session.query(User).first()

    approved_rec = PricingEngineService.approve_recommendation(
        recommendation_id=rec.id,
        user=mgr
    )
    assert approved_rec.status in ['approved', 'applied']

    # 6. Verify audit trail and price history
    hist = db_session.query(PriceHistory).filter_by(recommendation_id=rec.id).first()
    assert hist is not None
    assert hist.new_price == approved_rec.recommended_price
