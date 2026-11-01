import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Property(Base):
    __tablename__ = 'properties'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    location = Column(String(150), nullable=False, index=True)  # e.g., 'Wayanad, Kerala'
    state_or_region = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    eco_category = Column(String(80), nullable=False, default='Forest Eco-Lodge') # 'Forest Eco-Lodge', 'Mountain Sanctuary', 'Mangrove Retreat', 'Organic Farm Homestay', 'Wildlife Reserve Camp'
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    base_price = Column(Float, nullable=False, default=3500.0)
    min_price = Column(Float, nullable=False, default=2000.0)
    max_price = Column(Float, nullable=False, default=9500.0)
    total_capacity = Column(Integer, nullable=False, default=20)
    sustainability_rating = Column(Float, default=4.8) # 1.0 to 5.0 eco score
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    room_types = relationship("RoomType", back_populates="property", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="property", cascade="all, delete-orphan")
    predictions = relationship("DemandPrediction", back_populates="property", cascade="all, delete-orphan")
    recommendations = relationship("PricingRecommendation", back_populates="property", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'state_or_region': self.state_or_region,
            'description': self.description,
            'eco_category': self.eco_category,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'base_price': self.base_price,
            'min_price': self.min_price,
            'max_price': self.max_price,
            'total_capacity': self.total_capacity,
            'sustainability_rating': self.sustainability_rating,
            'is_active': self.is_active,
            'room_types_count': len(self.room_types) if self.room_types else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class RoomType(Base):
    __tablename__ = 'room_types'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g., 'Canopy Treehouse', 'Bamboo Eco-Suite'
    description = Column(Text, nullable=True)
    capacity = Column(Integer, nullable=False, default=2)
    base_price = Column(Float, nullable=False, default=3500.0)
    min_price = Column(Float, nullable=False, default=2000.0)
    max_price = Column(Float, nullable=False, default=8500.0)
    total_rooms = Column(Integer, nullable=False, default=5)
    amenities = Column(String(255), default="Solar Powered, Rainforest View, Organic Toiletries, Rainwater Shower")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    property = relationship("Property", back_populates="room_types")
    inventory_records = relationship("RoomInventory", back_populates="room_type", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'name': self.name,
            'description': self.description,
            'capacity': self.capacity,
            'base_price': self.base_price,
            'min_price': self.min_price,
            'max_price': self.max_price,
            'total_rooms': self.total_rooms,
            'amenities': self.amenities,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RoomInventory(Base):
    __tablename__ = 'room_inventory'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='CASCADE'), nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey('room_types.id', ondelete='CASCADE'), nullable=False, index=True)
    inventory_date = Column(Date, nullable=False, index=True)
    total_rooms = Column(Integer, nullable=False, default=5)
    available_rooms = Column(Integer, nullable=False, default=5)
    booked_rooms = Column(Integer, nullable=False, default=0)
    current_price = Column(Float, nullable=False, default=3500.0)
    is_blocked = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('room_type_id', 'inventory_date', name='uq_roomtype_date'),
    )

    room_type = relationship("RoomType", back_populates="inventory_records")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'room_type_id': self.room_type_id,
            'inventory_date': self.inventory_date.isoformat() if self.inventory_date else None,
            'total_rooms': self.total_rooms,
            'available_rooms': self.available_rooms,
            'booked_rooms': self.booked_rooms,
            'current_price': self.current_price,
            'is_blocked': self.is_blocked,
            'occupancy_rate': round((self.booked_rooms / self.total_rooms) * 100, 1) if self.total_rooms > 0 else 0
        }
