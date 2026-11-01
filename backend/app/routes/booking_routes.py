from flask import Blueprint, request, jsonify
import datetime
import random
from app.database import db_session
from app.models.booking import Booking
from app.models.property import Property, RoomType, RoomInventory
from app.models.audit import AuditLog
from app.utils.auth_helpers import token_required, role_required
from app.utils.validators import parse_date

booking_bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')

@booking_bp.route('/my-bookings', methods=['GET'])
@token_required
def get_my_bookings(current_user):
    """
    Returns bookings belonging to the currently authenticated user.
    Customers cannot access other users' bookings.
    """
    bookings = db_session.query(Booking).filter(
        (Booking.user_id == current_user.id) | (Booking.guest_email == current_user.email)
    ).order_by(Booking.check_in_date.desc()).all()

    today = datetime.date.today()
    upcoming = []
    past = []

    for b in bookings:
        b_dict = b.to_dict()
        b_dict['is_cancellable'] = (b.booking_status == 'confirmed' and b.check_in_date > today)
        b_dict['days_until_checkin'] = (b.check_in_date - today).days if b.check_in_date >= today else None
        
        if b.check_in_date >= today and b.booking_status != 'cancelled':
            upcoming.append(b_dict)
        else:
            past.append(b_dict)

    return jsonify({
        'success': True,
        'upcoming': upcoming,
        'past': past,
        'all': [b.to_dict() for b in bookings]
    }), 200

@booking_bp.route('', methods=['POST'])
@token_required
def create_booking(current_user):
    """
    Create a new eco-tourism reservation request for the logged-in customer.
    Validates capacity, room inventory, double-booking, and applies dynamic rates.
    """
    data = request.get_json() or {}
    property_id = data.get('property_id')
    room_type_id = data.get('room_type_id')
    check_in_str = data.get('check_in_date')
    check_out_str = data.get('check_out_date')
    num_guests = int(data.get('num_guests', 2))
    rooms_booked = int(data.get('rooms_booked', 1))
    special_requests = data.get('special_requests', '').strip()

    if not property_id or not room_type_id or not check_in_str or not check_out_str:
        return jsonify({'success': False, 'message': 'Missing required booking fields.'}), 400

    prop = db_session.query(Property).filter_by(id=property_id, is_active=True).first()
    if not prop:
        return jsonify({'success': False, 'message': 'Selected eco-property is not found or inactive.'}), 404

    rt = db_session.query(RoomType).filter_by(id=room_type_id, property_id=property_id).first()
    if not rt:
        return jsonify({'success': False, 'message': 'Selected room type is not found for this property.'}), 404

    check_in = parse_date(check_in_str)
    check_out = parse_date(check_out_str)
    today = datetime.date.today()

    if not check_in or not check_out:
        return jsonify({'success': False, 'message': 'Invalid check-in or check-out date format.'}), 400

    if check_in < today:
        return jsonify({'success': False, 'message': 'Check-in date cannot be in the past.'}), 400

    if check_out <= check_in:
        return jsonify({'success': False, 'message': 'Check-out date must be after check-in date.'}), 400

    nights_count = (check_out - check_in).days
    if nights_count > 30:
        return jsonify({'success': False, 'message': 'Maximum stay duration is 30 consecutive nights.'}), 400

    # Capacity validation
    if num_guests > (rt.capacity * rooms_booked):
        return jsonify({
            'success': False,
            'message': f"Capacity exceeded. {rooms_booked} room(s) can accommodate at most {rt.capacity * rooms_booked} guests."
        }), 400

    # Check availability and calculate live rates for each night
    total_booking_price = 0.0
    inventory_to_update = []

    for day_idx in range(nights_count):
        night_date = check_in + datetime.timedelta(days=day_idx)

        inv = db_session.query(RoomInventory).filter_by(
            property_id=prop.id,
            room_type_id=rt.id,
            inventory_date=night_date
        ).first()

        if inv:
            if inv.is_blocked:
                return jsonify({
                    'success': False,
                    'message': f"Room type is blocked on {night_date.strftime('%b %d, %Y')} for maintenance or sanctuary conservation."
                }), 400

            if inv.available_rooms < rooms_booked:
                return jsonify({
                    'success': False,
                    'message': f"Insufficient rooms on {night_date.strftime('%b %d, %Y')}. Only {inv.available_rooms} room(s) remaining."
                }), 400

            nightly_rate = inv.current_price
            inventory_to_update.append((inv, rooms_booked))
        else:
            # Check existing overlapping confirmed bookings
            active_booked = db_session.query(Booking).filter(
                Booking.room_type_id == rt.id,
                Booking.booking_status == 'confirmed',
                Booking.check_in_date <= night_date,
                Booking.check_out_date > night_date
            ).all()
            already_booked = sum(b.rooms_booked for b in active_booked)
            available_rooms = max(0, rt.total_rooms - already_booked)

            if available_rooms < rooms_booked:
                return jsonify({
                    'success': False,
                    'message': f"Insufficient rooms on {night_date.strftime('%b %d, %Y')}. Only {available_rooms} room(s) remaining."
                }), 400

            nightly_rate = rt.base_price
            # Create inventory record
            new_inv = RoomInventory(
                property_id=prop.id,
                room_type_id=rt.id,
                inventory_date=night_date,
                total_rooms=rt.total_rooms,
                available_rooms=rt.total_rooms - rooms_booked,
                booked_rooms=rooms_booked,
                current_price=nightly_rate
            )
            db_session.add(new_inv)

        total_booking_price += (nightly_rate * rooms_booked)

    # Apply updates to existing inventories
    for inv_record, count in inventory_to_update:
        inv_record.booked_rooms += count
        inv_record.available_rooms = max(0, inv_record.total_rooms - inv_record.booked_rooms)

    avg_price_per_night = round(total_booking_price / (nights_count * rooms_booked), 2)
    lead_time = max(0, (check_in - today).days)

    # Unique booking code
    timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d")
    rand_suffix = random.randint(1000, 9999)
    booking_code = f"ECO-{timestamp_str}-{rand_suffix}"

    new_booking = Booking(
        booking_code=booking_code,
        property_id=prop.id,
        room_type_id=rt.id,
        user_id=current_user.id,
        guest_name=current_user.full_name,
        guest_email=current_user.email,
        check_in_date=check_in,
        check_out_date=check_out,
        num_guests=num_guests,
        rooms_booked=rooms_booked,
        price_per_night=avg_price_per_night,
        total_price=round(total_booking_price, 2),
        special_requests=special_requests or None,
        booking_status='confirmed',
        lead_time_days=lead_time,
        booking_date=datetime.datetime.utcnow()
    )

    db_session.add(new_booking)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action='BOOKING_CREATED',
        entity_type='booking',
        entity_id=None,
        details={
            'booking_code': booking_code,
            'property': prop.name,
            'room_type': rt.name,
            'total_price': round(total_booking_price, 2)
        }
    )
    db_session.add(audit)
    db_session.commit()

    return jsonify({
        'success': True,
        'message': 'Eco-tourism reservation confirmed successfully!',
        'booking': new_booking.to_dict()
    }), 201

