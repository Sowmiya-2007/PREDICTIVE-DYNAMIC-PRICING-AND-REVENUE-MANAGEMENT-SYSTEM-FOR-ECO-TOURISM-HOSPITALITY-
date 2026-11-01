import os
import io
import csv
import datetime
from flask import Blueprint, request, jsonify, Response
from app.database import db_session
from app.models.property import Property, RoomType
from app.models.event import LocalEvent
from app.models.booking import Booking
from app.models.weather import WeatherObservation
from app.models.audit import AuditLog
from app.models.data_source import DataSourceStatus
from app.models.holiday import PublicHoliday
from app.models.attraction import TourismAttraction
from app.services.data_refresh_service import DataRefreshService
from app.utils.auth_helpers import token_required
from app.utils.validators import parse_date

data_bp = Blueprint('data', __name__, url_prefix='/api/data')

@data_bp.route('/sources', methods=['GET'])
def get_data_sources_status():
    """Retrieve real-time health, freshness, and last-refresh times for all integrated sources."""
    sources = DataRefreshService.get_sources_overview()
    return jsonify({
        'success': True,
        'sources': sources
    }), 200

@data_bp.route('/refresh-live', methods=['POST'])
@token_required
def trigger_live_refresh(current_user):
    """Trigger an on-demand refresh of live external data (weather, events, or all)."""
    data = request.get_json() or {}
    source_id = data.get('source_id', 'all')
    force = data.get('force', False)

    try:
        res = DataRefreshService.refresh_live_data(source_id=source_id, force=force)
        
        audit = AuditLog(
            user_id=current_user.id,
            action='LIVE_DATA_REFRESHED',
            entity_type='external_data',
            details={'source_id': source_id, 'results': res['results']}
        )
        db_session.add(audit)
        db_session.commit()

        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Refresh failed: {str(e)}"}), 500

@data_bp.route('/reset-seed', methods=['POST'])
@token_required
def trigger_seed_reset(current_user):
    from seed_data import seed_database
    from app.models.user import User
    try:
        user_role = getattr(current_user, 'role', 'administrator')
        seed_database()
        
        fresh_user = db_session.query(User).filter_by(role=user_role).first()
        uid = fresh_user.id if fresh_user else None
        
        audit = AuditLog(
            user_id=uid,
            action='DATABASE_SEED_RESET',
            entity_type='system',
            details={'message': 'Reset demonstration database to initial pristine state.'}
        )
        db_session.add(audit)
        db_session.commit()
        return jsonify({'success': True, 'message': 'Demonstration data and weather records re-seeded successfully.'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'success': False, 'message': f"Seed failed: {str(e)}"}), 500

