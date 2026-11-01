import datetime
import numpy as np
import pandas as pd

INTENSITY_WEIGHTS = {
    'low': 1.0,
    'medium': 1.5,
    'high': 2.2,
    'peak': 3.0
}

CATEGORY_MAP = {
    'festival': 1,
    'cultural': 2,
    'nature_exhibition': 3,
    'eco_marathon': 4,
    'birdwatching_fest': 5,
    'harvest_fair': 6,
    'none': 0
}

ROOM_CATEGORY_CODES = {
    'canopy treehouse villa': 1,
    'bamboo earth cottage': 2,
    'shola horizon suite': 3,
    'tea planter heritage cottage': 4,
    'stilted estuary chalet': 5,
    'mangrove glamping tent': 6,
    'arabica veranda cottage': 7,
    'estate courtyard room': 8
}

def extract_date_features(target_date: datetime.date):
    """Extract temporal and calendar holiday features from target date."""
    day_of_week = target_date.weekday() # 0 = Monday, 6 = Sunday
    is_weekend = 1 if day_of_week in [4, 5, 6] else 0 # Fri, Sat, Sun
    month = target_date.month
    day = target_date.day
    
    # Eco-tourism seasonality (monsoon, winter peak, summer shoulder)
    # India / Tropical Eco-tourism seasons:
    # Peak winter: Nov - Feb (1.35), Shoulder: Mar - May (1.00), Monsoon/Eco: Jun - Aug (0.90), Post-monsoon: Sep - Oct (1.20)
    if month in [11, 12, 1, 2]:
        season_index = 3 # Peak
        seasonal_demand_weight = 1.35
    elif month in [9, 10]:
        season_index = 2 # Post-monsoon lush green
        seasonal_demand_weight = 1.20
    elif month in [3, 4, 5]:
        season_index = 1 # Summer
        seasonal_demand_weight = 1.00
    else:
        season_index = 0 # Monsoon
        seasonal_demand_weight = 0.90

    # Prominent Indian holidays & long weekend festival periods
    is_holiday = 0
    try:
        from app.services.holiday_service import HolidayService
        is_hol, _ = HolidayService.is_holiday(target_date)
        if is_hol:
            is_holiday = 1
    except Exception:
        pass

    if not is_holiday and (
        (month == 1 and day in [1, 26]) or
        (month == 3 and day in [24, 25, 26]) or
        (month == 8 and day == 15) or
        (month == 10 and (day == 2 or 15 <= day <= 25)) or
        (month == 11 and (1 <= day <= 15)) or
        (month == 12 and day >= 24)
    ):
        is_holiday = 1

    return {
        'day_of_week': day_of_week,
        'is_weekend': is_weekend,
        'month': month,
        'season_index': season_index,
        'seasonal_demand_weight': seasonal_demand_weight,
        'is_holiday': is_holiday
    }

def calculate_event_features(target_date: datetime.date, property_location: str, active_events: list):
    """
    Calculate event proximity, intensity, and category weights for a given date and location.
    """
    if not active_events:
        return {
            'has_event': 0,
            'event_count': 0,
            'max_event_intensity': 1.0,
            'event_intensity_score': 0.0,
            'event_category_code': 0,
            'primary_event_title': 'None'
        }

    # Filter events active on or within 1 day of target_date and matching general region/location
    relevant_events = []
    prop_loc_lower = (property_location or "").lower()

    for ev in active_events:
        ev_start = ev.start_date if hasattr(ev, 'start_date') else ev.get('start_date')
        ev_end = ev.end_date if hasattr(ev, 'end_date') else ev.get('end_date')
        ev_loc = ev.location if hasattr(ev, 'location') else ev.get('location', '')
        
        # Proximity check
        loc_match = (
            ev_loc.lower() in prop_loc_lower or 
            prop_loc_lower in ev_loc.lower() or
            any(token in ev_loc.lower() for token in prop_loc_lower.split(',') if len(token.strip()) > 3)
        )
        
        # Date span check
        if isinstance(ev_start, str):
            ev_start = datetime.datetime.strptime(ev_start, '%Y-%m-%d').date()
        if isinstance(ev_end, str):
            ev_end = datetime.datetime.strptime(ev_end, '%Y-%m-%d').date()

        # Within event period
        if ev_start <= target_date <= ev_end and loc_match:
            relevant_events.append(ev)

    if not relevant_events:
        return {
            'has_event': 0,
            'event_count': 0,
            'max_event_intensity': 1.0,
            'event_intensity_score': 0.0,
            'event_category_code': 0,
            'primary_event_title': 'None'
        }

    intensity_scores = []
    primary_event = relevant_events[0]
    
    for ev in relevant_events:
        intensity = getattr(ev, 'impact_intensity', None) or (ev.get('impact_intensity') if isinstance(ev, dict) else 'medium')
        score = INTENSITY_WEIGHTS.get(intensity.lower(), 1.5)
        intensity_scores.append(score)

    max_intensity = max(intensity_scores)
    total_score = sum(intensity_scores)
    cat = getattr(primary_event, 'event_category', None) or (primary_event.get('event_category') if isinstance(primary_event, dict) else 'festival')
    cat_code = CATEGORY_MAP.get(cat.lower(), 1)
    title = getattr(primary_event, 'title', None) or (primary_event.get('title') if isinstance(primary_event, dict) else 'Active Event')

    return {
        'has_event': 1,
        'event_count': len(relevant_events),
        'max_event_intensity': float(max_intensity),
        'event_intensity_score': float(total_score),
        'event_category_code': cat_code,
        'primary_event_title': title
    }

