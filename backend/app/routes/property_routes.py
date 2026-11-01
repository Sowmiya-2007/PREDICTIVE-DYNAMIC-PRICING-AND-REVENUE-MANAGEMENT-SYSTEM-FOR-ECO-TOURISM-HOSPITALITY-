from flask import Blueprint, request, jsonify
import datetime
from app.database import db_session
from app.models.property import Property, RoomType, RoomInventory
from app.models.booking import Booking
from app.models.audit import AuditLog
from app.utils.auth_helpers import token_required, role_required
from app.utils.validators import validate_price_bounds, parse_date

property_bp = Blueprint('properties', __name__, url_prefix='/api/properties')

@property_bp.route('', methods=['GET'])
def list_properties():
    search = request.args.get('search', '').strip()
    location = request.args.get('location', '').strip()
    category = request.args.get('category', '').strip()

    query = db_session.query(Property).filter(Property.is_active == True)

    if search:
        query = query.filter(
            (Property.name.ilike(f"%{search}%")) |
            (Property.location.ilike(f"%{search}%"))
        )
    if location and location != 'all':
        query = query.filter(Property.location.ilike(f"%{location}%"))
    if category and category != 'all':
        query = query.filter(Property.eco_category == category)

    properties = query.order_by(Property.name.asc()).all()
    return jsonify({
        'success': True,
        'count': len(properties),
        'properties': [p.to_dict() for p in properties]
    }), 200

@property_bp.route('/<int:prop_id>', methods=['GET'])
def get_property(prop_id: int):
    prop = db_session.query(Property).filter_by(id=prop_id, is_active=True).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Property not found'}), 404

    # Include room types and recent bookings
    room_types = [rt.to_dict() for rt in prop.room_types]
    recent_bookings = db_session.query(Booking).filter_by(property_id=prop_id).order_by(Booking.check_in_date.desc()).limit(10).all()

    data = prop.to_dict()
    data['room_types'] = room_types
    data['recent_bookings'] = [b.to_dict() for b in recent_bookings]
    return jsonify({'success': True, 'property': data}), 200

@property_bp.route('', methods=['POST'])
@token_required
def create_property(current_user):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    location = data.get('location', '').strip()
    state_or_region = data.get('state_or_region', '').strip()
    description = data.get('description', '').strip()
    eco_category = data.get('eco_category', 'Forest Eco-Lodge').strip()
    
    try:
        base_price = float(data.get('base_price', 3500.0))
        min_price = float(data.get('min_price', 2000.0))
        max_price = float(data.get('max_price', 8500.0))
        total_capacity = int(data.get('total_capacity', 20))
        sustainability_rating = float(data.get('sustainability_rating', 4.8))
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid numerical inputs for price or capacity.'}), 400

    if not name or not location:
        return jsonify({'success': False, 'message': 'Property name and location are required.'}), 400

    valid_price, err = validate_price_bounds(base_price, min_price, max_price)
    if not valid_price:
        return jsonify({'success': False, 'message': err}), 400

    prop = Property(
        name=name,
        location=location,
        state_or_region=state_or_region,
        description=description,
        eco_category=eco_category,
        base_price=base_price,
        min_price=min_price,
        max_price=max_price,
        total_capacity=total_capacity,
        sustainability_rating=sustainability_rating,
        is_active=True
    )
    db_session.add(prop)
    db_session.flush()

    # Create default room type
    default_rt = RoomType(
        property_id=prop.id,
        name='Standard Eco Suite',
        description='Standard sustainable room with rainforest view',
        capacity=2,
        base_price=base_price,
        min_price=min_price,
        max_price=max_price,
        total_rooms=total_capacity // 2
    )
    db_session.add(default_rt)

    audit = AuditLog(
        user_id=current_user.id,
        action='PROPERTY_CREATED',
        entity_type='property',
        entity_id=prop.id,
        details={'name': name, 'location': location}
    )
    db_session.add(audit)
    db_session.commit()

    return jsonify({'success': True, 'message': 'Property registered successfully.', 'property': prop.to_dict()}), 201

