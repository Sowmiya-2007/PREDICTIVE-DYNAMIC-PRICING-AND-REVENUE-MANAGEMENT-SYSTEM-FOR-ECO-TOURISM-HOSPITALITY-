import pytest
import datetime
from app.database import db_session
from app.models.user import User
from app.models.property import Property, RoomType
from app.models.booking import Booking
from app.utils.auth_helpers import generate_token

def test_quote_endpoint(client):
    prop = db_session.query(Property).first()
    assert prop is not None

    res = client.get(f'/api/properties/{prop.id}/quote')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'room_quotes' in data
    assert len(data['room_quotes']) > 0
    assert 'price_per_night' in data['room_quotes'][0]

def test_customer_booking_and_cancellation(client):
    # Retrieve customer
    customer = db_session.query(User).filter_by(role='customer').first()
    if not customer:
        customer = User(
            username='test_customer',
            email='test_cust@example.com',
            full_name='Test Eco Traveler',
            role='customer'
        )
        customer.set_password('password123')
        db_session.add(customer)
        db_session.commit()

    token = generate_token(customer)
    headers = {'Authorization': f'Bearer {token}'}

    # Fetch property & room type
    prop = db_session.query(Property).first()
    rt = prop.room_types[0]

    today = datetime.date.today()
    check_in = (today + datetime.timedelta(days=10)).isoformat()
    check_out = (today + datetime.timedelta(days=12)).isoformat()

    # Create Booking
    payload = {
        'property_id': prop.id,
        'room_type_id': rt.id,
        'check_in_date': check_in,
        'check_out_date': check_out,
        'num_guests': 2,
        'rooms_booked': 1,
        'special_requests': 'Quiet floor'
    }
    create_res = client.post('/api/bookings', json=payload, headers=headers)
    assert create_res.status_code == 201
    booking_data = create_res.get_json()['booking']
    booking_id = booking_data['id']
    assert booking_data['booking_status'] == 'confirmed'
    assert booking_data['booking_code'].startswith('ECO-')

    # Get My Bookings
    my_res = client.get('/api/bookings/my-bookings', headers=headers)
    assert my_res.status_code == 200
    my_data = my_res.get_json()
    assert any(b['id'] == booking_id for b in my_data['upcoming'])

    # Cancel Booking
    cancel_res = client.post(f'/api/bookings/{booking_id}/cancel', headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()['booking']['booking_status'] == 'cancelled'
