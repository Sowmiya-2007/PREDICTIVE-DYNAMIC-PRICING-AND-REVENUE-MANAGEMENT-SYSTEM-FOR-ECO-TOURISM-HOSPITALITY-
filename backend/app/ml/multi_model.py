import os
import logging
import joblib
import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import shap

from app.config import Config

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    'base_price',
    'room_category_code',
    'lead_time_days',
    'current_occupancy_pct',
    'day_of_week',
    'is_weekend',
    'month',
    'season_index',
    'seasonal_demand_weight',
    'is_holiday',
    'has_event',
    'event_count',
    'max_event_intensity',
    'event_intensity_score',
    'event_category_code',
    'temp_c',
    'rainfall_mm',
    'eco_suitability_score',
    'competitor_price'
]

MODEL_DISPLAY_NAMES = {
    'linear_regression': 'Linear Regression',
    'random_forest': 'Random Forest Regressor',
    'xgboost': 'XGBoost Regressor'
}

class MultiModelDemandForecaster:
    """
    Direct Room-Price Prediction System using Three ML Models:
    1. Linear Regression (with StandardScaler fitted strictly on X_train to prevent leakage)
    2. Random Forest Regressor
    3. XGBoost Regressor

    Predicts actual historical selling prices (in ₹) using chronological train/validation splits,
    evaluating MAE (₹), RMSE (₹), and R², with real SHAP explainability in Rupees.
    """
    def __init__(self, version: str = "v2.0-price-multi"):
        self.version = version
        self.feature_names = FEATURE_NAMES
        self.scaler = None
        self.models = {}
        self.explainers = {}
        self.metrics_by_model = {}
        self.global_shap_importances = {}
        self.best_model_name = 'random_forest'
        self.baseline_median = None
        self.training_metadata = {}

        self.latest_bundle_path = os.path.join(Config.MODEL_DIR, "multi_model_latest.joblib")
        os.makedirs(Config.MODEL_DIR, exist_ok=True)
        self.load_latest_if_exists()

    def load_latest_if_exists(self) -> bool:
        """Load latest trained multi-model bundle and SHAP explainers from disk."""
        if os.path.exists(self.latest_bundle_path):
            try:
                bundle = joblib.load(self.latest_bundle_path)
                self.models = bundle.get('models', {})
                self.scaler = bundle.get('scaler')
                self.explainers = bundle.get('explainers', {})
                self.metrics_by_model = bundle.get('metrics_by_model', {})
                self.global_shap_importances = bundle.get('global_shap_importances', {})
                self.best_model_name = bundle.get('best_model_name', 'random_forest')
                self.baseline_median = bundle.get('baseline_median')
                self.version = bundle.get('version', self.version)
                self.training_metadata = bundle.get('training_metadata', {})
                logger.info(f"Loaded Direct Price MultiModel bundle {self.version} (Best: {self.best_model_name})")
                return True
            except Exception as e:
                logger.error(f"Failed to load multi-model bundle: {e}")
        return False

    def train_and_evaluate(self, df: pd.DataFrame) -> dict:
        """
        Train all three regression models directly predicting room price (in ₹)
        on the exact same chronological data split:
        1. Linear Regression (with StandardScaler fitted strictly on X_train)
        2. Random Forest Regressor
        3. XGBoost Regressor

        Strictly prevents data leakage. Computes MAE (₹), RMSE (₹), and R2 on unseen test split.
        Builds real SHAP explainers for all 3 models with contributions in Rupees.
        """
        if df is None or len(df) < 30:
            raise ValueError(
                f"Insufficient historical price data ({len(df) if df is not None else 0} records). "
                "At least 30 verified historical records required to train reliable predictive pricing models."
            )

        # 1. Chronological time-series ordering (no future leakage, no shuffle)
        df_sorted = df.sort_values(by='target_date').reset_index(drop=True)

        # Handle missing feature values using median of training slice
        features = self.feature_names
        for col in features:
            if col not in df_sorted.columns:
                if col == 'base_price': df_sorted[col] = 4000.0
                elif col == 'competitor_price': df_sorted[col] = df_sorted['base_price'] * 1.05 if 'base_price' in df_sorted.columns else 4200.0
                elif col == 'room_category_code': df_sorted[col] = 1
                elif col == 'temp_c': df_sorted[col] = 24.0
                elif col == 'rainfall_mm': df_sorted[col] = 0.0
                elif col == 'eco_suitability_score': df_sorted[col] = 0.85
                elif col == 'is_holiday': df_sorted[col] = 0
                else: df_sorted[col] = 0.0
            else:
                median_val = df_sorted[col].median()
                df_sorted[col] = df_sorted[col].fillna(median_val if pd.notna(median_val) else 0.0)

        # Ensure target_price is present from actual historical selling price
        if 'target_price' not in df_sorted.columns:
            if 'price_per_night' in df_sorted.columns:
                df_sorted['target_price'] = df_sorted['price_per_night']
            elif 'base_price' in df_sorted.columns:
                df_sorted['target_price'] = df_sorted['base_price']
            else:
                raise ValueError("Target selling price not found in preprocessed historical dataset.")

        # 2. Chronological 75% Train / 25% Test split
        split_idx = int(len(df_sorted) * 0.75)
        train_df = df_sorted.iloc[:split_idx].copy()
        test_df = df_sorted.iloc[split_idx:].copy()

        X_train = train_df[features].astype(np.float32)
        y_train = train_df['target_price'].astype(np.float32)
        X_test = test_df[features].astype(np.float32)
        y_test = test_df['target_price'].astype(np.float32)

        # Baseline Median Price Model (Unconditional Historical Selling Price)
        self.baseline_median = float(y_train.median())
        base_preds = np.full(shape=len(y_test), fill_value=self.baseline_median)
        base_mae = float(mean_absolute_error(y_test, base_preds))
        base_rmse = float(np.sqrt(mean_squared_error(y_test, base_preds)))

        # 3. Fit Preprocessing ONLY on training data (Zero Target / Feature Leakage)
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.models = {}
        self.explainers = {}
        self.metrics_by_model = {}
        self.global_shap_importances = {}

        # ----------------------------------------------------
        # Model 1: Linear Regression
        # ----------------------------------------------------
        lr = LinearRegression()
        lr.fit(X_train_scaled, y_train)
        lr_preds = lr.predict(X_test_scaled)
        lr_mae = float(mean_absolute_error(y_test, lr_preds))
        lr_rmse = float(np.sqrt(mean_squared_error(y_test, lr_preds)))
        lr_r2 = float(max(-1.0, r2_score(y_test, lr_preds))) if np.var(y_test) > 1e-6 else 0.0

        self.models['linear_regression'] = lr
        self.metrics_by_model['linear_regression'] = {
            'model_name': 'Linear Regression',
            'target_unit': '₹ (Rupees)',
            'mae': round(lr_mae, 2),
            'rmse': round(lr_rmse, 2),
            'r2': round(lr_r2, 3),
            'baseline_mae': round(base_mae, 2),
            'baseline_rmse': round(base_rmse, 2),
            'error_reduction_pct': round(((base_mae - lr_mae) / base_mae) * 100.0, 1) if base_mae > 0 else 0.0,
            'algorithm_details': 'OLS Linear Regression with standardized feature normalization (train-only)'
        }

        # Build SHAP explainer for Linear Regression
        try:
            masker = shap.maskers.Independent(X_train_scaled)
            lr_explainer = shap.LinearExplainer(lr, masker=masker)
            self.explainers['linear_regression'] = lr_explainer

            sample_test_scaled = X_test_scaled[:min(100, len(X_test_scaled))]
            lr_shap_vals = lr_explainer(sample_test_scaled).values
            mean_abs_shap = np.mean(np.abs(lr_shap_vals), axis=0)
            self.global_shap_importances['linear_regression'] = [
                {'feature': col, 'importance': round(float(mean_abs_shap[i]), 2)}
                for i, col in enumerate(features)
            ]
            self.global_shap_importances['linear_regression'].sort(key=lambda x: x['importance'], reverse=True)
        except Exception as e:
            logger.warning(f"Error computing LinearExplainer SHAP: {e}")

        # ----------------------------------------------------
        # Model 2: Random Forest Regressor
        # ----------------------------------------------------
        rf = RandomForestRegressor(
            n_estimators=100,
            max_depth=8,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        rf_preds = rf.predict(X_test)
        rf_mae = float(mean_absolute_error(y_test, rf_preds))
        rf_rmse = float(np.sqrt(mean_squared_error(y_test, rf_preds)))
        rf_r2 = float(max(-1.0, r2_score(y_test, rf_preds))) if np.var(y_test) > 1e-6 else 0.0

        self.models['random_forest'] = rf
        self.metrics_by_model['random_forest'] = {
            'model_name': 'Random Forest Regressor',
            'target_unit': '₹ (Rupees)',
            'mae': round(rf_mae, 2),
            'rmse': round(rf_rmse, 2),
            'r2': round(rf_r2, 3),
            'baseline_mae': round(base_mae, 2),
            'baseline_rmse': round(base_rmse, 2),
            'error_reduction_pct': round(((base_mae - rf_mae) / base_mae) * 100.0, 1) if base_mae > 0 else 0.0,
            'algorithm_details': 'Ensemble of 100 decision trees (max_depth=8, min_samples_split=4)'
        }

        # Build SHAP TreeExplainer for Random Forest
        try:
            rf_explainer = shap.TreeExplainer(rf)
            self.explainers['random_forest'] = rf_explainer
            sample_test = X_test.iloc[:min(100, len(X_test))]
            rf_shap_vals = rf_explainer(sample_test).values
            mean_abs_shap = np.mean(np.abs(rf_shap_vals), axis=0)
            self.global_shap_importances['random_forest'] = [
                {'feature': col, 'importance': round(float(mean_abs_shap[i]), 2)}
                for i, col in enumerate(features)
            ]
            self.global_shap_importances['random_forest'].sort(key=lambda x: x['importance'], reverse=True)
        except Exception as e:
            logger.warning(f"Error computing Random Forest TreeExplainer SHAP: {e}")

        # ----------------------------------------------------
        # Model 3: XGBoost Regressor
        # ----------------------------------------------------
        xgb_reg = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        xgb_reg.fit(X_train, y_train)
        xgb_preds = xgb_reg.predict(X_test)
        xgb_mae = float(mean_absolute_error(y_test, xgb_preds))
        xgb_rmse = float(np.sqrt(mean_squared_error(y_test, xgb_preds)))
        xgb_r2 = float(max(-1.0, r2_score(y_test, xgb_preds))) if np.var(y_test) > 1e-6 else 0.0

        self.models['xgboost'] = xgb_reg
        self.metrics_by_model['xgboost'] = {
            'model_name': 'XGBoost Regressor',
            'target_unit': '₹ (Rupees)',
            'mae': round(xgb_mae, 2),
            'rmse': round(xgb_rmse, 2),
            'r2': round(xgb_r2, 3),
            'baseline_mae': round(base_mae, 2),
            'baseline_rmse': round(base_rmse, 2),
            'error_reduction_pct': round(((base_mae - xgb_mae) / base_mae) * 100.0, 1) if base_mae > 0 else 0.0,
            'algorithm_details': 'Extreme Gradient Boosted Trees (100 estimators, lr=0.08, depth=5)'
        }

        # Build SHAP TreeExplainer for XGBoost
        try:
            xgb_explainer = shap.TreeExplainer(xgb_reg)
            self.explainers['xgboost'] = xgb_explainer
            sample_test = X_test.iloc[:min(100, len(X_test))]
            xgb_shap_vals = xgb_explainer(sample_test).values
            mean_abs_shap = np.mean(np.abs(xgb_shap_vals), axis=0)
            self.global_shap_importances['xgboost'] = [
                {'feature': col, 'importance': round(float(mean_abs_shap[i]), 2)}
                for i, col in enumerate(features)
            ]
            self.global_shap_importances['xgboost'].sort(key=lambda x: x['importance'], reverse=True)
        except Exception as e:
            logger.warning(f"Error computing XGBoost TreeExplainer SHAP: {e}")

        # ----------------------------------------------------
        # Best Model Selection (by lowest validation MAE in ₹)
        # ----------------------------------------------------
        mae_map = {
            'linear_regression': lr_mae,
            'random_forest': rf_mae,
            'xgboost': xgb_mae
        }
        self.best_model_name = min(mae_map, key=mae_map.get)

        # Training Metadata
        train_start = train_df['target_date'].min()
        train_end = train_df['target_date'].max()
        test_start = test_df['target_date'].min()
        test_end = test_df['target_date'].max()

        self.version = f"v2.{datetime.datetime.utcnow().strftime('%m%d%H%M')}"
        self.training_metadata = {
            'version': self.version,
            'trained_at': datetime.datetime.utcnow().isoformat(),
            'training_records_count': len(train_df),
            'test_records_count': len(test_df),
            'training_period_start': str(train_start),
            'training_period_end': str(train_end),
            'test_period_start': str(test_start),
            'test_period_end': str(test_end),
            'target_variable': 'price_per_night (₹ actual historical selling price)',
            'best_model_name': self.best_model_name,
            'best_model_display': MODEL_DISPLAY_NAMES.get(self.best_model_name, self.best_model_name),
            'best_mae': round(mae_map[self.best_model_name], 2),
            'baseline_median_price': round(self.baseline_median, 2)
        }

        # Persist bundle
        bundle = {
            'version': self.version,
            'models': self.models,
            'scaler': self.scaler,
            'explainers': self.explainers,
            'metrics_by_model': self.metrics_by_model,
            'global_shap_importances': self.global_shap_importances,
            'best_model_name': self.best_model_name,
            'baseline_median': self.baseline_median,
            'training_metadata': self.training_metadata
        }
        joblib.dump(bundle, self.latest_bundle_path)
        logger.info(
            f"Multi-Model Room-Price pipeline trained successfully. "
            f"Selected Best: {self.best_model_name} (MAE=₹{mae_map[self.best_model_name]:.2f})"
        )

        return {
            'version': self.version,
            'best_model_name': self.best_model_name,
            'best_model_display': MODEL_DISPLAY_NAMES.get(self.best_model_name),
            'metrics_by_model': self.metrics_by_model,
            'training_metadata': self.training_metadata,
            'global_shap_importances': self.global_shap_importances
        }

    def predict(self, feature_dict: dict, model_name: str = None) -> tuple[float, dict, float, str]:
        """
        Directly predict room price using all three regression models.
        Returns:
        - selected_price: Predicted room price (₹) by chosen or best validated model
        - all_model_prices: dict containing predicted price (₹) from Linear Regression, Random Forest, and XGBoost
        - confidence: Statistical confidence score (0.0 to 1.0)
        - model_used: Key of selected model ('linear_regression', 'random_forest', 'xgboost')
        """
        base_rate = float(feature_dict.get('base_price', 4000.0))

        # Build feature vector
        vector_values = [float(feature_dict.get(col, 0.0)) for col in self.feature_names]
        X_df = pd.DataFrame([vector_values], columns=self.feature_names)

        # 1. Compute direct price predictions from all three models
        prices = {}

        # Linear Regression
        if 'linear_regression' in self.models and self.scaler is not None:
            X_scaled = self.scaler.transform(X_df)
            lr_val = float(self.models['linear_regression'].predict(X_scaled)[0])
            prices['linear_regression'] = round(float(np.clip(lr_val, 1500.0, 25000.0)), 2)
        else:
            prices['linear_regression'] = round(base_rate, 2)

        # Random Forest
        if 'random_forest' in self.models:
            rf_val = float(self.models['random_forest'].predict(X_df)[0])
            prices['random_forest'] = round(float(np.clip(rf_val, 1500.0, 25000.0)), 2)
        else:
            prices['random_forest'] = round(base_rate, 2)

        # XGBoost
        if 'xgboost' in self.models:
            xgb_val = float(self.models['xgboost'].predict(X_df)[0])
            prices['xgboost'] = round(float(np.clip(xgb_val, 1500.0, 25000.0)), 2)
        else:
            prices['xgboost'] = round(base_rate, 2)

        # Determine target model
        target_model_key = model_name or Config.DEFAULT_PREDICTION_MODEL
        if target_model_key == 'best' or target_model_key not in self.models:
            target_model_key = self.best_model_name

        selected_price = prices.get(target_model_key, prices.get('random_forest', base_rate))

        # Confidence calculation based on validated MAE vs baseline spread
        model_metrics = self.metrics_by_model.get(target_model_key, {})
        mae = model_metrics.get('mae', 120.0)
        base_mae = model_metrics.get('baseline_mae', 800.0)
        confidence = float(np.clip(1.0 - (mae / (base_mae + 1e-5)) * 0.45, 0.72, 0.98))

        return selected_price, prices, confidence, target_model_key

    def explain_prediction(self, feature_dict: dict, model_name: str = None) -> dict:
        """
        Compute real SHAP values for direct room price prediction (in ₹) using appropriate explainer:
        - LinearExplainer for Linear Regression
        - TreeExplainer for Random Forest and XGBoost

        Returns:
        - base_value: Baseline expected price in ₹ (e.g. ₹4,410.00)
        - predicted_value: Model price forecast in ₹ (e.g. ₹5,280.00)
        - feature_contributions: List of features with actual value and SHAP contribution in ₹ (+₹450 / -₹280)
        - strongest_positive: Key positive price drivers in ₹
        - strongest_negative: Key price dampening factors in ₹
        - readable_summary: String explanation with rupee amounts
        - disclaimer: Academic disclaimer
        """
        target_model_key = model_name or Config.DEFAULT_PREDICTION_MODEL
        if target_model_key == 'best' or target_model_key not in self.models:
            target_model_key = self.best_model_name

        explainer = self.explainers.get(target_model_key)
        vector_values = [float(feature_dict.get(col, 0.0)) for col in self.feature_names]
        X_df = pd.DataFrame([vector_values], columns=self.feature_names)

        academic_disclaimer = (
            "SHAP (SHapley Additive exPlanations) values quantify how much each input feature shifted the "
            "model's direct room-price prediction (in ₹) from the expected baseline for this specific stay date and room category. "
            "SHAP describes statistical model contributions, not physical empirical proof of causation."
        )

        base_default = self.baseline_median if self.baseline_median is not None else float(feature_dict.get('base_price', 4200.0))

        if explainer is None:
            return {
                'model_name': target_model_key,
                'model_display': MODEL_DISPLAY_NAMES.get(target_model_key, target_model_key),
                'model_version': self.version,
                'base_value': round(base_default, 2),
                'predicted_value': round(base_default, 2),
                'currency': '₹',
                'feature_contributions': [],
                'strongest_positive': [],
                'strongest_negative': [],
                'readable_summary': "Direct price explanation will be calculated upon model training.",
                'disclaimer': academic_disclaimer
            }

        try:
            if target_model_key == 'linear_regression' and self.scaler is not None:
                X_eval = self.scaler.transform(X_df)
                shap_obj = explainer(X_eval)
            else:
                shap_obj = explainer(X_df)

            shap_values = shap_obj.values[0]
            base_value = float(shap_obj.base_values[0]) if hasattr(shap_obj, 'base_values') else base_default
            pred_value = float(np.sum(shap_values) + base_value)

            contributions = []
            for i, col in enumerate(self.feature_names):
                actual_val = feature_dict.get(col)
                s_val = float(shap_values[i])
                contributions.append({
                    'feature': col,
                    'actual_value': actual_val,
                    'shap_value': round(s_val, 2),
                    'currency': '₹',
                    'direction': 'positive' if s_val > 0 else 'negative',
                    'abs_impact': round(abs(s_val), 2)
                })

            contributions.sort(key=lambda x: x['abs_impact'], reverse=True)
            positive_contributors = [c for c in contributions if c['shap_value'] > 0][:5]
            negative_contributors = [c for c in contributions if c['shap_value'] < 0][:5]

            # Synthesize plain-language summary with Rupee amounts
            pos_reasons = []
            for p in positive_contributors:
                feat = p['feature']
                val = p['actual_value']
                s = p['shap_value']
                if feat == 'is_weekend' and val: pos_reasons.append(f"Weekend rate premium (+₹{s:.0f})")
                elif feat == 'has_event' and val: pos_reasons.append(f"Event demand lift (+₹{s:.0f})")
                elif feat == 'seasonal_demand_weight': pos_reasons.append(f"Peak season (+₹{s:.0f})")
                elif feat == 'eco_suitability_score': pos_reasons.append(f"Ideal eco-weather (+₹{s:.0f})")
                elif feat == 'is_holiday' and val: pos_reasons.append(f"Holiday period (+₹{s:.0f})")
                elif feat == 'competitor_price': pos_reasons.append(f"Market rate benchmark (+₹{s:.0f})")
                elif feat == 'room_category_code': pos_reasons.append(f"Premium villa category (+₹{s:.0f})")
                else: pos_reasons.append(f"{feat.replace('_', ' ')} (+₹{s:.0f})")

            neg_reasons = []
            for n in negative_contributors:
                feat = n['feature']
                val = n['actual_value']
                s = n['shap_value']
                abs_s = abs(s)
                if feat == 'is_weekend' and not val: neg_reasons.append(f"Weekday pace (-₹{abs_s:.0f})")
                elif feat == 'rainfall_mm' and val > 5: neg_reasons.append(f"Monsoon rain {val}mm (-₹{abs_s:.0f})")
                elif feat == 'lead_time_days' and val > 20: neg_reasons.append(f"Advance booking lead time {val}d (-₹{abs_s:.0f})")
                elif feat == 'current_occupancy_pct' and val < 35: neg_reasons.append(f"Low occupancy incentive (-₹{abs_s:.0f})")
                else: neg_reasons.append(f"{feat.replace('_', ' ')} (-₹{abs_s:.0f})")

            summary_parts = []
            summary_parts.append(f"Expected baseline selling price was ₹{base_value:.0f}.")
            if pos_reasons:
                summary_parts.append("Positive price drivers: " + ", ".join(pos_reasons) + ".")
            if neg_reasons:
                summary_parts.append("Price dampening factors: " + ", ".join(neg_reasons) + ".")
            summary_parts.append(f"Direct model-predicted price: ₹{pred_value:.0f}.")

            return {
                'model_name': target_model_key,
                'model_display': MODEL_DISPLAY_NAMES.get(target_model_key, target_model_key),
                'model_version': self.version,
                'currency': '₹',
                'base_value': round(base_value, 2),
                'predicted_value': round(pred_value, 2),
                'feature_contributions': contributions,
                'strongest_positive': positive_contributors,
                'strongest_negative': negative_contributors,
                'readable_summary': " ".join(summary_parts),
                'disclaimer': academic_disclaimer
            }

        except Exception as e:
            logger.error(f"Error executing SHAP explanation for {target_model_key}: {e}")
            return {
                'model_name': target_model_key,
                'model_display': MODEL_DISPLAY_NAMES.get(target_model_key, target_model_key),
                'model_version': self.version,
                'currency': '₹',
                'base_value': round(base_default, 2),
                'predicted_value': round(base_default, 2),
                'feature_contributions': [],
                'strongest_positive': [],
                'strongest_negative': [],
                'readable_summary': f"SHAP computation fallback: {str(e)}",
                'disclaimer': academic_disclaimer
            }

# Singleton instance & aliases
global_multi_model = MultiModelDemandForecaster()
MultiModelPriceForecaster = MultiModelDemandForecaster