def construct_feature_vector(
    target_date: datetime.date,
    property_obj,
    room_type_obj,
    active_events: list,
    lead_time_days: int = 14,
    current_occupancy_pct: float = 40.0,
    weather_dict: dict = None,
    competitor_price: float = None
):
    """
    Construct standardized feature dictionary and numpy array for model inference,
    incorporating temporal calendar, local events, property profile, and weather conditions.
    """
    date_feats = extract_date_features(target_date)
    event_feats = calculate_event_features(target_date, property_obj.location, active_events)
    
    base_price = room_type_obj.base_price if room_type_obj else property_obj.base_price
    sustainability = property_obj.sustainability_rating or 4.5
    total_rooms = room_type_obj.total_rooms if room_type_obj else property_obj.total_capacity

    # Room category code
    rt_name = (room_type_obj.name if hasattr(room_type_obj, 'name') else str(room_type_obj or '')) if room_type_obj else ''
    room_category_code = ROOM_CATEGORY_CODES.get(rt_name.strip().lower(), 1)

    # Competitor price benchmark (default 5% premium over property base)
    comp_price = float(competitor_price if competitor_price is not None else (float(base_price) * 1.05))

    # Weather indicators
    if not weather_dict:
        # Default seasonal weather heuristics
        m = target_date.month
        temp = 23.0 if m in [11, 12, 1, 2] else (26.5 if m in [3, 4, 5] else 24.0)
        rain = 25.0 if m in [6, 7, 8] else (5.0 if m in [9, 10] else 1.0)
        suitability = 0.95 if m in [11, 12, 1, 2] else (0.70 if m in [6, 7, 8] else 0.85)
        cond = 'Clear & Sunny' if rain < 5 else 'Rain Showers'
    else:
        temp = float(weather_dict.get('temp_c', 24.0))
        rain = float(weather_dict.get('rainfall_mm', 0.0))
        suitability = float(weather_dict.get('eco_suitability_score', 0.85))
        cond = str(weather_dict.get('weather_condition', 'Clear & Sunny'))
    
    feature_dict = {
        'base_price': float(base_price),
        'room_category_code': int(room_category_code),
        'lead_time_days': int(lead_time_days),
        'current_occupancy_pct': float(current_occupancy_pct),
        'day_of_week': date_feats['day_of_week'],
        'is_weekend': date_feats['is_weekend'],
        'month': date_feats['month'],
        'season_index': date_feats['season_index'],
        'seasonal_demand_weight': date_feats['seasonal_demand_weight'],
        'is_holiday': date_feats['is_holiday'],
        'has_event': event_feats['has_event'],
        'event_count': event_feats['event_count'],
        'max_event_intensity': event_feats['max_event_intensity'],
        'event_intensity_score': event_feats['event_intensity_score'],
        'event_category_code': event_feats['event_category_code'],
        'primary_event_title': event_feats.get('primary_event_title', 'None'),
        'sustainability_rating': float(sustainability),
        'total_rooms': int(total_rooms),
        'temp_c': float(temp),
        'rainfall_mm': float(rain),
        'eco_suitability_score': float(suitability),
        'weather_condition': cond,
        'competitor_price': float(comp_price)
    }
    
    ordered_columns = [
        'base_price', 'room_category_code', 'lead_time_days', 'current_occupancy_pct',
        'day_of_week', 'is_weekend', 'month', 'season_index', 'seasonal_demand_weight',
        'is_holiday', 'has_event', 'event_count', 'max_event_intensity',
        'event_intensity_score', 'event_category_code', 'temp_c', 'rainfall_mm',
        'eco_suitability_score', 'competitor_price'
    ]
    
    vector = np.array([[feature_dict[col] for col in ordered_columns]], dtype=np.float32)
    return feature_dict, vector, ordered_columns

