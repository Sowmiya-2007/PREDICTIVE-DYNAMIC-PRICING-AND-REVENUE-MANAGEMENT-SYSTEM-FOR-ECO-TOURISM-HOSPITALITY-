import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class PricingRecommendation(Base):
    __tablename__ = 'pricing_recommendations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='CASCADE'), nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey('room_types.id', ondelete='CASCADE'), nullable=False, index=True)
    target_date = Column(Date, nullable=False, index=True)
    
    current_price = Column(Float, nullable=False)
    model_predicted_price = Column(Float, nullable=True) # Direct price predicted by selected ML model
    all_model_predictions = Column(JSON, nullable=True) # {'linear_regression': price, 'random_forest': price, 'xgboost': price}
    recommended_price = Column(Float, nullable=False)
    absolute_diff = Column(Float, nullable=False)
    percent_diff = Column(Float, nullable=False)
    
    predicted_demand = Column(Float, nullable=False)
    predicted_occupancy = Column(Float, nullable=False)
    demand_multiplier = Column(Float, default=1.0)
    event_impact_factor = Column(Float, default=1.0)
    seasonal_factor = Column(Float, default=1.0)
    
    rationale = Column(Text, nullable=False)
    pricing_rules_explanation = Column(Text, nullable=True)
    min_price_enforced = Column(Boolean, default=False)
    max_price_enforced = Column(Boolean, default=False)
    
    model_version = Column(String(50), default='v1.0')
    selected_model_name = Column(String(50), default='RandomForestRegressor')
    confidence_score = Column(Float, default=0.88)
    shap_values = Column(JSON, nullable=True)
    is_stale_data_warning = Column(Boolean, default=False)

    status = Column(String(50), nullable=False, default='pending')  # 'pending', 'approved', 'rejected', 'applied'
    reviewed_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    override_price = Column(Float, nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    property = relationship("Property", back_populates="recommendations")
    room_type = relationship("RoomType")
    reviewed_by = relationship("User")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_name': self.property.name if self.property else None,
            'room_type_id': self.room_type_id,
            'room_type_name': self.room_type.name if self.room_type else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'current_price': round(self.current_price, 2),
            'model_predicted_price': round(self.model_predicted_price, 2) if self.model_predicted_price is not None else round(self.recommended_price, 2),
            'predicted_price': round(self.model_predicted_price, 2) if self.model_predicted_price is not None else round(self.recommended_price, 2),
            'all_model_predictions': self.all_model_predictions,
            'recommended_price': round(self.recommended_price, 2),
            'absolute_diff': round(self.absolute_diff, 2),
            'percent_diff': round(self.percent_diff, 2),
            'predicted_demand': round(self.predicted_demand, 1),
            'predicted_occupancy': round(self.predicted_occupancy, 1),
            'demand_multiplier': round(self.demand_multiplier, 3),
            'event_impact_factor': round(self.event_impact_factor, 3),
            'seasonal_factor': round(self.seasonal_factor, 3),
            'rationale': self.rationale,
            'pricing_rules_explanation': self.pricing_rules_explanation,
            'min_price_enforced': self.min_price_enforced,
            'max_price_enforced': self.max_price_enforced,
            'model_version': self.model_version,
            'selected_model_name': self.selected_model_name,
            'confidence_score': round(self.confidence_score, 2) if self.confidence_score is not None else 0.88,
            'shap_values': self.shap_values,
            'is_stale_data_warning': self.is_stale_data_warning,
            'status': self.status,
            'reviewed_by_id': self.reviewed_by_id,
            'reviewer_name': self.reviewed_by.full_name if self.reviewed_by else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'override_price': self.override_price,
            'rejection_reason': self.rejection_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PriceHistory(Base):
    __tablename__ = 'price_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='CASCADE'), nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey('room_types.id', ondelete='CASCADE'), nullable=False, index=True)
    date_applied = Column(Date, nullable=False, index=True)
    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    change_type = Column(String(50), nullable=False, default='recommendation_applied') # 'recommendation_applied', 'manual_override', 'base_rate_reset'
    recommendation_id = Column(Integer, ForeignKey('pricing_recommendations.id', ondelete='SET NULL'), nullable=True)
    changed_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    property = relationship("Property")
    room_type = relationship("RoomType")
    changed_by = relationship("User")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_name': self.property.name if self.property else None,
            'room_type_id': self.room_type_id,
            'room_type_name': self.room_type.name if self.room_type else None,
            'date_applied': self.date_applied.isoformat() if self.date_applied else None,
            'old_price': round(self.old_price, 2),
            'new_price': round(self.new_price, 2),
            'change_type': self.change_type,
            'recommendation_id': self.recommendation_id,
            'changed_by_id': self.changed_by_id,
            'changed_by_name': self.changed_by.full_name if self.changed_by else "System",
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