@property_bp.route('/<int:prop_id>', methods=['PUT'])
@token_required
def update_property(current_user, prop_id: int):
    prop = db_session.query(Property).filter_by(id=prop_id, is_active=True).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Property not found'}), 404

    data = request.get_json() or {}
    if 'name' in data: prop.name = data['name'].strip()
    if 'location' in data: prop.location = data['location'].strip()
    if 'state_or_region' in data: prop.state_or_region = data['state_or_region'].strip()
    if 'description' in data: prop.description = data['description'].strip()
    if 'eco_category' in data: prop.eco_category = data['eco_category'].strip()
    if 'sustainability_rating' in data: prop.sustainability_rating = float(data['sustainability_rating'])

    if 'base_price' in data or 'min_price' in data or 'max_price' in data:
        base = float(data.get('base_price', prop.base_price))
        min_p = float(data.get('min_price', prop.min_price))
        max_p = float(data.get('max_price', prop.max_price))
        valid, err = validate_price_bounds(base, min_p, max_p)
        if not valid:
            return jsonify({'success': False, 'message': err}), 400
        prop.base_price = base
        prop.min_price = min_p
        prop.max_price = max_p

    audit = AuditLog(
        user_id=current_user.id,
        action='PROPERTY_UPDATED',
        entity_type='property',
        entity_id=prop.id,
        details={'name': prop.name}
    )
    db_session.add(audit)
    db_session.commit()

    return jsonify({'success': True, 'message': 'Property updated successfully.', 'property': prop.to_dict()}), 200

@property_bp.route('/<int:prop_id>', methods=['DELETE'])
@token_required
@role_required('administrator', 'hospitality_manager')
def delete_property(current_user, prop_id: int):
    prop = db_session.query(Property).filter_by(id=prop_id).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Property not found'}), 404

    prop.is_active = False # Soft delete
    audit = AuditLog(
        user_id=current_user.id,
        action='PROPERTY_DEACTIVATED',
        entity_type='property',
        entity_id=prop.id,
        details={'name': prop.name}
    )
    db_session.add(audit)
    db_session.commit()
    return jsonify({'success': True, 'message': 'Property archived successfully.'}), 200

@property_bp.route('/<int:prop_id>/room-types', methods=['POST'])
@token_required
def add_room_type(current_user, prop_id: int):
    prop = db_session.query(Property).filter_by(id=prop_id, is_active=True).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Property not found'}), 404

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Room type name is required.'}), 400

    base_p = float(data.get('base_price', prop.base_price))
    min_p = float(data.get('min_price', prop.min_price))
    max_p = float(data.get('max_price', prop.max_price))
    total_rooms = int(data.get('total_rooms', 4))
    capacity = int(data.get('capacity', 2))
    amenities = data.get('amenities', 'Solar Hot Water, Forest Deck')

    rt = RoomType(
        property_id=prop_id,
        name=name,
        base_price=base_p,
        min_price=min_p,
        max_price=max_p,
        total_rooms=total_rooms,
        capacity=capacity,
        amenities=amenities
    )
    db_session.add(rt)
    db_session.commit()
    return jsonify({'success': True, 'room_type': rt.to_dict()}), 201

@property_bp.route('/<int:prop_id>/inventory', methods=['GET'])
def get_property_inventory(prop_id: int):
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    today = datetime.date.today()
    start_date = parse_date(start_date_str) or today
    end_date = parse_date(end_date_str) or (today + datetime.timedelta(days=30))

    records = db_session.query(RoomInventory).filter(
        RoomInventory.property_id == prop_id,
        RoomInventory.inventory_date >= start_date,
        RoomInventory.inventory_date <= end_date
    ).order_by(RoomInventory.inventory_date.asc()).all()

    return jsonify({
        'success': True,
        'inventory': [r.to_dict() for r in records]
    }), 200

