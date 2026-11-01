import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "eco-tourism-secret-key-change-in-production-2026!")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///ecotourism_pricing.db")
    
    # ML & Paths
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    MODEL_DIR = os.path.join(BASE_DIR, "app", "ml", "saved_models")
    DATA_DIR = os.path.join(BASE_DIR, "..", "data")
    
    # Scraping & External APIs
    SCRAPING_TIMEOUT_SECONDS = int(os.getenv("SCRAPING_TIMEOUT_SECONDS", 10))
    USER_AGENT = os.getenv("USER_AGENT", "EcoTourismEventCollector/1.0 (+http://localhost:5000)")
    NAGER_DATE_BASE_URL = os.getenv("NAGER_DATE_BASE_URL", "https://date.nager.at/api/v3/PublicHolidays")
    OVERPASS_API_URL = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
    KARNATAKA_TOURISM_URL = os.getenv("KARNATAKA_TOURISM_URL", "https://karnatakatourism.org/en/events/")
    KODAGU_TOURISM_URL = os.getenv("KODAGU_TOURISM_URL", "https://kodagu.nic.in/en/tourism/")
    KODAGU_CULTURE_URL = os.getenv("KODAGU_CULTURE_URL", "https://kodagu.nic.in/en/tourism/culture-heritage/")
    OPEN_METEO_BASE_URL = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
    OPEN_METEO_ARCHIVE_URL = os.getenv("OPEN_METEO_ARCHIVE_URL", "https://archive-api.open-meteo.com/v1/archive")
    LIVE_DATA_REFRESH_INTERVAL_MINUTES = int(os.getenv("LIVE_DATA_REFRESH_INTERVAL_MINUTES", 60))
    
    # Dynamic Pricing Engine Constraints
    MAX_PRICE_CHANGE_PCT = float(os.getenv("MAX_PRICE_CHANGE_PCT", 30.0))
    ENABLE_AUTO_PUBLIC_PRICING = os.getenv("ENABLE_AUTO_PUBLIC_PRICING", "false").lower() == "true"
    DEFAULT_PREDICTION_MODEL = os.getenv("DEFAULT_PREDICTION_MODEL", "best") # 'best', 'random_forest', 'xgboost', 'linear_regression'
    
    # Server
    PORT = int(os.getenv("PORT", 5000))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
