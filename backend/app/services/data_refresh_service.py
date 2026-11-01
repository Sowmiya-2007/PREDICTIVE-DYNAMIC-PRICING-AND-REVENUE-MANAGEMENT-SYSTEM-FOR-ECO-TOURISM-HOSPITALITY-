import datetime
import logging
from app.config import Config
from app.database import db_session
from app.models.data_source import DataSourceStatus
from app.models.booking import Booking
from app.models.property import Property
from app.models.weather import WeatherObservation
from app.services.weather_service import WeatherService
from app.services.scraping_service import EventScraperService
from app.services.karnataka_scraper import KarnatakaTourismScraper
from app.services.kodagu_scraper import KodaguDistrictScraper
from app.services.holiday_service import HolidayService
from app.services.attraction_service import AttractionService

logger = logging.getLogger(__name__)

# The 8 Retained Active Data Integrations
INITIAL_DATA_SOURCES = [
    {
        'source_id': 'open_meteo_weather',
        'source_name': 'Open-Meteo Weather API',
        'source_type': 'weather_api',
        'source_url': 'https://api.open-meteo.com/v1/forecast',
        'refresh_interval_minutes': 60,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'kerala_tourism',
        'source_name': 'Kerala Official Eco-Tourism & Cultural Events Portal',
        'source_type': 'event_scraper',
        'source_url': 'https://www.keralatourism.org/event',
        'refresh_interval_minutes': 60,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'historical_bookings_db',
        'source_name': 'Local PMS Booking & Occupancy Database',
        'source_type': 'pms_bookings',
        'source_url': 'sqlite:///ecotourism_pricing.db',
        'refresh_interval_minutes': 15,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'karnataka_tourism_scraper',
        'source_name': 'Karnataka Tourism Event Scraper',
        'source_type': 'event_scraper',
        'source_url': 'https://karnatakatourism.org/en/events/',
        'refresh_interval_minutes': 360,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'kodagu_district_tourism',
        'source_name': 'Kodagu District Tourism Scraper',
        'source_type': 'event_scraper',
        'source_url': 'https://kodagu.nic.in/en/tourism/',
        'refresh_interval_minutes': 720,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'kodagu_culture_heritage',
        'source_name': 'Kodagu District Culture & Heritage Scraper',
        'source_type': 'event_scraper',
        'source_url': 'https://kodagu.nic.in/en/tourism/culture-heritage/',
        'refresh_interval_minutes': 720,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'nager_date_holidays',
        'source_name': 'Nager.Date Holiday API',
        'source_type': 'holiday_api',
        'source_url': 'https://date.nager.at/api/v3/PublicHolidays/',
        'refresh_interval_minutes': 720,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    },
    {
        'source_id': 'osm_overpass_attractions',
        'source_name': 'OpenStreetMap Overpass API',
        'source_type': 'attraction_api',
        'source_url': 'https://overpass-api.de/api/interpreter',
        'refresh_interval_minutes': 1440,
        'is_live': True,
        'is_configured': True,
        'fetch_status': 'healthy'
    }
]

REMOVED_SOURCE_IDS = ['ticketmaster_api', 'predicthq_events_api', 'ticketmaster', 'predicthq']

