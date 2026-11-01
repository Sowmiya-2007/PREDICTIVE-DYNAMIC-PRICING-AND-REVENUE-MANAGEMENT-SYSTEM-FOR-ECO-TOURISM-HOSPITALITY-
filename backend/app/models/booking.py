import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base

class Booking(Base):
    __tablename__ = 'bookings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_code = Column(String(50), unique=True, nullable=False, index=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='CASCADE'), nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey('room_types.id', ondelete='CASCADE'), nullable=False, index=True)
    guest_name = Column(String(120), nullable=False)
    guest_email = Column(String(120), nullable=False)
    check_in_date = Column(Date, nullable=False, index=True)
    check_out_date = Column(Date, nullable=False, index=True)
    num_guests = Column(Integer, nullable=False, default=2)
    rooms_booked = Column(Integer, nullable=False, default=1)
    price_per_night = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    special_requests = Column(String(255), nullable=True)
    booking_status = Column(String(50), nullable=False, default='confirmed')  # 'confirmed', 'completed', 'cancelled'
    lead_time_days = Column(Integer, default=7) # Days in advance booking was made
    booking_date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    property = relationship("Property", back_populates="bookings")
    room_type = relationship("RoomType")
    user = relationship("User")

    def to_dict(self):
        return {
            'id': self.id,
            'booking_code': self.booking_code,
            'property_id': self.property_id,
            'property_name': self.property.name if self.property else None,
            'room_type_id': self.room_type_id,
            'room_type_name': self.room_type.name if self.room_type else None,
            'user_id': self.user_id,
            'guest_name': self.guest_name,
            'guest_email': self.guest_email,
            'check_in_date': self.check_in_date.isoformat() if self.check_in_date else None,
            'check_out_date': self.check_out_date.isoformat() if self.check_out_date else None,
            'num_guests': self.num_guests,
            'rooms_booked': self.rooms_booked,
            'price_per_night': self.price_per_night,
            'total_price': self.total_price,
            'special_requests': self.special_requests,
            'booking_status': self.booking_status,
            'lead_time_days': self.lead_time_days,
            'booking_date': self.booking_date.isoformat() if self.booking_date else None
        }
