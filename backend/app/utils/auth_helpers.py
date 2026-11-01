import datetime
from functools import wraps
import jwt
from flask import request, jsonify
from app.config import Config
from app.database import db_session
from app.models.user import User

def generate_token(user: User) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'sub': str(user.id),
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'exp': now + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': now
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')

def decode_token(token: str):
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Authentication token is missing or malformed'}), 401

        token = auth_header.split(' ')[1]
        decoded = decode_token(token)
        if not decoded:
            return jsonify({'success': False, 'message': 'Token is invalid or has expired'}), 401

        user_id = int(decoded['sub'])
        user = db_session.query(User).filter_by(id=user_id, is_active=True).first()
        if not user:
            return jsonify({'success': False, 'message': 'User no longer exists or is inactive'}), 401

        return f(current_user=user, *args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user: User, *args, **kwargs):
            if current_user.role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f'Access forbidden. Role {current_user.role} is not authorized for this action.'
                }), 403
            return f(current_user=current_user, *args, **kwargs)
        return decorated
    return decorator
