import numpy as np
from app.ml.demand_model import global_demand_model

def test_demand_model_prediction():
    # 15 features matching model schema
    dummy_features = np.array([[5, 1, 10, 2, 1.2, 1, 1, 2.0, 2.0, 1, 4000.0, 14, 4.8, 10, 50.0]], dtype=np.float32)
    feature_dict = {'total_rooms': 10, 'is_weekend': 1, 'has_event': 1, 'event_intensity_score': 2.0, 'seasonal_demand_weight': 1.2}

    pred_occ, pred_rooms, conf = global_demand_model.predict(dummy_features, feature_dict)
    assert 15.0 <= pred_occ <= 98.0
    assert 1.0 <= pred_rooms <= 10.0
    assert conf > 0.7
