import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class WeatherObservation(Base):
    __tablename__ = 'weather_observations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='SET NULL'), nullable=True, index=True)
    location = Column(String(150), nullable=False, index=True)
    state_or_region = Column(String(100), nullable=True)
    date = Column(Date, nullable=False, index=True)
    temp_c = Column(Float, nullable=False, default=24.0)
    rainfall_mm = Column(Float, nullable=False, default=0.0)
    humidity_pct = Column(Integer, nullable=False, default=65)
    weather_condition = Column(String(100), nullable=False, default='Clear & Sunny')
    weather_code = Column(Integer, nullable=True)
    eco_suitability_score = Column(Float, nullable=False, default=0.85)
    source = Column(String(100), default='Open-Meteo Live API')
    source_url = Column(String(255), nullable=True)
    data_type = Column(String(50), nullable=False, default='observation')  # 'observation', 'forecast', 'historical'
    observation_time = Column(String(50), nullable=True)  # Provider observation/forecast timestamp
    fetch_time = Column(DateTime, default=datetime.datetime.utcnow)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('location', 'date', name='uq_weather_loc_date'),
    )

    property = relationship("Property")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_name': self.property.name if self.property else None,
            'location': self.location,
            'state_or_region': self.state_or_region,
            'date': self.date.isoformat() if self.date else None,
            'temp_c': self.temp_c,
            'rainfall_mm': self.rainfall_mm,
            'humidity_pct': self.humidity_pct,
            'weather_condition': self.weather_condition,
            'weather_code': self.weather_code,
            'eco_suitability_score': self.eco_suitability_score,
            'source': self.source,
            'source_url': self.source_url,
            'data_type': self.data_type,
            'observation_time': self.observation_time,
            'fetch_time': self.fetch_time.isoformat() if self.fetch_time else None,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