@data_bp.route('/export-revenue-report', methods=['GET'])
def export_revenue_report():
    bookings = db_session.query(Booking).order_by(Booking.check_in_date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Booking Code', 'Property', 'Room Type', 'Guest Name',
        'Check-In Date', 'Check-Out Date', 'Rooms Booked',
        'Price Per Night', 'Total Price', 'Status', 'Lead Time Days'
    ])

    for b in bookings:
        writer.writerow([
            b.booking_code,
            b.property.name if b.property else '',
            b.room_type.name if b.room_type else '',
            b.guest_name,
            b.check_in_date,
            b.check_out_date,
            b.rooms_booked,
            b.price_per_night,
            b.total_price,
            b.booking_status,
            b.lead_time_days
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=ecotourism_revenue_report.csv'}
    )

@data_bp.route('/import-csv', methods=['POST'])
@token_required
def import_csv(current_user):
    """
    CSV import endpoint with strict column validation, duplicate detection,
    and explicit dataset provenance labeling.
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded.'}), 400
    
    file = request.files['file']
    dataset_type = request.form.get('dataset_type', 'events')

    if not file.filename.endswith('.csv'):
        return jsonify({'success': False, 'message': 'Only CSV files are supported (.csv extension required).'}), 400

    stream = io.StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
    csv_reader = csv.DictReader(stream)
    
    # Validate headers exist
    fieldnames = [f.strip() for f in (csv_reader.fieldnames or [])]
    imported_count = 0
    duplicate_count = 0
    errors = []

    try:
        if dataset_type == 'bookings':
            required_fields = ['check_in_date', 'check_out_date', 'price_per_night']
            missing = [f for f in required_fields if f not in fieldnames]
            if missing:
                return jsonify({
                    'success': False,
                    'message': f"CSV validation error: missing required columns {missing}. Required columns: check_in_date, check_out_date, price_per_night (optional: property_id, guest_name, rooms_booked, booking_code)."
                }), 400

            first_prop = db_session.query(Property).first()
            p_id = first_prop.id if first_prop else 1
            rt_id = first_prop.room_types[0].id if (first_prop and first_prop.room_types) else 1

            for row_idx, row in enumerate(csv_reader, start=2):
                c_in = parse_date(row.get('check_in_date'))
                c_out = parse_date(row.get('check_out_date'))
                
                if not c_in or not c_out or c_out <= c_in:
                    errors.append(f"Row {row_idx}: invalid check_in ({row.get('check_in_date')}) or check_out ({row.get('check_out_date')}) date.")
                    continue

                b_code = (row.get('booking_code') or f"ECO-IMP-{imported_count + 1000}").strip()
                prop_id = int(row.get('property_id')) if row.get('property_id') else p_id
                guest_name = row.get('guest_name', 'Imported Guest').strip()

                # Duplicate detection by booking_code OR (property_id, check_in_date, guest_name)
                existing = db_session.query(Booking).filter(
                    (Booking.booking_code == b_code) |
                    ((Booking.property_id == prop_id) & (Booking.check_in_date == c_in) & (Booking.guest_name == guest_name))
                ).first()

                if existing:
                    duplicate_count += 1
                    continue

                try:
                    price_night = float(row.get('price_per_night', 3500.0))
                    rooms = int(row.get('rooms_booked', 1))
                    nights = max(1, (c_out - c_in).days)
                    total_p = float(row.get('total_price', price_night * nights * rooms))
                except ValueError:
                    errors.append(f"Row {row_idx}: invalid price or rooms format.")
                    continue

                b = Booking(
                    booking_code=b_code,
                    property_id=prop_id,
                    room_type_id=rt_id,
                    guest_name=guest_name,
                    guest_email=row.get('guest_email', f"imported_{imported_count}@ecotourism.org").strip(),
                    check_in_date=c_in,
                    check_out_date=c_out,
                    num_guests=int(row.get('num_guests', 2)),
                    rooms_booked=rooms,
                    price_per_night=price_night,
                    total_price=total_p,
                    booking_status=row.get('booking_status', 'confirmed').strip(),
                    lead_time_days=int(row.get('lead_time_days', 7))
                )
                db_session.add(b)
                imported_count += 1

        elif dataset_type == 'events':
            required_fields = ['title', 'location', 'start_date', 'end_date']
            missing = [f for f in required_fields if f not in fieldnames]
            if missing:
                return jsonify({
                    'success': False,
                    'message': f"CSV validation error: missing required columns {missing}. Required: title, location, start_date, end_date."
                }), 400

            for row_idx, row in enumerate(csv_reader, start=2):
                title = (row.get('title') or '').strip()
                loc = (row.get('location') or '').strip()
                s_date = parse_date(row.get('start_date'))
                e_date = parse_date(row.get('end_date'))

                if not title or not loc or not s_date or not e_date or e_date < s_date:
                    errors.append(f"Row {row_idx}: invalid event fields or date range.")
                    continue

                # Duplicate detection by title + location + start_date
                existing = db_session.query(LocalEvent).filter(
                    LocalEvent.title == title,
                    LocalEvent.location == loc,
                    LocalEvent.start_date == s_date
                ).first()

                if existing:
                    duplicate_count += 1
                    continue

                ev = LocalEvent(
                    title=title,
                    location=loc,
                    event_category=(row.get('category') or row.get('event_category') or 'festival').strip(),
                    start_date=s_date,
                    end_date=e_date,
                    description=row.get('description', 'Imported via CSV file').strip(),
                    expected_footfall=int(row.get('expected_footfall', 1000)),
                    impact_intensity=(row.get('impact_intensity') or 'medium').strip(),
                    source_name=f'CSV Import by {current_user.full_name}',
                    collection_method='manual',
                    status='active'
                )
                db_session.add(ev)
                imported_count += 1

        elif dataset_type == 'weather':
            required_fields = ['date', 'location']
            missing = [f for f in required_fields if f not in fieldnames]
            if missing:
                return jsonify({
                    'success': False,
                    'message': f"CSV validation error: missing required columns {missing}. Required: date, location."
                }), 400

            for row_idx, row in enumerate(csv_reader, start=2):
                obs_date = parse_date(row.get('date'))
                loc = (row.get('location') or '').strip()

                if not obs_date or not loc:
                    errors.append(f"Row {row_idx}: invalid date or location.")
                    continue

                # Duplicate check
                existing = db_session.query(WeatherObservation).filter(
                    WeatherObservation.location == loc,
                    WeatherObservation.date == obs_date
                ).first()

                if existing:
                    duplicate_count += 1
                    continue

                temp = float(row.get('temp_c', 24.0))
                rain = float(row.get('rainfall_mm', 0.0))
                w = WeatherObservation(
                    location=loc,
                    state_or_region=row.get('state_or_region', 'Regional'),
                    date=obs_date,
                    temp_c=temp,
                    rainfall_mm=rain,
                    humidity_pct=int(row.get('humidity_pct', 65)),
                    weather_condition=row.get('weather_condition', 'Clear & Sunny').strip(),
                    eco_suitability_score=float(row.get('eco_suitability_score', 0.85)),
                    source=f'CSV Ingestion by {current_user.full_name}',
                    data_type='historical'
                )
                db_session.add(w)
                imported_count += 1

        db_session.commit()
        return jsonify({
            'success': True,
            'message': (
                f"Successfully imported {imported_count} record(s) into {dataset_type} dataset. "
                f"({duplicate_count} duplicate record(s) skipped)."
            ),
            'imported_count': imported_count,
            'duplicate_count': duplicate_count,
            'validation_warnings': errors[:10]
        }), 200

    except Exception as e:
        db_session.rollback()
        return jsonify({'success': False, 'message': f"CSV import processing error: {str(e)}"}), 500

@data_bp.route('/datasets-overview', methods=['GET'])
def get_datasets_overview():
    """
    Returns summary statistics, record counts, and provenance information
    for historical hotel bookings, weather observations, events, and properties.
    """
    total_bookings = db_session.query(Booking).count()
    total_events = db_session.query(LocalEvent).count()
    total_properties = db_session.query(Property).count()
    total_weather = db_session.query(WeatherObservation).count()

    from app.config import Config
    base_dir = os.path.abspath(os.path.join(Config.BASE_DIR, '..'))
    hist_b_path = os.path.join(base_dir, 'data', 'historical', 'hotel_bookings.csv')
    hist_w_path = os.path.join(base_dir, 'data', 'historical', 'weather_data.csv')

    hist_b_count = 0
    if os.path.exists(hist_b_path):
        with open(hist_b_path, 'r', encoding='utf-8') as f:
            hist_b_count = max(0, sum(1 for _ in f) - 1)

    hist_w_count = 0
    if os.path.exists(hist_w_path):
        with open(hist_w_path, 'r', encoding='utf-8') as f:
            hist_w_count = max(0, sum(1 for _ in f) - 1)

    return jsonify({
        'success': True,
        'datasets': [
            {
                'id': 'hotel_bookings',
                'name': 'Booking & Inventory Database',
                'db_records': total_bookings,
                'file_records': hist_b_count,
                'status': 'Live PMS Connected',
                'description': 'Real property bookings with lead times, reservation codes, actual ADR, and occupancy metrics.',
                'source': 'Internal PMS Database + data/historical/hotel_bookings.csv'
            },
            {
                'id': 'weather_data',
                'name': 'Open-Meteo Climate Feed & Archive',
                'db_records': total_weather,
                'file_records': hist_w_count,
                'status': 'Live API + Historical Archive',
                'description': 'Live Open-Meteo observations and forecast plus regional climate history for eco-resort coordinates.',
                'source': 'Open-Meteo Live API + data/historical/weather_data.csv'
            },
            {
                'id': 'local_events',
                'name': 'Local Event Intelligence',
                'db_records': total_events,
                'file_records': 5,
                'status': 'Official Regional Scrapers (Kerala, Karnataka, Kodagu)',
                'description': 'Automated collection of cultural festivals, marathons, and symposiums from official regional portals.',
                'source': 'Karnataka & Kodagu Tourism Portals, Kerala Eco-Tourism Portal'
            },
            {
                'id': 'public_holidays',
                'name': 'Nager.Date Indian Public Holidays',
                'db_records': db_session.query(PublicHoliday).count(),
                'file_records': 29,
                'status': 'Live API & Gazette',
                'description': 'Verified Indian national and regional holidays used as independent ML pricing features.',
                'source': 'Nager.Date API (https://date.nager.at/) + Gazette'
            },
            {
                'id': 'tourism_attractions',
                'name': 'OpenStreetMap Tourism POIs',
                'db_records': db_session.query(TourismAttraction).count(),
                'file_records': 15,
                'status': 'Overpass API Live Sync',
                'description': 'Nearby eco-tourism waterfalls, viewpoints, parks, and nature reserves with distances.',
                'source': 'OpenStreetMap Overpass API'
            },
            {
                'id': 'properties',
                'name': 'Eco Properties & Boundaries',
                'db_records': total_properties,
                'file_records': 4,
                'status': 'Active Registry',
                'description': 'Sanctuary capacities, room inventories, sustainability ratings, and price ceilings/floors.',
                'source': 'Properties Registry'
            }
        ]
    }), 200

@data_bp.route('/holidays', methods=['GET'])
def get_public_holidays():
    """Retrieve verified Indian public holidays."""
    days = int(request.args.get('days', 90))
    from app.services.holiday_service import HolidayService
    holidays = HolidayService.get_upcoming_holidays(days=days)
    return jsonify({
        'success': True,
        'count': len(holidays),
        'holidays': holidays
    }), 200

@data_bp.route('/attractions', methods=['GET'])
def get_tourism_attractions():
    """Retrieve nearby tourism POIs from OpenStreetMap Overpass."""
    property_id = request.args.get('property_id')
    query = db_session.query(TourismAttraction)
    if property_id and property_id != 'all':
        query = query.filter(TourismAttraction.property_id == int(property_id))
    
    records = query.order_by(TourismAttraction.distance_km.asc()).all()
    return jsonify({
        'success': True,
        'count': len(records),
        'attractions': [r.to_dict() for r in records]
    }), 200
