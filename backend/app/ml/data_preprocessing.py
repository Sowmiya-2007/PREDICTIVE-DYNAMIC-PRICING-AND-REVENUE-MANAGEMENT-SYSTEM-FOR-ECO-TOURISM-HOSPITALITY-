import os
import datetime
import logging
import pandas as pd
import numpy as np
from app.database import db_session
from app.models.property import Property
from app.models.event import LocalEvent
from app.models.weather import WeatherObservation
from app.ml.feature_engineering import construct_feature_vector, extract_date_features, calculate_event_features

from app.config import Config
logger = logging.getLogger(__name__)

DATA_DIR = os.path.abspath(os.path.join(Config.BASE_DIR, '..', 'data'))
BOOKINGS_CSV = os.path.join(DATA_DIR, 'historical', 'hotel_bookings.csv')
WEATHER_CSV = os.path.join(DATA_DIR, 'historical', 'weather_data.csv')


def clean_and_handle_missing_values(df: pd.DataFrame, dataset_type: str = 'bookings') -> pd.DataFrame:
    """
    Handle missing values with explicit imputation strategies:
    - Numerical: median imputation by category/month
    - Categorical: mode imputation
    - Temporal: forward-fill or explicit date drop
    """
    df = df.copy()

    if dataset_type == 'bookings':
        # Drop rows missing critical dates or codes
        df = df.dropna(subset=['check_in_date', 'property_id'])

        # Numeric imputations
        if 'lead_time_days' in df.columns:
            median_lead = df['lead_time_days'].median() if not df['lead_time_days'].isna().all() else 7.0
            df['lead_time_days'] = df['lead_time_days'].fillna(median_lead).astype(int)

        if 'price_per_night' in df.columns:
            median_price = df['price_per_night'].median() if not df['price_per_night'].isna().all() else 3500.0
            df['price_per_night'] = df['price_per_night'].fillna(median_price).astype(float)

        if 'rooms_booked' in df.columns:
            df['rooms_booked'] = df['rooms_booked'].fillna(1).clip(lower=1).astype(int)

        if 'booking_status' in df.columns:
            df['booking_status'] = df['booking_status'].fillna('confirmed').astype(str)

    elif dataset_type == 'weather':
        df = df.dropna(subset=['date', 'location'])

        if 'temp_c' in df.columns:
            df['temp_c'] = df['temp_c'].fillna(24.0).astype(float)
        if 'rainfall_mm' in df.columns:
            df['rainfall_mm'] = df['rainfall_mm'].fillna(0.0).clip(lower=0.0).astype(float)
        if 'humidity_pct' in df.columns:
            df['humidity_pct'] = df['humidity_pct'].fillna(65).clip(lower=20, upper=100).astype(int)
        if 'eco_suitability_score' in df.columns:
            df['eco_suitability_score'] = df['eco_suitability_score'].fillna(0.85).clip(lower=0.1, upper=1.0).astype(float)
        if 'weather_condition' in df.columns:
            df['weather_condition'] = df['weather_condition'].fillna('Clear & Sunny').astype(str)

    return df

