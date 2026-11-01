import pytest
import io
from app.database import db_session
from app.models.user import User
from app.utils.auth_helpers import generate_token

@pytest.fixture
def manager_token():
    manager = db_session.query(User).filter_by(role='manager').first()
    if not manager:
        manager = User(
            username='test_mgr_ext',
            email='mgr_ext@example.com',
            role='manager',
            full_name='Test Manager Ext'
        )
        manager.set_password('password123')
        db_session.add(manager)
        db_session.commit()
    return generate_token(manager)

def test_data_sources_endpoint(client, manager_token):
    response = client.get('/api/data/sources', headers={'Authorization': f'Bearer {manager_token}'})
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "sources" in data
    assert len(data["sources"]) == 8
    
    source_ids = [s["source_id"] for s in data["sources"]]
    assert "open_meteo_weather" in source_ids
    assert "kerala_tourism" in source_ids
    assert "historical_bookings_db" in source_ids
    assert "karnataka_tourism_scraper" in source_ids
    assert "kodagu_district_tourism" in source_ids
    assert "kodagu_culture_heritage" in source_ids
    assert "nager_date_holidays" in source_ids
    assert "osm_overpass_attractions" in source_ids
    assert "ticketmaster_api" not in source_ids
    assert "predicthq_events_api" not in source_ids
    
    for s in data["sources"]:
        assert "source_name" in s
        assert "fetch_status" in s
        assert "source_url" in s

def test_manual_live_refresh_endpoint(client, manager_token):
    response = client.post(
        '/api/data/refresh-live',
        headers={'Authorization': f'Bearer {manager_token}'},
        json={'source_id': 'open_meteo_weather'}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "results" in data
    assert "weather" in data["results"]
    assert data["results"]["weather"]["status"] in ["success", "error"]

def test_csv_import_validation_and_duplicate_detection(client, manager_token):
    # 1. Missing required columns
    invalid_csv = "date,price\n2025-01-01,5000\n"
    data = {
        'dataset_type': 'bookings',
        'file': (io.BytesIO(invalid_csv.encode('utf-8')), 'test_invalid.csv')
    }
    resp = client.post(
        '/api/data/import-csv',
        headers={'Authorization': f'Bearer {manager_token}'},
        content_type='multipart/form-data',
        data=data
    )
    assert resp.status_code == 400
    res_json = resp.get_json()
    assert res_json["success"] is False
    assert "missing required columns" in res_json["message"]

    # 2. Valid columns and duplicate detection
    import time
    t_id = int(time.time() * 1000)
    ref1 = f"TREF-{t_id}-A"
    ref2 = f"TREF-{t_id}-B"
    g1 = f"Guest_{t_id}_A"
    g2 = f"Guest_{t_id}_B"
    valid_csv = (
        "booking_code,check_in_date,check_out_date,price_per_night,total_price,rooms_booked,guest_name\n"
        f"{ref1},2025-06-01,2025-06-03,4500.0,9000.0,1,{g1}\n"
        f"{ref2},2025-06-05,2025-06-07,4500.0,9000.0,1,{g2}\n"
    )
    data = {
        'dataset_type': 'bookings',
        'file': (io.BytesIO(valid_csv.encode('utf-8')), 'test_valid.csv')
    }
    resp = client.post(
        '/api/data/import-csv',
        headers={'Authorization': f'Bearer {manager_token}'},
        content_type='multipart/form-data',
        data=data
    )
    assert resp.status_code == 200
    res_json = resp.get_json()
    assert res_json["success"] is True
    assert res_json["imported_count"] == 2
    assert res_json["duplicate_count"] == 0

    # Second upload should detect both rows as duplicates
    data2 = {
        'dataset_type': 'bookings',
        'file': (io.BytesIO(valid_csv.encode('utf-8')), 'test_valid.csv')
    }
    resp2 = client.post(
        '/api/data/import-csv',
        headers={'Authorization': f'Bearer {manager_token}'},
        content_type='multipart/form-data',
        data=data2
    )
    assert resp2.status_code == 200
    res_json2 = resp2.get_json()
    assert res_json2["duplicate_count"] == 2
    assert res_json2["imported_count"] == 0
