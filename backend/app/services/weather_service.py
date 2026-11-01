import os
import csv
import datetime
import logging
import time
import requests
from app.config import Config
from app.database import db_session
from app.models.weather import WeatherObservation
from app.models.property import Property
from app.models.data_source import DataSourceStatus

logger = logging.getLogger(__name__)

# Default coordinates lookup for eco-tourism hubs
COORDINATES = {
    'wayanad': {'lat': 11.6854, 'lon': 76.1320, 'name': 'Wayanad, Kerala'},
    'nilgiris': {'lat': 11.4102, 'lon': 76.6950, 'name': 'Nilgiris, Tamil Nadu'},
    'sundarbans': {'lat': 21.9497, 'lon': 89.1833, 'name': 'Sundarbans, West Bengal'},
    'coorg': {'lat': 12.3375, 'lon': 75.8069, 'name': 'Coorg, Karnataka'},
    'munnar': {'lat': 10.0889, 'lon': 77.0595, 'name': 'Munnar, Kerala'}
}

# WMO Weather Interpretation Codes (WW)
WMO_CODE_MAP = {
    0: 'Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy Mist',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain Showers',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snowfall',
    73: 'Moderate Snowfall',
    75: 'Heavy Snowfall',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Slight Hail',
    99: 'Thunderstorm with Heavy Hail'
}

