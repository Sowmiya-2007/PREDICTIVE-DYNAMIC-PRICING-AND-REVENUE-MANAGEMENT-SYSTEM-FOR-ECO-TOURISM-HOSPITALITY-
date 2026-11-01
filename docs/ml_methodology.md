# Machine Learning Demand Forecasting Methodology

## 1. Problem Formulation
In eco-tourism hospitality management, dynamic pricing depends fundamentally on accurate demand forecasting. Setting room rates without understanding demand risks either over-pricing (causing vacant rooms) or under-pricing during major festivals (sacrificing revenue needed for conservation operations).

The ML objective is formulated as a regression problem:
$$\hat{y} = f(\mathbf{x})$$
where $\hat{y}$ is the predicted occupancy rate (%) for a given property and target stay date, and $\mathbf{x} \in \mathbb{R}^{18}$ is an engineered feature vector.

---

## 2. Feature Engineering Pipeline

The system constructs 18 standardized features across calendar, property, event intelligence, and climate dimensions:

1. **`day_of_week`** (0 = Monday, ..., 6 = Sunday): Captures weekly travel patterns.
2. **`is_weekend`** (Binary): Weekend premium proxy (Friday, Saturday, Sunday).
3. **`month`** (1 to 12): Captures broad calendar seasonality.
4. **`season_index`** (0 = Monsoon, 1 = Summer, 2 = Post-Monsoon Greenery, 3 = Peak Winter).
5. **`seasonal_demand_weight`** (0.90 to 1.35): Domain-specific eco-tourism multiplier reflecting Western Ghats weather patterns.
6. **`has_event`** (Binary): 1 if a registered local festival or tourism event is active on the date and within proximity.
7. **`event_count`** (Integer): Number of concurrently active regional gatherings.
8. **`max_event_intensity`** (1.0 to 3.0): Maximum intensity multiplier derived from footfall.
9. **`event_intensity_score`** (Float): Cumulative intensity weight across all active events.
10. **`event_category_code`** (Integer encoding for festival, eco-marathon, birdwatching expo, etc.).
11. **`base_price`** (Float): Property benchmark rate.
12. **`lead_time_days`** (Integer): Advance booking notice window.
13. **`sustainability_rating`** (Float): Eco-certification rating.
14. **`total_rooms`** (Integer): Total physical capacity constraint.
15. **`current_occupancy_pct`** (Float): Existing occupancy base for that date.
16. **`temp_c`** (Float): Average daily ambient temperature in Celsius.
17. **`rainfall_mm`** (Float): Daily precipitation in millimeters (monsoon rainfall proxy).
18. **`eco_suitability_score`** (Float, 0.0 to 1.0): Environmental index measuring outdoor nature activity comfort (trekking, safaris, birdwatching).


---

## 3. Training & Validation Strategy

### Chronological Splitting (No Data Leakage)
Standard random k-fold cross-validation is inappropriate for time-dependent booking data because it leaks future event knowledge into past predictions. The pipeline implements strict chronological partitioning:
- **Training Set (80%)**: Historical chronological observations.
- **Validation Set (20%)**: Held-out future dates.

### Algorithm Selection: RandomForestRegressor
- `n_estimators`: 100 decision trees.
- `max_depth`: 8 (prevent overfitting on small local properties).
- `min_samples_split`: 4.
- `random_state`: 42.

---

## 4. Evaluation Metrics & Baseline Comparison

### Primary Evaluation Metrics
1. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{n} \sum_{i=1}^n |y_i - \hat{y}_i|$$
   Directly interpretable as the average occupancy percentage deviation.
2. **Root Mean Squared Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^n (y_i - \hat{y}_i)^2}$$
   Measures sensitivity to large forecasting errors.

### Baseline Benchmark Model
The baseline model predicts the historical median demand:
$$\hat{y}_{\text{baseline}} = \text{median}(y_{\text{train}})$$

### Empirical Results (Evaluated on Held-Out Validation Data)
- **Baseline MAE**: $19.61\%$
- **Trained RandomForest MAE**: $9.79\%$ (Error reduction: **$>50\%$**)
- **Baseline RMSE**: $24.67\%$
- **Trained RandomForest RMSE**: $14.00\%$

### Note on $R^2$ Metric in Small Time-Series
The coefficient of determination $R^2 = 1 - \frac{\sum (y - \hat{y})^2}{\sum (y - \bar{y})^2}$ can become negative or unstable on small datasets with low variance or near-constant off-peak occupancy. In hospitality revenue management, **MAE** represents the actionable business metric because revenue managers care directly about how many percentage points the occupancy estimate is off by.

---

## 5. Model Serialization & Live Deployment
The fitted model bundle is serialized with `joblib` into `app/ml/saved_models/demand_model_<version>.joblib` alongside its feature schema, metrics, and baseline median. It is loaded as a singleton service in Flask for sub-5 millisecond prediction response times.
