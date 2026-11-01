import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class TourismAttraction(Base):
    __tablename__ = 'tourism_attractions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='SET NULL'), nullable=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    category = Column(String(80), nullable=False, default='nature_destination') # 'waterfall', 'park', 'viewpoint', 'museum', 'nature_reserve', 'attraction'
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    source = Column(String(100), default='OpenStreetMap Overpass API')
    source_url = Column(String(255), nullable=True)
    osm_id = Column(String(80), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('property_id', 'name', name='uq_attraction_prop_name'),
    )

    property = relationship("Property")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_name': self.property.name if self.property else None,
            'name': self.name,
            'category': self.category,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'distance_km': round(self.distance_km, 2) if self.distance_km is not None else None,
            'source': self.source,
            'source_url': self.source_url,
            'osm_id': self.osm_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
