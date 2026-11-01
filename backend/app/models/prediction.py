import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class ModelTrainingRun(Base):
    __tablename__ = 'model_training_runs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False, default='EcoDemandForecaster')
    version = Column(String(50), nullable=False)
    algorithm = Column(String(100), nullable=False, default='RandomForestRegressor')
    training_records_count = Column(Integer, nullable=False, default=0)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    r2 = Column(Float, nullable=True)
    baseline_mae = Column(Float, nullable=False)
    baseline_rmse = Column(Float, nullable=False)
    features_list = Column(JSON, nullable=True)
    hyperparameters = Column(JSON, nullable=True)
    all_models_metrics = Column(JSON, nullable=True)  # Detailed comparison of Linear Regression, Random Forest, XGBoost
    best_model_name = Column(String(50), default='RandomForestRegressor')
    training_period_start = Column(Date, nullable=True)
    training_period_end = Column(Date, nullable=True)
    test_period_start = Column(Date, nullable=True)
    test_period_end = Column(Date, nullable=True)
    shap_summary = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    trained_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'model_name': self.model_name,
            'version': self.version,
            'algorithm': self.algorithm,
            'best_model_name': self.best_model_name,
            'training_records_count': self.training_records_count,
            'mae': round(self.mae, 3) if self.mae is not None else None,
            'rmse': round(self.rmse, 3) if self.rmse is not None else None,
            'r2': round(self.r2, 3) if self.r2 is not None else None,
            'baseline_mae': round(self.baseline_mae, 3) if self.baseline_mae is not None else None,
            'baseline_rmse': round(self.baseline_rmse, 3) if self.baseline_rmse is not None else None,
            'features_list': self.features_list,
            'hyperparameters': self.hyperparameters,
            'all_models_metrics': self.all_models_metrics,
            'training_period_start': self.training_period_start.isoformat() if self.training_period_start else None,
            'training_period_end': self.training_period_end.isoformat() if self.training_period_end else None,
            'test_period_start': self.test_period_start.isoformat() if self.test_period_start else None,
            'test_period_end': self.test_period_end.isoformat() if self.test_period_end else None,
            'shap_summary': self.shap_summary,
            'is_active': self.is_active,
            'trained_at': self.trained_at.isoformat() if self.trained_at else None
        }


class DemandPrediction(Base):
    __tablename__ = 'demand_predictions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey('properties.id', ondelete='CASCADE'), nullable=False, index=True)
    room_type_id = Column(Integer, ForeignKey('room_types.id', ondelete='CASCADE'), nullable=True)
    target_date = Column(Date, nullable=False, index=True)
    predicted_demand = Column(Float, nullable=False)  # predicted bookings or occupancy count
    predicted_occupancy_rate = Column(Float, nullable=False) # 0 to 100%
    predicted_price = Column(Float, nullable=True) # direct room price in ₹
    all_model_prices = Column(JSON, nullable=True) # {'linear_regression': price, 'random_forest': price, 'xgboost': price}
    confidence_score = Column(Float, default=0.88)
    actual_demand = Column(Float, nullable=True) # filled later for evaluation comparison
    actual_occupancy_rate = Column(Float, nullable=True)
    influencing_factors = Column(JSON, nullable=True) # event intensity, day of week, season, etc.
    model_version = Column(String(50), default='v1.0-rf')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    property = relationship("Property", back_populates="predictions")
    room_type = relationship("RoomType")

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_name': self.property.name if self.property else None,
            'room_type_id': self.room_type_id,
            'room_type_name': self.room_type.name if self.room_type else "All Rooms",
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'predicted_demand': round(self.predicted_demand, 1),
            'predicted_occupancy_rate': round(self.predicted_occupancy_rate, 1),
            'predicted_price': round(self.predicted_price, 2) if self.predicted_price is not None else None,
            'all_model_prices': self.all_model_prices,
            'confidence_score': round(self.confidence_score, 2),
            'actual_demand': self.actual_demand,
            'actual_occupancy_rate': self.actual_occupancy_rate,
            'influencing_factors': self.influencing_factors,
            'model_version': self.model_version,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
