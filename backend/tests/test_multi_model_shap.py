import pytest
from app.ml.train_pipeline import run_model_training
from app.ml.multi_model import global_multi_model

def test_multi_model_training_and_comparison():
    # Run the full training pipeline across all three models
    results = run_model_training()
    
    assert "best_model" in results
    assert results["best_model"] in ["linear_regression", "random_forest", "xgboost"]
    assert "all_models" in results
    
    models = results["all_models"]
    assert "linear_regression" in models
    assert "random_forest" in models
    assert "xgboost" in models
    
    for name in ["linear_regression", "random_forest", "xgboost"]:
        metrics = models[name]
        assert "mae" in metrics
        assert "rmse" in metrics
        assert "r2" in metrics
        assert metrics["mae"] >= 0
        assert metrics["rmse"] >= 0
        assert isinstance(metrics["r2"], float)
        assert "error_reduction_pct" in metrics
        
    assert "global_shap_importances" in results
    assert len(results["global_shap_importances"]) > 0

def test_multi_model_prediction_and_shap_explainability():
    test_features = {
        'base_price': 5200.0,
        'room_category_code': 1,
        'lead_time_days': 7,
        'current_occupancy_pct': 60.0,
        'day_of_week': 5,
        'is_weekend': 1,
        'month': 11,
        'season_index': 3,
        'seasonal_demand_weight': 1.35,
        'is_holiday': 1,
        'has_event': 1,
        'event_count': 2,
        'max_event_intensity': 3.0,
        'event_intensity_score': 2.5,
        'event_category_code': 1,
        'temp_c': 24.5,
        'rainfall_mm': 2.0,
        'eco_suitability_score': 0.88,
        'competitor_price': 5460.0
    }
    
    # 1. Test direct room-price prediction with default (best) model
    selected_price, all_model_prices, confidence, model_used = global_multi_model.predict(test_features)
    assert 2500.0 <= selected_price <= 10000.0
    assert "linear_regression" in all_model_prices
    assert "random_forest" in all_model_prices
    assert "xgboost" in all_model_prices
    assert 0.70 <= confidence <= 1.0
    assert model_used in ["linear_regression", "random_forest", "xgboost"]
    
    # 2. Test direct room-price predictions and SHAP explainability for all 3 models
    for model_name in ["linear_regression", "random_forest", "xgboost"]:
        m_price, all_prices, conf, m_key = global_multi_model.predict(test_features, model_name=model_name)
        assert m_key == model_name
        assert 2500.0 <= m_price <= 10000.0
        
        explanation = global_multi_model.explain_prediction(test_features, model_name=model_name)
        assert explanation["model_name"] == model_name
        assert explanation["currency"] == "₹"
        assert "base_value" in explanation
        assert 2000.0 <= explanation["base_value"] <= 8000.0
        assert "predicted_value" in explanation
        assert 2000.0 <= explanation["predicted_value"] <= 10000.0
        assert "disclaimer" in explanation
        assert "SHAP describes statistical model contributions" in explanation["disclaimer"]
        
        # Verify SHAP feature contributions in Rupees
        assert "feature_contributions" in explanation
        assert len(explanation["feature_contributions"]) == len(global_multi_model.feature_names)
        
        for item in explanation["feature_contributions"]:
            assert "feature" in item
            assert "shap_value" in item
            assert "actual_value" in item
            assert isinstance(item["shap_value"], (float, int))
            assert item["direction"] in ["positive", "negative"]

def test_global_shap_importance():
    importances = global_multi_model.global_shap_importances
    assert isinstance(importances, dict)
    assert len(importances) > 0
    for model_name, feature_list in importances.items():
        assert len(feature_list) > 0
        for item in feature_list:
            assert "feature" in item
            assert "importance" in item
            assert item["importance"] >= 0.0
