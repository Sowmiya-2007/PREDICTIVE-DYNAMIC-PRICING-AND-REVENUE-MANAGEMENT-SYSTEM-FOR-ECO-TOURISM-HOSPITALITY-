import logging
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from app.config import Config

logger = logging.getLogger(__name__)

Base = declarative_base()

# Establish engine
def get_engine():
    db_url = Config.DATABASE_URL
    try:
        if db_url.startswith("sqlite"):
            # Ensure SQLite path directory exists if absolute/relative
            engine = create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                echo=False
            )
        else:
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=False
            )
        # Test connection
        with engine.connect() as conn:
            pass
        return engine
    except Exception as e:
        logger.warning(f"Could not connect to primary database ({db_url}): {e}. Falling back to SQLite.")
        fallback_url = "sqlite:///ecotourism_pricing.db"
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            echo=False
        )

engine = get_engine()
SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db_session = scoped_session(SessionFactory)

def init_db():
    import app.models  # Ensure all models are imported so tables are created
    Base.metadata.create_all(bind=engine)
    
    # Run safe column migrations for existing databases
    try:
        with engine.connect() as conn:
            # Check users columns
            try:
                res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                user_cols = [row[1] for row in res]
                if user_cols:
                    if 'phone' not in user_cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50)"))
                    if 'preferred_destination' not in user_cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN preferred_destination VARCHAR(100)"))
                    if 'eco_preference' not in user_cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN eco_preference VARCHAR(100)"))
            except Exception as e:
                logger.debug(f"User table migration check: {e}")

            # Check bookings columns
            try:
                res = conn.execute(text("PRAGMA table_info(bookings)")).fetchall()
                booking_cols = [row[1] for row in res]
                if booking_cols:
                    if 'user_id' not in booking_cols:
                        conn.execute(text("ALTER TABLE bookings ADD COLUMN user_id INTEGER"))
                    if 'special_requests' not in booking_cols:
                        conn.execute(text("ALTER TABLE bookings ADD COLUMN special_requests VARCHAR(255)"))
            except Exception as e:
                logger.debug(f"Booking table migration check: {e}")

            # Check weather_observations columns
            try:
                res = conn.execute(text("PRAGMA table_info(weather_observations)")).fetchall()
                w_cols = [row[1] for row in res]
                if w_cols:
                    if 'weather_code' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN weather_code INTEGER"))
                    if 'source_url' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN source_url VARCHAR(255)"))
                    if 'data_type' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN data_type VARCHAR(50) DEFAULT 'observation'"))
                    if 'observation_time' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN observation_time VARCHAR(50)"))
                    if 'fetch_time' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN fetch_time DATETIME"))
                    if 'latitude' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN latitude FLOAT"))
                    if 'longitude' not in w_cols:
                        conn.execute(text("ALTER TABLE weather_observations ADD COLUMN longitude FLOAT"))
            except Exception as e:
                logger.debug(f"Weather table migration check: {e}")

            # Check local_events columns
            try:
                res = conn.execute(text("PRAGMA table_info(local_events)")).fetchall()
                ev_cols = [row[1] for row in res]
                if ev_cols:
                    if 'external_id' not in ev_cols:
                        conn.execute(text("ALTER TABLE local_events ADD COLUMN external_id VARCHAR(100)"))
                    if 'status' not in ev_cols:
                        conn.execute(text("ALTER TABLE local_events ADD COLUMN status VARCHAR(50) DEFAULT 'active'"))
                    if 'last_checked' not in ev_cols:
                        conn.execute(text("ALTER TABLE local_events ADD COLUMN last_checked DATETIME"))
            except Exception as e:
                logger.debug(f"LocalEvent table migration check: {e}")

            # Check model_training_runs columns
            try:
                res = conn.execute(text("PRAGMA table_info(model_training_runs)")).fetchall()
                run_cols = [row[1] for row in res]
                if run_cols:
                    if 'all_models_metrics' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN all_models_metrics JSON"))
                    if 'best_model_name' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN best_model_name VARCHAR(50) DEFAULT 'RandomForestRegressor'"))
                    if 'training_period_start' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN training_period_start DATE"))
                    if 'training_period_end' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN training_period_end DATE"))
                    if 'test_period_start' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN test_period_start DATE"))
                    if 'test_period_end' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN test_period_end DATE"))
                    if 'shap_summary' not in run_cols:
                        conn.execute(text("ALTER TABLE model_training_runs ADD COLUMN shap_summary JSON"))
            except Exception as e:
                logger.debug(f"ModelTrainingRun table migration check: {e}")

            # Check pricing_recommendations columns
            try:
                res = conn.execute(text("PRAGMA table_info(pricing_recommendations)")).fetchall()
                rec_cols = [row[1] for row in res]
                if rec_cols:
                    if 'model_version' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN model_version VARCHAR(50) DEFAULT 'v1.0'"))
                    if 'selected_model_name' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN selected_model_name VARCHAR(50) DEFAULT 'RandomForestRegressor'"))
                    if 'model_predicted_price' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN model_predicted_price FLOAT"))
                    if 'all_model_predictions' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN all_model_predictions JSON"))
                    if 'confidence_score' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN confidence_score FLOAT DEFAULT 0.88"))
                    if 'shap_values' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN shap_values JSON"))
                    if 'pricing_rules_explanation' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN pricing_rules_explanation TEXT"))
                    if 'is_stale_data_warning' not in rec_cols:
                        conn.execute(text("ALTER TABLE pricing_recommendations ADD COLUMN is_stale_data_warning BOOLEAN DEFAULT 0"))
            except Exception as e:
                logger.debug(f"PricingRecommendation table migration check: {e}")

            # Check demand_predictions columns
            try:
                res = conn.execute(text("PRAGMA table_info(demand_predictions)")).fetchall()
                pred_cols = [row[1] for row in res]
                if pred_cols:
                    if 'predicted_price' not in pred_cols:
                        conn.execute(text("ALTER TABLE demand_predictions ADD COLUMN predicted_price FLOAT"))
                    if 'all_model_prices' not in pred_cols:
                        conn.execute(text("ALTER TABLE demand_predictions ADD COLUMN all_model_prices JSON"))
            except Exception as e:
                logger.debug(f"DemandPrediction table migration check: {e}")

            conn.commit()
    except Exception as e:
        logger.debug(f"Database schema patch error: {e}")

    logger.info("Database initialized successfully.")
