import datetime
import pytest
from app import create_app
from app.database import db_session
from app.models.property import Property, RoomType
from app.services.pricing_service import PricingEngineService

@pytest.fixture
def app_instance():
    app = create_app()
    app.config['TESTING'] = True
    return app

def test_pricing_recommendation_bounds(app_instance):
    with app_instance.app_context():
        prop = db_session.query(Property).first()
        rt = prop.room_types[0]
        target_date = datetime.date.today() + datetime.timedelta(days=7)

        rec = PricingEngineService.generate_recommendation(
            property_id=prop.id,
            room_type_id=rt.id,
            target_date=target_date
        )

        assert rec is not None
        assert rec.recommended_price >= prop.min_price
        assert rec.recommended_price <= prop.max_price
        assert rec.status == 'pending'
        assert rec.predicted_demand > 0