@booking_bp.route('/<int:booking_id>', methods=['GET'])
@token_required
def get_booking_details(current_user, booking_id: int):
    """
    Get detailed information about a specific booking.
    Customers can only view their own bookings; managers can view any booking.
    """
    booking = db_session.query(Booking).filter_by(id=booking_id).first()
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    # Authorization check
    is_owner = (booking.user_id == current_user.id or booking.guest_email == current_user.email)
    is_manager = current_user.role in ['hospitality_manager', 'administrator']
    if not is_owner and not is_manager:
        return jsonify({'success': False, 'message': 'Unauthorized to view this booking.'}), 403

    return jsonify({
        'success': True,
        'booking': booking.to_dict()
    }), 200

@booking_bp.route('/<int:booking_id>/cancel', methods=['POST'])
@token_required
def cancel_booking(current_user, booking_id: int):
    """
    Cancel a confirmed booking.
    Enforces cancellation policy: can only cancel if check-in date is in the future.
    Restores room inventory.
    """
    booking = db_session.query(Booking).filter_by(id=booking_id).first()
    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found.'}), 404

    is_owner = (booking.user_id == current_user.id or booking.guest_email == current_user.email)
    is_manager = current_user.role in ['hospitality_manager', 'administrator']
    if not is_owner and not is_manager:
        return jsonify({'success': False, 'message': 'Unauthorized to cancel this booking.'}), 403

    if booking.booking_status == 'cancelled':
        return jsonify({'success': False, 'message': 'Booking is already cancelled.'}), 400

    today = datetime.date.today()
    if booking.check_in_date <= today:
        return jsonify({
            'success': False,
            'message': 'Cannot cancel a reservation on or after check-in date according to policy.'
        }), 400

    booking.booking_status = 'cancelled'

    # Restore room inventory
    nights_count = (booking.check_out_date - booking.check_in_date).days
    for day_idx in range(nights_count):
        night_date = booking.check_in_date + datetime.timedelta(days=day_idx)
        inv = db_session.query(RoomInventory).filter_by(
            property_id=booking.property_id,
            room_type_id=booking.room_type_id,
            inventory_date=night_date
        ).first()

        if inv:
            inv.booked_rooms = max(0, inv.booked_rooms - booking.rooms_booked)
            inv.available_rooms = min(inv.total_rooms, inv.available_rooms + booking.rooms_booked)

    audit = AuditLog(
        user_id=current_user.id,
        action='BOOKING_CANCELLED',
        entity_type='booking',
        entity_id=booking.id,
        details={'booking_code': booking.booking_code}
    )
    db_session.add(audit)
    db_session.commit()

    return jsonify({
        'success': True,
        'message': f"Booking {booking.booking_code} cancelled successfully. Room inventory restored.",
        'booking': booking.to_dict()
    }), 200

@booking_bp.route('', methods=['GET'])
@token_required
@role_required('hospitality_manager', 'administrator')
def list_all_bookings(current_user):
    """
    Manager endpoint: list all bookings across properties with filters.
    """
    property_id = request.args.get('property_id')
    status = request.args.get('status')
    limit = int(request.args.get('limit', 100))

    query = db_session.query(Booking)
    if property_id and property_id != 'all':
        query = query.filter(Booking.property_id == int(property_id))
    if status and status != 'all':
        query = query.filter(Booking.booking_status == status)

    bookings = query.order_by(Booking.check_in_date.desc()).limit(limit).all()

    return jsonify({
        'success': True,
        'count': len(bookings),
        'bookings': [b.to_dict() for b in bookings]
    }), 200
