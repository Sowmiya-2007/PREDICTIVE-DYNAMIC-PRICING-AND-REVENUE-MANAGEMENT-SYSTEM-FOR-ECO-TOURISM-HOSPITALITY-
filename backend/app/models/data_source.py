import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.database import Base

class DataSourceStatus(Base):
    __tablename__ = 'data_source_status'

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String(100), nullable=False, unique=True, index=True)
    source_name = Column(String(150), nullable=False)
    source_type = Column(String(50), nullable=False)  # 'weather_api', 'event_api', 'event_scraper', 'pms_bookings'
    source_url = Column(String(255), nullable=True)
    last_fetch_attempt = Column(DateTime, nullable=True)
    last_successful_refresh = Column(DateTime, nullable=True)
    latest_data_timestamp = Column(String(100), nullable=True)
    fetch_status = Column(String(50), nullable=False, default='unconfigured')  # 'healthy', 'fresh', 'stale', 'failed', 'unconfigured'
    records_collected = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    refresh_interval_minutes = Column(Integer, default=60)
    is_live = Column(Boolean, default=True)
    is_configured = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def is_stale(self) -> bool:
        """Check if source data has exceeded the refresh interval."""
        if not self.last_successful_refresh:
            return True
        elapsed = datetime.datetime.utcnow() - self.last_successful_refresh
        return elapsed.total_seconds() > (self.refresh_interval_minutes * 60)

    def to_dict(self):
        stale = self.is_stale()
        computed_status = self.fetch_status
        if self.fetch_status in ['healthy', 'fresh'] and stale:
            computed_status = 'stale'

        return {
            'id': self.id,
            'source_id': self.source_id,
            'source_name': self.source_name,
            'source_type': self.source_type,
            'source_url': self.source_url,
            'last_fetch_attempt': self.last_fetch_attempt.isoformat() if self.last_fetch_attempt else None,
            'last_successful_refresh': self.last_successful_refresh.isoformat() if self.last_successful_refresh else None,
            'latest_data_timestamp': self.latest_data_timestamp,
            'fetch_status': computed_status,
            'is_stale': stale,
            'records_collected': self.records_collected,
            'error_message': self.error_message,
            'refresh_interval_minutes': self.refresh_interval_minutes,
            'is_live': self.is_live,
            'is_configured': self.is_configured,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