class WeatherService:
    @staticmethod
    def wmo_to_condition(code: int) -> str:
        """Convert Open-Meteo WMO weather code to standard condition string."""
        if code is None:
            return 'Clear & Sunny'
        return WMO_CODE_MAP.get(int(code), 'Clear & Sunny')

    @staticmethod
    def calculate_eco_suitability(temp_c: float, rainfall_mm: float, weather_code: int = None) -> float:
        """
        Calculate eco-tourism suitability score (0.1 to 1.0) based on outdoor comfort.
        Ideal temperature: 20°C - 26°C. Rain or storms reduce trail suitability.
        """
        temp = float(temp_c if temp_c is not None else 24.0)
        rain = float(rainfall_mm if rainfall_mm is not None else 0.0)

        # Base score from temperature comfort deviation from 23.0C
        temp_deviation = abs(temp - 23.0)
        temp_factor = max(0.0, 1.0 - (temp_deviation * 0.035))

        # Rain penalty
        if rain > 40.0:
            rain_factor = 0.50
        elif rain > 15.0:
            rain_factor = 0.70
        elif rain > 5.0:
            rain_factor = 0.85
        elif rain > 0.5:
            rain_factor = 0.94
        else:
            rain_factor = 1.0

        # Severe weather penalty
        storm_penalty = 0.80 if weather_code in [95, 96, 99, 82] else 1.0

        score = temp_factor * rain_factor * storm_penalty
        return round(float(max(0.20, min(0.98, score))), 2)

    @staticmethod
    def get_property_coordinates(property_obj: Property) -> tuple[float, float]:
        """Resolve property coordinates: configured property lat/lon with fallback to known hub."""
        if property_obj and property_obj.latitude and property_obj.longitude:
            return float(property_obj.latitude), float(property_obj.longitude)

        # Fallback to coordinate dictionary lookup by property location/name
        search_text = f"{property_obj.name} {property_obj.location}".lower() if property_obj else ""
        for key, coords in COORDINATES.items():
            if key in search_text:
                return coords['lat'], coords['lon']

        return 11.6854, 76.1320 # Default Wayanad

    @staticmethod
    def fetch_open_meteo_live(lat: float, lon: float, days: int = 7) -> dict:
        """
        Query real Open-Meteo Forecast API with retries, timeout, and error handling.
        Returns normalized dictionary of current observation and daily forecast.
        """
        base_url = Config.OPEN_METEO_BASE_URL or "https://api.open-meteo.com/v1/forecast"
        params = {
            'latitude': round(lat, 4),
            'longitude': round(lon, 4),
            'current': 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
            'daily': 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
            'timezone': 'auto',
            'forecast_days': min(days, 14)
        }

        request_url = requests.Request('GET', base_url, params=params).prepare().url
        headers = {'User-Agent': Config.USER_AGENT}

        last_error = None
        for attempt in range(3):
            try:
                response = requests.get(base_url, params=params, headers=headers, timeout=Config.SCRAPING_TIMEOUT_SECONDS)
                if response.status_code == 200:
                    data = response.json()
                    # Update data source health record
                    WeatherService.update_data_source_status(
                        status='healthy',
                        url=request_url,
                        records_count=len(data.get('daily', {}).get('time', [])),
                        error=None,
                        latest_time=data.get('current', {}).get('time')
                    )
                    return {'data': data, 'source_url': request_url, 'success': True}
                else:
                    last_error = f"HTTP {response.status_code}: {response.text[:120]}"
            except Exception as e:
                last_error = str(e)
                time.sleep(0.5 * (attempt + 1))

        # Record failure in data source status
        WeatherService.update_data_source_status(
            status='failed',
            url=request_url,
            records_count=0,
            error=last_error,
            latest_time=None
        )
        return {'data': None, 'source_url': request_url, 'success': False, 'error': last_error}

    @staticmethod
    def update_data_source_status(status: str, url: str, records_count: int, error: str = None, latest_time: str = None):
        """Update or insert DataSourceStatus for Open-Meteo."""
        try:
            ds = db_session.query(DataSourceStatus).filter_by(source_id='open_meteo_weather').first()
            if not ds:
                ds = DataSourceStatus(
                    source_id='open_meteo_weather',
                    source_name='Open-Meteo Weather API',
                    source_type='weather_api',
                    source_url=url,
                    refresh_interval_minutes=Config.LIVE_DATA_REFRESH_INTERVAL_MINUTES,
                    is_live=True,
                    is_configured=True
                )
                db_session.add(ds)

            ds.last_fetch_attempt = datetime.datetime.utcnow()
            ds.source_url = url
            if status == 'healthy':
                ds.fetch_status = 'healthy'
                ds.last_successful_refresh = datetime.datetime.utcnow()
                ds.records_collected = (ds.records_collected or 0) + records_count
                ds.error_message = None
                if latest_time:
                    ds.latest_data_timestamp = latest_time
            else:
                ds.fetch_status = 'failed'
                ds.error_message = error

            db_session.commit()
        except Exception as e:
            db_session.rollback()
            logger.warning(f"Error updating DataSourceStatus for weather: {e}")

    @staticmethod
    def get_weather_for_date(location: str, target_date: datetime.date, property_id: int = None) -> dict:
        """
        Retrieve weather metrics for a specific location and date.
        Distinguishes:
        - Current Live Observations (for today)
        - Weather Forecasts (for future dates)
        - Historical Records (for past dates)
        Uses real Open-Meteo data with property latitude & longitude, with caching & fallback.
        """
        today = datetime.date.today()
        is_today = (target_date == today)
        is_future = (target_date > today)
        is_past = (target_date < today)
        norm_loc = (location or '').strip()

        # Resolve property coordinates
        prop = None
        if property_id:
            prop = db_session.query(Property).filter_by(id=property_id).first()
        if not prop and norm_loc:
            prop = db_session.query(Property).filter(Property.location.ilike(f"%{norm_loc.split(',')[0]}%")).first()

        lat, lon = WeatherService.get_property_coordinates(prop)

        # 1. Check existing recent database cache
        cached_obs = db_session.query(WeatherObservation).filter(
            WeatherObservation.date == target_date,
            WeatherObservation.location.ilike(f"%{norm_loc.split(',')[0].strip()}%")
        ).order_by(WeatherObservation.created_at.desc()).first()

        # If cache exists and is fresh (< 60 minutes for today, or valid forecast/historical), reuse
        if cached_obs:
            if not is_today:
                return cached_obs.to_dict()
            else:
                # Check cache freshness for today
                if cached_obs.fetch_time:
                    elapsed = (datetime.datetime.utcnow() - cached_obs.fetch_time).total_seconds()
                    if elapsed < (Config.LIVE_DATA_REFRESH_INTERVAL_MINUTES * 60):
                        return cached_obs.to_dict()

        # 2. Query Live Open-Meteo API for today or upcoming forecast (up to 14 days)
        if not is_past and (target_date - today).days <= 14:
            live_res = WeatherService.fetch_open_meteo_live(lat, lon, days=max(7, (target_date - today).days + 2))
            if live_res.get('success') and live_res.get('data'):
                raw = live_res['data']
                source_url = live_res['source_url']

                if is_today and 'current' in raw:
                    cur = raw['current']
                    temp = float(cur.get('temperature_2m', 24.0))
                    rain = float(cur.get('precipitation', 0.0))
                    hum = int(cur.get('relative_humidity_2m', 65))
                    w_code = cur.get('weather_code', 0)
                    cond = WeatherService.wmo_to_condition(w_code)
                    suitability = WeatherService.calculate_eco_suitability(temp, rain, w_code)
                    obs_time = cur.get('time', today.isoformat())

                    new_obs = WeatherObservation(
                        property_id=property_id or (prop.id if prop else None),
                        location=prop.location if prop else norm_loc,
                        state_or_region=prop.state_or_region if prop else 'Regional',
                        date=target_date,
                        temp_c=temp,
                        rainfall_mm=rain,
                        humidity_pct=hum,
                        weather_condition=cond,
                        weather_code=w_code,
                        eco_suitability_score=suitability,
                        source='Open-Meteo Live API',
                        source_url=source_url,
                        data_type='observation',
                        observation_time=obs_time,
                        fetch_time=datetime.datetime.utcnow(),
                        latitude=lat,
                        longitude=lon
                    )
                    # Merge or add
                    try:
                        if cached_obs:
                            cached_obs.temp_c = temp
                            cached_obs.rainfall_mm = rain
                            cached_obs.humidity_pct = hum
                            cached_obs.weather_condition = cond
                            cached_obs.weather_code = w_code
                            cached_obs.eco_suitability_score = suitability
                            cached_obs.source = 'Open-Meteo Live API'
                            cached_obs.source_url = source_url
                            cached_obs.data_type = 'observation'
                            cached_obs.observation_time = obs_time
                            cached_obs.fetch_time = datetime.datetime.utcnow()
                            cached_obs.latitude = lat
                            cached_obs.longitude = lon
                            db_session.commit()
                            return cached_obs.to_dict()
                        else:
                            db_session.add(new_obs)
                            db_session.commit()
                            return new_obs.to_dict()
                    except Exception as e:
                        db_session.rollback()
                        logger.warning(f"Error saving live weather observation: {e}")

                elif is_future and 'daily' in raw:
                    daily = raw['daily']
                    dates = daily.get('time', [])
                    target_str = target_date.strftime('%Y-%m-%d')
                    if target_str in dates:
                        idx = dates.index(target_str)
                        t_max = daily.get('temperature_2m_max', [26.0])[idx]
                        t_min = daily.get('temperature_2m_min', [20.0])[idx]
                        temp = round((t_max + t_min) / 2.0, 1)
                        rain = float(daily.get('precipitation_sum', [0.0])[idx] or 0.0)
                        w_code = daily.get('weather_code', [0])[idx]
                        cond = WeatherService.wmo_to_condition(w_code)
                        suitability = WeatherService.calculate_eco_suitability(temp, rain, w_code)

                        forecast_obs = WeatherObservation(
                            property_id=property_id or (prop.id if prop else None),
                            location=prop.location if prop else norm_loc,
                            state_or_region=prop.state_or_region if prop else 'Regional',
                            date=target_date,
                            temp_c=temp,
                            rainfall_mm=rain,
                            humidity_pct=65,
                            weather_condition=cond,
                            weather_code=w_code,
                            eco_suitability_score=suitability,
                            source='Open-Meteo Forecast API',
                            source_url=source_url,
                            data_type='forecast',
                            observation_time=target_str,
                            fetch_time=datetime.datetime.utcnow(),
                            latitude=lat,
                            longitude=lon
                        )
                        try:
                            if cached_obs:
                                cached_obs.temp_c = temp
                                cached_obs.rainfall_mm = rain
                                cached_obs.weather_condition = cond
                                cached_obs.weather_code = w_code
                                cached_obs.eco_suitability_score = suitability
                                cached_obs.data_type = 'forecast'
                                cached_obs.source = 'Open-Meteo Forecast API'
                                cached_obs.fetch_time = datetime.datetime.utcnow()
                                db_session.commit()
                                return cached_obs.to_dict()
                            else:
                                db_session.add(forecast_obs)
                                db_session.commit()
                                return forecast_obs.to_dict()
                        except Exception as e:
                            db_session.rollback()

        # 3. Check local CSV historical dataset for past dates
        csv_path = os.path.abspath(os.path.join(Config.BASE_DIR, '..', 'data', 'historical', 'weather_data.csv'))
        if os.path.exists(csv_path):
            target_str = target_date.strftime('%Y-%m-%d')
            target_key = norm_loc.split(',')[0].strip().lower()
            try:
                with open(csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if row.get('date') == target_str and target_key in row.get('location', '').lower():
                            hist_obs = WeatherObservation(
                                property_id=property_id or (prop.id if prop else None),
                                location=row.get('location', norm_loc),
                                state_or_region=row.get('state_or_region', 'Regional'),
                                date=target_date,
                                temp_c=float(row.get('temp_c', 24.0)),
                                rainfall_mm=float(row.get('rainfall_mm', 0.0)),
                                humidity_pct=int(row.get('humidity_pct', 65)),
                                weather_condition=row.get('weather_condition', 'Clear & Sunny'),
                                eco_suitability_score=float(row.get('eco_suitability_score', 0.85)),
                                source='Historical Regional Dataset (CSV)',
                                source_url='local://data/historical/weather_data.csv',
                                data_type='historical',
                                observation_time=target_str,
                                fetch_time=datetime.datetime.utcnow(),
                                latitude=lat,
                                longitude=lon
                            )
                            if not cached_obs:
                                try:
                                    db_session.add(hist_obs)
                                    db_session.commit()
                                except Exception:
                                    db_session.rollback()
                            return hist_obs.to_dict()
            except Exception as e:
                logger.warning(f"Error reading weather CSV: {e}")

        # 4. Graceful Fallback with clear labeling
        month = target_date.month
        is_monsoon = month in [6, 7, 8]
        is_peak = month in [11, 12, 1, 2]

        if is_monsoon:
            rain = 28.0
            temp = 23.5
            cond = 'Moderate Rain'
            suitability = 0.68
        elif is_peak:
            rain = 1.0
            temp = 20.0
            cond = 'Clear & Sunny'
            suitability = 0.94
        elif month in [9, 10]:
            rain = 7.5
            temp = 24.0
            cond = 'Light Showers'
            suitability = 0.86
        else:
            rain = 3.0
            temp = 28.0
            cond = 'Sunny & Warm'
            suitability = 0.82

        fallback_obs = WeatherObservation(
            property_id=property_id or (prop.id if prop else None),
            location=norm_loc or 'Eco Sanctuary Region',
            state_or_region=prop.state_or_region if prop else 'Regional',
            date=target_date,
            temp_c=temp,
            rainfall_mm=rain,
            humidity_pct=65,
            weather_condition=cond,
            eco_suitability_score=suitability,
            source='Eco-Climate Climatology Model (Unverified Live API)',
            source_url=live_res.get('source_url') if 'live_res' in locals() else None,
            data_type='forecast' if is_future else ('observation' if is_today else 'historical'),
            observation_time=target_date.isoformat(),
            fetch_time=datetime.datetime.utcnow(),
            latitude=lat,
            longitude=lon
        )
        return fallback_obs.to_dict()

    @staticmethod
    def get_forecast_for_property(property_id: int, days: int = 7) -> list:
        """Get daily weather forecast for upcoming days for a specific property."""
        prop = db_session.query(Property).filter_by(id=property_id).first()
        if not prop:
            return []

        today = datetime.date.today()
        forecast = []
        for d in range(days):
            target_date = today + datetime.timedelta(days=d)
            w = WeatherService.get_weather_for_date(prop.location, target_date, property_id=prop.id)
            forecast.append({
                **w,
                'day_name': target_date.strftime('%a'),
                'display_date': target_date.strftime('%b %d')
            })
        return forecast

    @staticmethod
    def get_all_destinations_weather() -> list:
        """Returns today's live weather summary across all registered eco-tourism sanctuaries."""
        properties = db_session.query(Property).filter_by(is_active=True).all()
        today = datetime.date.today()
        results = []

        for p in properties:
            w = WeatherService.get_weather_for_date(p.location, today, property_id=p.id)
            impact = WeatherService.calculate_weather_impact(w)
            results.append({
                'property_id': p.id,
                'property_name': p.name,
                'location': p.location,
                'latitude': p.latitude,
                'longitude': p.longitude,
                'today_weather': w,
                'weather_multiplier': impact['multiplier'],
                'impact_label': impact['label'],
                'recommendation_note': impact['recommendation_note'],
                'data_source': w.get('source', 'Open-Meteo Live API'),
                'fetch_time': w.get('fetch_time')
            })
        return results

    @staticmethod
    def calculate_weather_impact(weather_dict: dict) -> dict:
        """Calculates demand and dynamic pricing impact from weather conditions."""
        if not weather_dict:
            return {'multiplier': 1.0, 'label': 'Neutral Weather', 'recommendation_note': 'Normal climate conditions.'}

        rainfall = float(weather_dict.get('rainfall_mm', 0.0))
        suitability = float(weather_dict.get('eco_suitability_score', 0.85))

        if rainfall > 40.0:
            multiplier = 0.88
            label = 'Heavy Monsoon Downpour'
            note = 'Heavy rain expected; recommend indoor ayurvedic wellness incentives and 10-12% rate stimulus.'
        elif rainfall > 15.0:
            multiplier = 0.94
            label = 'Moderate Rain Showers'
            note = 'Lush greenery appeal; slight rate adjustment to maintain booking pace.'
        elif suitability >= 0.90:
            multiplier = 1.08
            label = 'Prime Eco-Tourism Weather'
            note = 'Ideal clear skies & comfortable temperatures. High outdoor trail demand supports premium rate capture.'
        elif suitability >= 0.80:
            multiplier = 1.02
            label = 'Pleasant Nature Conditions'
            note = 'Favorable outdoor conditions.'
        else:
            multiplier = 0.96
            label = 'Humid / Warm Conditions'
            note = 'Mild off-peak weather.'

        return {
            'multiplier': multiplier,
            'label': label,
            'recommendation_note': note
        }

    @staticmethod
    def seed_from_csv(csv_path: str = None) -> int:
        """Ingest historical weather dataset into database if table has few records."""
        if db_session.query(WeatherObservation).count() > 50:
            return 0

        if not csv_path:
            csv_path = os.path.abspath(os.path.join(Config.BASE_DIR, '..', 'data', 'historical', 'weather_data.csv'))

        if not os.path.exists(csv_path):
            return 0

        inserted = 0
        try:
            existing_pairs = set(
                db_session.query(WeatherObservation.location, WeatherObservation.date).all()
            )
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    obs_date = datetime.datetime.strptime(row['date'], '%Y-%m-%d').date()
                    if (row['location'], obs_date) in existing_pairs:
                        continue
                    obs = WeatherObservation(
                        location=row['location'],
                        state_or_region=row.get('state_or_region'),
                        date=obs_date,
                        temp_c=float(row.get('temp_c', 24.0)),
                        rainfall_mm=float(row.get('rainfall_mm', 0.0)),
                        humidity_pct=int(row.get('humidity_pct', 65)),
                        weather_condition=row.get('weather_condition', 'Clear & Sunny'),
                        eco_suitability_score=float(row.get('eco_suitability_score', 0.85)),
                        source='Historical Regional Ingestion',
                        source_url='local://data/historical/weather_data.csv',
                        data_type='historical',
                        observation_time=row['date'],
                        fetch_time=datetime.datetime.utcnow()
                    )
                    db_session.add(obs)
                    existing_pairs.add((row['location'], obs_date))
                    inserted += 1
                    if inserted % 200 == 0:
                        db_session.flush()
            db_session.commit()
            logger.info(f"Seeded {inserted} historical weather records.")
        except Exception as e:
            db_session.rollback()
            logger.error(f"Error seeding weather: {e}")
        return inserted
