from app.models.user import User
from app.models.property import Property, RoomType, RoomInventory
from app.models.booking import Booking
from app.models.event import LocalEvent, ScrapingRun
from app.models.prediction import DemandPrediction, ModelTrainingRun
from app.models.recommendation import PricingRecommendation, PriceHistory
from app.models.audit import AuditLog
from app.models.weather import WeatherObservation
from app.models.data_source import DataSourceStatus
from app.models.holiday import PublicHoliday
from app.models.attraction import TourismAttraction

__all__ = [
    'User',
    'Property',
    'RoomType',
    'RoomInventory',
    'Booking',
    'LocalEvent',
    'ScrapingRun',
    'DemandPrediction',
    'ModelTrainingRun',
    'PricingRecommendation',
    'PriceHistory',
    'AuditLog',
    'WeatherObservation',
    'DataSourceStatus',
    'PublicHoliday',
    'TourismAttraction'
]