class DataRefreshService:
    @staticmethod
    def ensure_default_sources():
        """Ensure all 8 retained core data sources are registered and purge unconfigured sources."""
        try:
            # 1. Purge unconfigured Ticketmaster and PredictHQ registrations
            db_session.query(DataSourceStatus).filter(DataSourceStatus.source_id.in_(REMOVED_SOURCE_IDS)).delete(synchronize_session=False)

            # 2. Upsert the 8 retained data sources
            for item in INITIAL_DATA_SOURCES:
                existing = db_session.query(DataSourceStatus).filter_by(source_id=item['source_id']).first()
                if not existing:
                    ds = DataSourceStatus(
                        source_id=item['source_id'],
                        source_name=item['source_name'],
                        source_type=item['source_type'],
                        source_url=item['source_url'],
                        refresh_interval_minutes=item['refresh_interval_minutes'],
                        is_live=item['is_live'],
                        is_configured=item['is_configured'],
                        fetch_status=item['fetch_status'],
                        error_message=item.get('error_message')
                    )
                    db_session.add(ds)
                else:
                    existing.source_name = item['source_name']
                    existing.source_type = item['source_type']
                    existing.source_url = item['source_url']
                    existing.refresh_interval_minutes = item['refresh_interval_minutes']
                    existing.is_live = item['is_live']
                    existing.is_configured = True
                    if existing.fetch_status == 'unconfigured':
                        existing.fetch_status = 'healthy'
                        existing.error_message = None
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            logger.warning(f"Error initializing default data sources: {e}")

    @staticmethod
    def get_sources_overview():
        """Get live status, counts, and freshness for the 8 active external data integrations."""
        DataRefreshService.ensure_default_sources()

        now = datetime.datetime.now(datetime.timezone.utc)
        
        # Keep booking DB record count current
        try:
            pms_ds = db_session.query(DataSourceStatus).filter_by(source_id='historical_bookings_db').first()
            if pms_ds:
                b_count = db_session.query(Booking).count()
                pms_ds.records_collected = b_count
                pms_ds.last_successful_refresh = now
                pms_ds.fetch_status = 'healthy'
                latest_b = db_session.query(Booking).order_by(Booking.booking_date.desc()).first()
                if latest_b and latest_b.booking_date:
                    pms_ds.latest_data_timestamp = latest_b.booking_date.strftime("%Y-%m-%d %H:%M")
                db_session.commit()
        except Exception as e:
            db_session.rollback()
            logger.warning(f"Error updating PMS status: {e}")

        # Keep weather observation record count current
        try:
            w_ds = db_session.query(DataSourceStatus).filter_by(source_id='open_meteo_weather').first()
            if w_ds and (w_ds.records_collected or 0) == 0:
                w_count = db_session.query(WeatherObservation).count()
                if w_count > 0:
                    w_ds.records_collected = w_count
                    db_session.commit()
        except Exception as e:
            db_session.rollback()

        # Query only the 8 retained data sources in designated order
        allowed_ids = [item['source_id'] for item in INITIAL_DATA_SOURCES]
        sources = db_session.query(DataSourceStatus).filter(DataSourceStatus.source_id.in_(allowed_ids)).all()
        sources_by_id = {s.source_id: s for s in sources}
        ordered = [sources_by_id[sid] for sid in allowed_ids if sid in sources_by_id]
        return [s.to_dict() for s in ordered]

    @staticmethod
    def refresh_live_data(source_id: str = 'all', force: bool = False):
        """
        Execute real live data synchronization for requested source or all 8 retained sources.
        Every supported feed triggers authentic backend collection.
        """
        DataRefreshService.ensure_default_sources()
        results = {}

        # 1. Open-Meteo Weather API (60 min)
        if source_id in ['all', 'open_meteo_weather']:
            try:
                destinations = WeatherService.get_all_destinations_weather()
                w_count = db_session.query(WeatherObservation).count()
                w_ds = db_session.query(DataSourceStatus).filter_by(source_id='open_meteo_weather').first()
                if w_ds:
                    w_ds.records_collected = w_count
                    w_ds.last_successful_refresh = datetime.datetime.now(datetime.timezone.utc)
                    w_ds.fetch_status = 'healthy'
                    w_ds.error_message = None
                    db_session.commit()

                results['weather'] = {
                    'status': 'success',
                    'source': 'Open-Meteo Weather API',
                    'message': f"Updated real-time weather observations & forecasts for {len(destinations)} eco-retreat locations.",
                    'count': len(destinations)
                }
            except Exception as e:
                results['weather'] = {'status': 'error', 'source': 'Open-Meteo Weather API', 'message': str(e)}

        # 2. Kerala Official Eco-Tourism & Cultural Events Portal (60 min)
        if source_id in ['all', 'kerala_tourism']:
            try:
                k_res = EventScraperService.scrape_from_source('kerala_tourism')
                results['kerala_tourism'] = {
                    'status': 'success' if k_res.get('status') in ['success', 'healthy', 'partial'] else 'error',
                    'source': 'Kerala Official Eco-Tourism & Cultural Events Portal',
                    'message': f"Harvested {k_res.get('events_collected', 0)} events from Kerala Eco-Tourism Portal.",
                    'details': k_res
                }
            except Exception as e:
                results['kerala_tourism'] = {'status': 'error', 'source': 'Kerala Official Eco-Tourism & Cultural Events Portal', 'message': str(e)}

        # 3. Local PMS Booking & Occupancy Database (15 min)
        if source_id in ['all', 'historical_bookings_db']:
            try:
                b_count = db_session.query(Booking).count()
                pms_ds = db_session.query(DataSourceStatus).filter_by(source_id='historical_bookings_db').first()
                if pms_ds:
                    pms_ds.records_collected = b_count
                    pms_ds.last_successful_refresh = datetime.datetime.now(datetime.timezone.utc)
                    pms_ds.fetch_status = 'healthy'
                    db_session.commit()
                results['bookings_pms'] = {
                    'status': 'success',
                    'source': 'Local PMS Booking & Occupancy Database',
                    'message': f"Verified {b_count} historical bookings in database.",
                    'count': b_count
                }
            except Exception as e:
                results['bookings_pms'] = {'status': 'error', 'source': 'Local PMS Booking Database', 'message': str(e)}

        # 4. Karnataka Tourism Event Scraper (360 min)
        if source_id in ['all', 'karnataka_tourism_scraper']:
            try:
                kt_res = KarnatakaTourismScraper.scrape_events()
                results['karnataka_tourism'] = {
                    'status': 'success' if kt_res.get('success') else 'error',
                    'source': 'Karnataka Tourism Event Scraper',
                    'message': f"Scraped {kt_res.get('events_collected', 0)} events from Karnataka Tourism portal.",
                    'details': kt_res
                }
            except Exception as e:
                results['karnataka_tourism'] = {'status': 'error', 'source': 'Karnataka Tourism Event Scraper', 'message': str(e)}

        # 5. Kodagu District Tourism Scraper (720 min)
        if source_id in ['all', 'kodagu_district_tourism']:
            try:
                kod_tour = KodaguDistrictScraper.scrape_tourism_portal()
                results['kodagu_tourism'] = {
                    'status': 'success' if kod_tour.get('success') else 'error',
                    'source': 'Kodagu District Tourism Scraper',
                    'message': f"Validated official Kodagu tourism portal: {kod_tour.get('portal_title', 'Online')}.",
                    'details': kod_tour
                }
            except Exception as e:
                results['kodagu_tourism'] = {'status': 'error', 'source': 'Kodagu District Tourism Scraper', 'message': str(e)}

        # 6. Kodagu District Culture & Heritage Scraper (720 min)
        if source_id in ['all', 'kodagu_culture_heritage']:
            try:
                kod_cult = KodaguDistrictScraper.scrape_culture_heritage()
                results['kodagu_culture'] = {
                    'status': 'success' if kod_cult.get('success') else 'error',
                    'source': 'Kodagu District Culture & Heritage Scraper',
                    'message': f"Extracted {kod_cult.get('events_collected', 0)} verified cultural festivals from Kodagu official heritage portal.",
                    'details': kod_cult
                }
            except Exception as e:
                results['kodagu_culture'] = {'status': 'error', 'source': 'Kodagu District Culture & Heritage Scraper', 'message': str(e)}

        # 7. Nager.Date Public Holidays API (720 min)
        if source_id in ['all', 'nager_date_holidays']:
            try:
                hol_res = HolidayService.sync_holidays()
                results['holidays'] = {
                    'status': 'success' if hol_res.get('success') else 'error',
                    'source': 'Nager.Date Holiday API',
                    'message': f"Synchronized {hol_res.get('total_holidays', 0)} Indian national and regional public holidays.",
                    'details': hol_res
                }
            except Exception as e:
                results['holidays'] = {'status': 'error', 'source': 'Nager.Date Holiday API', 'message': str(e)}

        # 8. OpenStreetMap Overpass API (1440 min)
        if source_id in ['all', 'osm_overpass_attractions']:
            try:
                attr_res = AttractionService.sync_attractions()
                results['attractions'] = {
                    'status': 'success' if attr_res.get('success') else 'error',
                    'source': 'OpenStreetMap Overpass API',
                    'message': f"Synchronized {attr_res.get('total_attractions', 0)} nearby tourism points of interest and nature attractions.",
                    'details': attr_res
                }
            except Exception as e:
                results['attractions'] = {'status': 'error', 'source': 'OpenStreetMap Overpass API', 'message': str(e)}

        return {
            'success': True,
            'refreshed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'results': results,
            'sources': DataRefreshService.get_sources_overview()
        }
