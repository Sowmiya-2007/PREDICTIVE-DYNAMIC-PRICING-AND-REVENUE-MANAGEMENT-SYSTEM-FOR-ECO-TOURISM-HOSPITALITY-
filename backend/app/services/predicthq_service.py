import datetime
import logging
import requests
from app.config import Config
from app.database import db_session
from app.models.event import LocalEvent
from app.models.data_source import DataSourceStatus
from app.models.property import Property

logger = logging.getLogger(__name__)

class PredictHQEventsService:
    SOURCE_ID = 'predicthq_events_api'
    SOURCE_NAME = 'PredictHQ Events API'
    SOURCE_URL = 'https://api.predicthq.com/v1/events/'

    @classmethod
    def sync_events(cls, property_id: int = None, days_ahead: int = 45) -> dict:
        """
        Synchronize events from PredictHQ API if token is configured.
        Gracefully handles missing token ('unconfigured') and subscription access errors.
        """
        token = (Config.PREDICTHQ_API_TOKEN or '').strip()
        now = datetime.datetime.now(datetime.timezone.utc)

        if not token:
            cls._update_source_status(
                status='unconfigured',
                records_count=0,
                error_msg='PREDICTHQ_API_TOKEN not configured in backend/.env'
            )
            return {
                'success': True,
                'status': 'unconfigured',
                'message': 'PredictHQ API Token is not set in backend/.env. Feature is ready when token is provided.',
                'events_collected': 0
            }

        headers = {
            'Authorization': f"Bearer {token}",
            'Accept': 'application/json'
        }

        # Resolve location coordinates
        lat = 11.6854 # Wayanad / Western Ghats default
        lon = 76.1320
        if property_id:
            prop = db_session.query(Property).filter_by(id=property_id).first()
            if prop and prop.latitude and prop.longitude:
                lat, lon = float(prop.latitude), float(prop.longitude)

        start_date_str = datetime.date.today().isoformat()
        end_date_str = (datetime.date.today() + datetime.timedelta(days=days_ahead)).isoformat()

        params = {
            'location_around.origin': f"{lat},{lon}",
            'location_around.offset': '50km',
            'category': 'festivals,community,expos,performing-arts,sports',
            'active.gte': start_date_str,
            'active.lte': end_date_str,
            'limit': 20
        }

        try:
            logger.info(f"Querying PredictHQ API at {lat},{lon} within 50km...")
            resp = requests.get(Config.PREDICTHQ_API_URL, headers=headers, params=params, timeout=Config.SCRAPING_TIMEOUT_SECONDS)

            if resp.status_code == 401 or resp.status_code == 403:
                msg = f"PredictHQ authentication failed (HTTP {resp.status_code}). Verify your token."
                cls._update_source_status('failed', 0, error_msg=msg)
                return {'success': False, 'status': 'failed', 'message': msg}

            if resp.status_code != 200:
                msg = f"PredictHQ returned HTTP {resp.status_code}: {resp.text[:200]}"
                cls._update_source_status('failed', 0, error_msg=msg)
                return {'success': False, 'status': 'failed', 'message': msg}

            data = resp.json()
            results = data.get('results', [])
            saved_count = 0

            for ev in results:
                title = ev.get('title')
                start_raw = ev.get('start')
                end_raw = ev.get('end')
                phq_id = ev.get('id')

                if not title or not start_raw:
                    continue

                start_date = datetime.date.fromisoformat(start_raw.split('T')[0])
                end_date = datetime.date.fromisoformat(end_raw.split('T')[0]) if end_raw else start_date

                category = 'festival' if ev.get('category') == 'festivals' else 'cultural'
                existing = db_session.query(LocalEvent).filter_by(external_id=f"phq_{phq_id}").first()
                if not existing:
                    new_ev = LocalEvent(
                        title=title[:200],
                        location=f"Near Property ({round(lat, 2)}, {round(lon, 2)})",
                        event_category=category,
                        start_date=start_date,
                        end_date=end_date,
                        description=ev.get('description', '')[:1000],
                        expected_footfall=ev.get('phq_attendance') or 2000,
                        impact_intensity='high' if (ev.get('phq_attendance') or 0) > 5000 else 'medium',
                        source_url=f"https://app.predicthq.com/events/{phq_id}",
                        source_name='PredictHQ API',
                        collection_method='predicthq_api',
                        external_id=f"phq_{phq_id}",
                        status='active',
                        last_checked=now,
                        is_verified=True
                    )
                    db_session.add(new_ev)
                    saved_count += 1
                else:
                    existing.last_checked = now
                    existing.status = 'active'

            db_session.commit()
            total_phq = db_session.query(LocalEvent).filter_by(collection_method='predicthq_api').count()
            cls._update_source_status('healthy', total_phq)

            return {
                'success': True,
                'status': 'healthy',
                'events_collected': saved_count,
                'total_stored': total_phq
            }

        except Exception as e:
            db_session.rollback()
            logger.error(f"PredictHQ sync error: {e}")
            cls._update_source_status('failed', 0, error_msg=str(e))
            return {'success': False, 'status': 'failed', 'error': str(e)}

    @classmethod
    def _update_source_status(cls, status: str, records_count: int, error_msg: str = None):
        ds = db_session.query(DataSourceStatus).filter_by(source_id=cls.SOURCE_ID).first()
        now = datetime.datetime.now(datetime.timezone.utc)
        if not ds:
            ds = DataSourceStatus(
                source_id=cls.SOURCE_ID,
                source_name=cls.SOURCE_NAME,
                source_type='event_api',
                source_url=cls.SOURCE_URL,
                refresh_interval_minutes=180,
                is_live=True,
                is_configured=bool(Config.PREDICTHQ_API_TOKEN and Config.PREDICTHQ_API_TOKEN.strip())
            )
            db_session.add(ds)

        ds.last_fetch_attempt = now
        ds.fetch_status = status
        ds.error_message = error_msg
        if status == 'healthy':
            ds.last_successful_refresh = now
            ds.records_collected = records_count
            ds.latest_data_timestamp = now.strftime("%Y-%m-%d %H:%M")
        db_session.commit()
