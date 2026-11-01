from flask import Blueprint, request, jsonify
import datetime
from app.database import db_session
from app.models.event import LocalEvent, ScrapingRun
from app.models.audit import AuditLog
from app.services.scraping_service import EventScraperService, CONFIGURED_SOURCES
from app.utils.auth_helpers import token_required
from app.utils.validators import parse_date

event_bp = Blueprint('events', __name__, url_prefix='/api/events')

@event_bp.route('', methods=['GET'])
def list_events():
    location = request.args.get('location', '').strip()
    category = request.args.get('category', '').strip()
    source = request.args.get('source', '').strip()
    start_date_str = request.args.get('start_date', '').strip()
    upcoming_only = request.args.get('upcoming_only', 'false').lower() == 'true'

    query = db_session.query(LocalEvent)

    if location and location != 'all':
        query = query.filter(LocalEvent.location.ilike(f"%{location}%"))
    if category and category != 'all':
        query = query.filter(LocalEvent.event_category == category)
    if source and source != 'all':
        query = query.filter(LocalEvent.collection_method == source)
    if start_date_str:
        s_date = parse_date(start_date_str)
        if s_date:
            query = query.filter(LocalEvent.end_date >= s_date)
    elif upcoming_only:
        query = query.filter(LocalEvent.end_date >= datetime.date.today())

    events = query.order_by(LocalEvent.start_date.asc()).all()
    return jsonify({
        'success': True,
        'count': len(events),
        'events': [e.to_dict() for e in events],
        'configured_sources': EventScraperService.get_configured_sources()
    }), 200

@event_bp.route('', methods=['POST'])
@token_required
def create_event(current_user):
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    location = data.get('location', '').strip()
    category = data.get('event_category', 'festival').strip()
    start_date = parse_date(data.get('start_date'))
    end_date = parse_date(data.get('end_date'))
    description = data.get('description', '').strip()
    footfall = int(data.get('expected_footfall', 1000))
    intensity = data.get('impact_intensity', 'medium').strip()
    source_url = data.get('source_url', '').strip()

    if not title or not location or not start_date or not end_date:
        return jsonify({'success': False, 'message': 'Title, location, start date, and end date are required.'}), 400

    if end_date < start_date:
        return jsonify({'success': False, 'message': 'End date cannot precede start date.'}), 400

    event = LocalEvent(
        title=title,
        location=location,
        event_category=category,
        start_date=start_date,
        end_date=end_date,
        description=description,
        expected_footfall=footfall,
        impact_intensity=intensity,
        source_url=source_url,
        source_name='Manual Entry by ' + current_user.full_name,
        collection_method='manual',
        is_verified=True
    )
    db_session.add(event)
    db_session.flush()

    audit = AuditLog(
        user_id=current_user.id,
        action='EVENT_CREATED_MANUALLY',
        entity_type='local_event',
        entity_id=event.id,
        details={'title': title, 'location': location}
    )
    db_session.add(audit)
    db_session.commit()

    return jsonify({'success': True, 'message': 'Event recorded successfully.', 'event': event.to_dict()}), 201

@event_bp.route('/<int:event_id>', methods=['PUT'])
@token_required
def update_event(current_user, event_id: int):
    event = db_session.query(LocalEvent).filter_by(id=event_id).first()
    if not event:
        return jsonify({'success': False, 'message': 'Event not found.'}), 404

    data = request.get_json() or {}
    if 'title' in data: event.title = data['title'].strip()
    if 'location' in data: event.location = data['location'].strip()
    if 'event_category' in data: event.event_category = data['event_category'].strip()
    if 'impact_intensity' in data: event.impact_intensity = data['impact_intensity'].strip()
    if 'expected_footfall' in data: event.expected_footfall = int(data['expected_footfall'])
    if 'description' in data: event.description = data['description'].strip()
    if 'start_date' in data:
        s_date = parse_date(data['start_date'])
        if s_date: event.start_date = s_date
    if 'end_date' in data:
        e_date = parse_date(data['end_date'])
        if e_date: event.end_date = e_date

    db_session.commit()
    return jsonify({'success': True, 'message': 'Event updated.', 'event': event.to_dict()}), 200

@event_bp.route('/<int:event_id>', methods=['DELETE'])
@token_required
def delete_event(current_user, event_id: int):
    event = db_session.query(LocalEvent).filter_by(id=event_id).first()
    if not event:
        return jsonify({'success': False, 'message': 'Event not found.'}), 404

    db_session.delete(event)
    db_session.commit()
    return jsonify({'success': True, 'message': 'Event deleted successfully.'}), 200

@event_bp.route('/scrape', methods=['POST'])
@token_required
def trigger_scrape(current_user):
    data = request.get_json() or {}
    source_id = data.get('source_id', 'kerala_tourism')

    try:
        result = EventScraperService.scrape_from_source(source_id)
        
        audit = AuditLog(
            user_id=current_user.id,
            action='SCRAPING_TRIGGERED',
            entity_type='scraping_run',
            entity_id=result.get('run_id'),
            details=result
        )
        db_session.add(audit)
        db_session.commit()

        return jsonify({
            'success': True,
            'message': f"Scraping completed. {result['new_events_saved']} new local tourism events saved.",
            'result': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f"Scraping run encountered an error: {str(e)}"}), 500

@event_bp.route('/scraping-runs', methods=['GET'])
def list_scraping_runs():
    runs = db_session.query(ScrapingRun).order_by(ScrapingRun.executed_at.desc()).limit(20).all()
    return jsonify({
        'success': True,
        'runs': [r.to_dict() for r in runs]
    }), 200
