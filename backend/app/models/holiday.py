import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, UniqueConstraint
from app.database import Base

class PublicHoliday(Base):
    __tablename__ = 'public_holidays'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    local_name = Column(String(150), nullable=True)
    date = Column(Date, nullable=False, index=True)
    country_code = Column(String(10), nullable=False, default='IN')
    holiday_type = Column(String(50), nullable=False, default='Public')
    regional_scope = Column(String(100), nullable=True, default='National')
    source = Column(String(100), default='Nager.Date Public Holidays API')
    source_url = Column(String(255), nullable=True)
    fetch_time = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('date', 'name', name='uq_holiday_date_name'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'local_name': self.local_name,
            'date': self.date.isoformat() if self.date else None,
            'country_code': self.country_code,
            'holiday_type': self.holiday_type,
            'regional_scope': self.regional_scope,
            'source': self.source,
            'source_url': self.source_url,
            'fetch_time': self.fetch_time.isoformat() if self.fetch_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
