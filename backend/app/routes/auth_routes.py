from flask import Blueprint, request, jsonify
from app.database import db_session
from app.models.user import User
from app.models.audit import AuditLog
from app.utils.auth_helpers import generate_token, token_required
from app.utils.validators import validate_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'customer').strip()

    if not username or len(username) < 3:
        return jsonify({'success': False, 'message': 'Username must be at least 3 characters.'}), 400
    if not validate_email(email):
        return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 400
    if not password or len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400
    if not full_name:
        return jsonify({'success': False, 'message': 'Full name is required.'}), 400
    if role not in ['customer', 'hospitality_manager', 'administrator']:
        role = 'customer'

    # Check existing user
    if db_session.query(User).filter_by(username=username).first():
        return jsonify({'success': False, 'message': f"Username '{username}' is already taken."}), 409
    if db_session.query(User).filter_by(email=email).first():
        return jsonify({'success': False, 'message': f"Email '{email}' is already registered."}), 409

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        phone=data.get('phone', '').strip() or None,
        preferred_destination=data.get('preferred_destination', '').strip() or None,
        eco_preference=data.get('eco_preference', '').strip() or None,
        is_active=True
    )
    user.set_password(password)
    db_session.add(user)
    db_session.flush()

    # Log audit
    audit = AuditLog(
        user_id=user.id,
        action='USER_REGISTERED',
        entity_type='user',
        entity_id=user.id,
        details={'username': username, 'role': role}
    )
    db_session.add(audit)
    db_session.commit()

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': 'Account created successfully.',
        'token': token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

    user = db_session.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid credentials. Please verify your login details.'}), 401

    if not user.is_active:
        return jsonify({'success': False, 'message': 'Account is deactivated. Please contact the administrator.'}), 403

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': 'Login successful.',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user: User):
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user: User):
    data = request.get_json() or {}
    
    if 'full_name' in data and data['full_name'].strip():
        current_user.full_name = data['full_name'].strip()
    if 'phone' in data:
        current_user.phone = data['phone'].strip()
    if 'preferred_destination' in data:
        current_user.preferred_destination = data['preferred_destination'].strip()
    if 'eco_preference' in data:
        current_user.eco_preference = data['eco_preference'].strip()
    
    # Optional password change
    if data.get('new_password'):
        if len(data['new_password']) < 6:
            return jsonify({'success': False, 'message': 'New password must be at least 6 characters.'}), 400
        current_user.set_password(data['new_password'])

    audit = AuditLog(
        user_id=current_user.id,
        action='PROFILE_UPDATED',
        entity_type='user',
        entity_id=current_user.id,
        details={'full_name': current_user.full_name}
    )
    db_session.add(audit)
    db_session.commit()

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully.',
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully.'}), 200