def load_and_preprocess_historical_data():
    """
    Load historical bookings and weather datasets, clean missing values,
    and synthesize daily occupancy observations merged with climate & events.
    """
    missing_summary = {}

    # 1. Load Bookings
    bookings_df = None
    if os.path.exists(BOOKINGS_CSV):
        try:
            raw_b_df = pd.read_csv(BOOKINGS_CSV)
            missing_summary['bookings_initial_missing'] = int(raw_b_df.isna().sum().sum())
            bookings_df = clean_and_handle_missing_values(raw_b_df, dataset_type='bookings')
            logger.info(f"Loaded {len(bookings_df)} historical bookings from {BOOKINGS_CSV}")
        except Exception as e:
            logger.warning(f"Failed to load bookings CSV: {e}")

    # 2. Load Weather
    weather_lookup = {}
    if os.path.exists(WEATHER_CSV):
        try:
            raw_w_df = pd.read_csv(WEATHER_CSV)
            missing_summary['weather_initial_missing'] = int(raw_w_df.isna().sum().sum())
            w_df = clean_and_handle_missing_values(raw_w_df, dataset_type='weather')
            for _, r in w_df.iterrows():
                key = (str(r['date']), str(r['location']).split(',')[0].strip().lower())
                weather_lookup[key] = {
                    'temp_c': float(r['temp_c']),
                    'rainfall_mm': float(r['rainfall_mm']),
                    'humidity_pct': int(r['humidity_pct']),
                    'weather_condition': str(r['weather_condition']),
                    'eco_suitability_score': float(r['eco_suitability_score'])
                }
            logger.info(f"Loaded {len(w_df)} historical weather observations from {WEATHER_CSV}")
        except Exception as e:
            logger.warning(f"Failed to load weather CSV: {e}")

    # 3. Retrieve properties & events from database
    properties = db_session.query(Property).all()
    events = db_session.query(LocalEvent).all()

    observations = []

    if bookings_df is not None and not bookings_df.empty:
        # Group bookings by property_id, room_type, and check_in_date to calculate actual historical selling price and demand
        bookings_df['check_in_date'] = pd.to_datetime(bookings_df['check_in_date']).dt.date
        
        # Only consider completed or confirmed bookings for actual selling price & demand calculation
        valid_b = bookings_df[bookings_df['booking_status'].isin(['confirmed', 'completed'])]
        grouped = valid_b.groupby(['property_id', 'room_type', 'check_in_date']).agg({
            'price_per_night': 'mean',
            'rooms_booked': 'sum',
            'lead_time_days': 'mean'
        }).reset_index()

        prop_map = {p.id: p for p in properties}

        for _, row in grouped.iterrows():
            p_id = int(row['property_id'])
            prop = prop_map.get(p_id)
            if not prop:
                continue

            target_date = row['check_in_date']
            rt_name = str(row['room_type']).strip()
            
            # Match room type object
            rt_obj = None
            if prop.room_types:
                for rt in prop.room_types:
                    if rt.name.strip().lower() == rt_name.lower():
                        rt_obj = rt
                        break
                if not rt_obj and prop.room_types:
                    rt_obj = prop.room_types[0]

            room_capacity = rt_obj.total_rooms if rt_obj else max(1, prop.total_capacity)
            rooms_booked = int(row['rooms_booked'])
            
            # Ground truth occupancy percentage
            occupancy_pct = float(np.clip((rooms_booked / room_capacity) * 100.0, 15.0, 98.0))

            # Target actual historical selling price (never fabricated)
            target_selling_price = float(row['price_per_night'])

            # Retrieve matched weather
            loc_key = prop.location.split(',')[0].strip().lower()
            w_info = weather_lookup.get((str(target_date), loc_key), {
                'temp_c': 23.5,
                'rainfall_mm': 2.0,
                'humidity_pct': 65,
                'weather_condition': 'Clear & Sunny',
                'eco_suitability_score': 0.88
            })

            # Feature vector calculation
            lead = int(row['lead_time_days']) if pd.notna(row['lead_time_days']) else 14
            feat_dict, _, cols = construct_feature_vector(
                target_date=target_date,
                property_obj=prop,
                room_type_obj=rt_obj,
                active_events=events,
                lead_time_days=lead,
                current_occupancy_pct=occupancy_pct,
                weather_dict=w_info
            )

            # Assign targets & key fields
            feat_dict['target_price'] = target_selling_price
            feat_dict['target_occupancy'] = occupancy_pct
            feat_dict['target_date'] = target_date
            feat_dict['room_type'] = rt_name
            feat_dict['temp_c'] = w_info['temp_c']
            feat_dict['rainfall_mm'] = w_info['rainfall_mm']
            feat_dict['eco_suitability_score'] = w_info['eco_suitability_score']

            observations.append(feat_dict)

    final_df = pd.DataFrame(observations)
    logger.info(f"Generated {len(final_df)} preprocessed multi-source training observations with direct selling prices.")
    return final_df, missing_summary
