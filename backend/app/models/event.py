import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, Float, ForeignKey
from app.database import Base

class ScrapingRun(Base):
    __tablename__ = 'scraping_runs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_name = Column(String(100), nullable=False)
    source_url = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default='success')  # 'success', 'failed', 'partial'
    events_collected = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'source_name': self.source_name,
            'source_url': self.source_url,
            'status': self.status,
            'events_collected': self.events_collected,
            'duration_seconds': self.duration_seconds,
            'error_message': self.error_message,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None
        }

class LocalEvent(Base):
    __tablename__ = 'local_events'

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    location = Column(String(150), nullable=False, index=True)
    event_category = Column(String(80), nullable=False, default='festival') # 'festival', 'cultural', 'nature_exhibition', 'eco_marathon', 'birdwatching_fest', 'harvest_fair'
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=True)
    expected_footfall = Column(Integer, default=1000)
    impact_intensity = Column(String(30), nullable=False, default='medium') # 'low', 'medium', 'high', 'peak'
    source_url = Column(String(255), nullable=True)
    source_name = Column(String(100), default='Local Tourism Portal')
    collection_method = Column(String(50), default='scraped') # 'scraped', 'manual', 'verified_feed'
    external_id = Column(String(100), nullable=True, index=True)
    status = Column(String(50), nullable=False, default='active') # 'active', 'cancelled', 'rescheduled'
    last_checked = Column(DateTime, default=datetime.datetime.utcnow)
    scraping_run_id = Column(Integer, ForeignKey('scraping_runs.id', ondelete='SET NULL'), nullable=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'location': self.location,
            'event_category': self.event_category,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'description': self.description,
            'expected_footfall': self.expected_footfall,
            'impact_intensity': self.impact_intensity,
            'source_url': self.source_url,
            'source_name': self.source_name,
            'collection_method': self.collection_method,
            'external_id': self.external_id,
            'status': self.status,
            'last_checked': self.last_checked.isoformat() if self.last_checked else None,
            'scraping_run_id': self.scraping_run_id,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

