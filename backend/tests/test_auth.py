import pytest
from app import create_app
from app.database import db_session, Base, engine
from app.models.user import User

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'

def test_login_success(client):
    response = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'admin123'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'token' in data
    assert data['user']['role'] == 'administrator'

def test_login_invalid_password(client):
    response = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False