@property_bp.route('/<int:prop_id>/quote', methods=['GET'])
def get_property_stay_quote(prop_id: int):
    """
    Customer-facing stay pricing and availability quote endpoint.
    Retrieves currently approved dynamic rates from RoomInventory,
    evaluates availability, and itemizes night-by-night rates without exposing
    internal ML models or manager-only confidential revenue matrices.
    """
    prop = db_session.query(Property).filter_by(id=prop_id, is_active=True).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Property not found.'}), 404

    check_in_str = request.args.get('check_in')
    check_out_str = request.args.get('check_out')
    room_type_id_param = request.args.get('room_type_id')
    rooms_requested = max(1, int(request.args.get('rooms', 1)))

    today = datetime.date.today()
    check_in = parse_date(check_in_str) if check_in_str else today
    check_out = parse_date(check_out_str) if check_out_str else (check_in + datetime.timedelta(days=2))

    if check_out <= check_in:
        check_out = check_in + datetime.timedelta(days=1)

    nights_count = (check_out - check_in).days
    room_types = prop.room_types
    if room_type_id_param:
        try:
            target_rt_id = int(room_type_id_param)
            room_types = [rt for rt in room_types if rt.id == target_rt_id]
        except ValueError:
            pass

    from app.models.event import LocalEvent
    room_quotes = []

    for rt in room_types:
        nightly_breakdown = []
        is_room_available = True
        total_room_cost = 0.0

        for day_idx in range(nights_count):
            night_date = check_in + datetime.timedelta(days=day_idx)

            # Check inventory for approved dynamic rate
            inv = db_session.query(RoomInventory).filter_by(
                property_id=prop.id,
                room_type_id=rt.id,
                inventory_date=night_date
            ).first()

            if inv:
                night_rate = inv.current_price
                avail_count = 0 if inv.is_blocked else inv.available_rooms
            else:
                night_rate = rt.base_price
                # Calculate active overlapping bookings
                active_booked = db_session.query(Booking).filter(
                    Booking.room_type_id == rt.id,
                    Booking.booking_status == 'confirmed',
                    Booking.check_in_date <= night_date,
                    Booking.check_out_date > night_date
                ).all()
                total_booked_count = sum(b.rooms_booked for b in active_booked)
                avail_count = max(0, rt.total_rooms - total_booked_count)

            can_book_night = (avail_count >= rooms_requested)
            if not can_book_night:
                is_room_available = False

            # Check for local festival notice
            event = db_session.query(LocalEvent).filter(
                LocalEvent.start_date <= night_date,
                LocalEvent.end_date >= night_date
            ).first()
            event_tag = event.title if event else None

            nightly_breakdown.append({
                'date': night_date.isoformat(),
                'night_rate': round(night_rate, 2),
                'available_rooms': avail_count,
                'can_book': can_book_night,
                'event_notice': event_tag
            })
            total_room_cost += (night_rate * rooms_requested)

        avg_nightly_price = round(total_room_cost / (nights_count * rooms_requested), 2) if nights_count > 0 else rt.base_price

        room_quotes.append({
            'room_type_id': rt.id,
            'name': rt.name,
            'description': rt.description,
            'capacity': rt.capacity,
            'amenities': rt.amenities,
            'total_rooms': rt.total_rooms,
            'is_available': is_room_available,
            'price_per_night': avg_nightly_price,
            'total_stay_cost': round(total_room_cost, 2),
            'nights_count': nights_count,
            'rooms_requested': rooms_requested,
            'nightly_breakdown': nightly_breakdown,
            'pricing_note': 'Approved conservation rates adapt dynamically to local seasons and festivals.'
        })

    return jsonify({
        'success': True,
        'property_id': prop.id,
        'property_name': prop.name,
        'location': prop.location,
        'check_in': check_in.isoformat(),
        'check_out': check_out.isoformat(),
        'nights': nights_count,
        'rooms_requested': rooms_requested,
        'room_quotes': room_quotes
    }), 200
