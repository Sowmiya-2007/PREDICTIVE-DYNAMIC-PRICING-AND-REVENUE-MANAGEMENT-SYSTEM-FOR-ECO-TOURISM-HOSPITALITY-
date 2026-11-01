# Predictive Dynamic Pricing and Revenue Management System for Eco-Tourism Hospitality Incorporating Local Event Scraping

An AI-powered decision-support platform designed for eco-tourism resorts, rainforest sanctuaries, wildlife camps, and nature homestays. The system integrates real external weather and event data, compares three machine learning models for demand forecasting, provides real SHAP (SHapley Additive exPlanations) explainability, computes bounded dynamic room rates with human-in-the-loop review, and delivers hospitality revenue analytics.

---

## 🌟 Key Features & Architectural Enhancements

### 1. Real External Data Integrations
- **Open-Meteo Weather API (`https://api.open-meteo.com/v1/forecast`)**:
  - Live observations and 14-day forecasts queried using actual property latitude and longitude coordinates.
  - Ingests temperature (°C), precipitation (mm), and WMO weather interpretation codes.
  - Distinguishes live observations, forward forecasts, and historical records (`data_type` column).
  - Calculates destination **Eco-Suitability Scores** and climate demand multipliers with built-in caching and exponential backoff retry.
- **Local Events Intelligence**:
  - Dual integration supporting the **Ticketmaster Discovery API** (with `TICKETMASTER_API_KEY`) and permitted regional tourism web sources (e.g. Kerala Tourism).
  - Extracts event name, category, location, dates, source URL, and last-checked timestamps.
  - Handles deduplication and cancellation/rescheduling tracking.
  - Truthful fallback: When an external key is omitted or a network request fails, displays honest "Unconfigured" or "Partial" status badges—never fabricating dummy records.
- **Hotel Booking & Inventory Data**:
  - Real booking database integration with lead time tracking, room categorization, and ADR.
  - Multi-dataset CSV importer supporting hotel bookings, weather, and events with strict column validation and duplicate detection.

### 2. Live Data Refresh & Reliability Hub
- Persistent data source monitoring via `DataSourceStatus` tracking health status (`healthy`, `stale`, `partial`, `unconfigured`, `failed`), refresh interval, and records count.
- Configurable automatic refresh interval (`LIVE_DATA_REFRESH_INTERVAL_MINUTES=60`).
- Interactive manual **"Refresh Live Data"** triggers on the manager dashboard with immediate visual feedback.
- Stale-data warning flags attached to downstream pricing recommendations when external caches exceed freshness thresholds.

### 3. Direct Room-Price Prediction using Three Machine Learning Models
All three regression models directly predict the **room price in Rupees (₹)** rather than merely occupancy demand, trained on the genuine historical selling price target variable (`price_per_night` from verified bookings):
1. **Linear Regression**: Parametric baseline regressor with a leak-free `StandardScaler` fitted strictly on the training partition.
2. **Random Forest Regressor**: Non-linear ensemble model (100 decision trees, depth 8, min samples split 4).
3. **XGBoost Regressor**: Extreme Gradient Boosted Trees (`xgboost>=2.0.0`, 100 estimators, learning rate 0.08, depth 5).

- **19 Validated Input Features**: Historical base price, room category code (1–8), current occupancy pace (%), booking lead time, date, day of week, weekend indicator, month, eco-tourism season index, seasonal demand weight, Indian public holidays/festival calendar, nearby local events, event count, event timing and proximity intensity, event category code, Open-Meteo temperature (°C), precipitation (mm), outdoor eco-suitability score, and competitor price benchmark.
- **Target Variable**: Actual historical selling price (`price_per_night` in ₹) for the relevant room category and stay date from genuine bookings—never trained on fabricated target prices.
- **Data Leakage Prevention**: Strict chronological time-series split (75% Train / 25% Test). Preprocessing transformations fit exclusively on training records.
- **Evaluation in Currency (₹)**: Evaluates MAE (₹), RMSE (₹), and R² against the unconditional historical median selling price baseline model.
- **Model Selection & Retraining**: Selects the best validated model (lowest validation MAE in ₹). Retrains automatically when verified historical records are available and issues warnings if records are insufficient (< 30 observations).

### 4. Real SHAP Explainability Engine in Rupees (₹)
- Integrated `shap>=0.45.0` computing mathematically sound Shapley values for direct price predictions:
  - `shap.LinearExplainer` for Linear Regression.
  - `shap.TreeExplainer` for Random Forest Regressor and XGBoost Regressor.
- **Direct Currency Contributions**: Computes exact price shifts in Rupees (e.g. `+₹469` Room Category Premium, `+₹177` Weekend Demand, `+₹155` Festival Proximity, `-₹280` Rainfall Discount) from the expected baseline selling price.
- **Global Feature Importance**: Computes and displays mean absolute SHAP price impacts in ₹/night across all features.
- **Per-Recommendation Explainability**: Decomposes individual pricing decisions with baseline selling price in ₹, actual input values, positive price drivers (+₹), and dampening factors (-₹).
- **Academic Disclaimer**: Explicit disclaimer that SHAP describes mathematical model attribution relative to baseline, not physical empirical proof of causation.

### 5. Dynamic Pricing Engine with Model-Predicted vs Rule-Adjusted Separation
- **Separation of Model Output & Business Rules**: The manager dashboard explicitly displays the **Model-Predicted Price** (raw ML forecast from the best validated model) separately from the **Final Rule-Adjusted Recommended Price**.
- **Business Rule Multipliers & Volatility Limits**: Applies property rate floors (`min_price`), ceilings (`max_price`), and a configurable maximum permitted price swing (`MAX_PRICE_CHANGE_PCT=30.0` prevents overnight swings >30%).
- **Three-Model Side-by-Side Display**: Displays predictions from Linear Regression, Random Forest, and XGBoost side-by-side alongside the selected model badge and confidence score.
- **Human-in-the-Loop Review**: Recommendations remain in `pending` status until approved, overridden with custom rates, or rejected by an authorized hospitality manager.
- **Immutable Audit Trail**: All price updates are logged in `PriceHistory` and `AuditLog` with reviewer identity and step-by-step rule explanations.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 8 | Single Page Application (SPA) |
| **Styling** | Vanilla CSS + Tailwind CSS | Rich forest/sage eco-aesthetic UI tokens |
| **Icons & Visuals** | Lucide React + Recharts | Responsive data charts, waterfall visualizers & icons |
| **Backend API** | Python 3.14 + Flask 3 | Modular REST API with Blueprints |
| **Database & ORM** | SQLite 3 / MySQL 8.0+ via SQLAlchemy 2.0 | Multi-dialect ORM with automatic schema migration |
| **Machine Learning** | Scikit-learn, XGBoost, SHAP, Pandas, NumPy | 3-model forecasting engine & TreeExplainer/LinearExplainer |
| **External APIs** | Open-Meteo REST API, Ticketmaster Discovery API | Real-time weather and event feeds |
| **Web Scraping** | BeautifulSoup4 + Requests | Regional tourism portal event extraction |
| **Security** | PyJWT + Bcrypt | Token authentication and password encryption |

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py               # Flask app factory, CORS, and blueprint registration
│   │   ├── config.py                 # Environment variables & runtime settings
│   │   ├── database.py               # SQLAlchemy engine, session & auto-migration logic
│   │   ├── models/                   # Relational ORM models
│   │   │   ├── data_source.py        # DataSourceStatus model (health, staleness, refresh tracking)
│   │   │   ├── user.py               # User authentication model (customer & manager roles)
│   │   │   ├── property.py           # Property & RoomType models
│   │   │   ├── booking.py            # Booking model with cancellation support
│   │   │   ├── event.py              # LocalEvent model with external_id & status
│   │   │   ├── weather.py            # WeatherObservation model (lat/lon, data_type, WMO code)
│   │   │   ├── prediction.py         # ModelTrainingRun model (3-model metrics & SHAP summaries)
│   │   │   ├── recommendation.py     # PricingRecommendation model (SHAP values & rules breakdown)
│   │   │   └── audit.py              # AuditLog & PriceHistory models
│   │   ├── routes/                   # REST API Blueprints
│   │   │   ├── auth_routes.py        # Login, registration, profile
│   │   │   ├── property_routes.py    # Properties, room types, quotes
│   │   │   ├── booking_routes.py     # Reservations, user bookings, cancellations
│   │   │   ├── event_routes.py       # Event listing, manual creation, live scrape triggers
│   │   │   ├── weather_routes.py     # Destination forecasts & Open-Meteo coordinate lookup
│   │   │   ├── prediction_routes.py  # Model inference, retrain pipeline, SHAP explain endpoint
│   │   │   ├── recommendation_routes.py # Dynamic pricing decisions, approval, override, reject
│   │   │   ├── analytics_routes.py   # KPIs, demand trends, simulations
│   │   │   └── data_routes.py        # Data source health, live refresh triggers, CSV imports
│   │   ├── ml/                       # Machine Learning Subsystem
│   │   │   ├── multi_model.py        # MultiModelDemandForecaster (LR, RF, XGB + SHAP explainers)
│   │   │   ├── demand_model.py       # Backward-compatible wrapper for forecaster
│   │   │   ├── feature_engineering.py # 18-feature extraction vector constructor
│   │   │   ├── data_preprocessing.py # Historical data loader & chronological partitions
│   │   │   └── train_pipeline.py     # Orchestrator for 3-model training & DB metric logging
│   │   ├── services/                 # Business Logic Services
│   │   │   ├── weather_service.py    # Open-Meteo API client with coordinate resolution
│   │   │   ├── scraping_service.py   # Ticketmaster API & BeautifulSoup scraper
│   │   │   ├── data_refresh_service.py # Multi-source live refresh coordinator
│   │   │   ├── pricing_service.py    # Dynamic pricing engine with SHAP & volatility guardrails
│   │   │   └── analytics_service.py  # KPI calculations & simulation curves
│   │   └── utils/                    # JWT helpers and input validation routines
│   ├── tests/                        # Pytest Test Suite (17 automated tests)
│   │   ├── test_auth.py              # Auth & JWT tests
│   │   ├── test_bookings.py          # Reservation & cancellation tests
│   │   ├── test_external_data_and_refresh.py # Data source status & CSV validation tests
│   │   ├── test_ml.py                # ML endpoint tests
│   │   ├── test_multi_model_shap.py  # 3-model training, XGBoost & SHAP tests
│   │   ├── test_pricing.py           # Pricing recommendation & guardrail tests
│   │   ├── test_scraping.py          # Scraper & Ticketmaster tests
│   │   └── test_weather_data.py      # Open-Meteo weather integration tests
│   ├── run.py                        # Backend development server entry point
│   ├── seed_data.py                  # Database seeder with authentic eco-resorts & bookings
│   └── requirements.txt              # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/common/        # DashboardHeader, Sidebar, Navbar, ProtectedRoute
│   │   ├── pages/dashboard/          # Manager Dashboard Pages
│   │   │   ├── MainDashboard.jsx     # Live Data Sources Hub, KPI cards, trend charts
│   │   │   ├── ForecastLabPage.jsx   # 3-model comparison table, global SHAP chart, ad-hoc forecaster
│   │   │   ├── PricingPage.jsx       # Recommendation cards, model selection, SHAP breakdown, rules
│   │   │   ├── DataManagementPage.jsx# Data source status table, refresh triggers, CSV import
│   │   │   ├── EventsPage.jsx        # Event intelligence & Ticketmaster status
│   │   │   ├── AnalyticsPage.jsx     # Revenue strategy simulations & KPI analysis
│   │   │   └── PropertiesPage.jsx    # Property configurations & room rate bounds
│   │   ├── pages/public/             # Customer-Facing Pages (Discovery, Night-by-night quotes, Booking)
│   │   ├── services/api.js           # Axios API client with interceptors
│   │   └── index.css                 # Custom design tokens and styling
│   └── package.json                  # Frontend dependencies
├── data/                             # Historical and demonstration datasets
│   ├── historical/                   # hotel_bookings.csv and weather_data.csv
│   └── sample/                       # local_events.csv, properties.csv
├── docs/                             # Architecture and API documentation
├── schema.sql                        # Full relational SQL schema
├── .env.example                      # Environment variables template
└── README.md
```

---

## ⚡ Installation & Setup Instructions (Windows)

### Prerequisites
- Python 3.10+ (tested on Python 3.14 on Windows)
- Node.js v18+ and npm
- *(Optional)* Ticketmaster Developer API Key (`TICKETMASTER_API_KEY`)

---

### Step 1: Backend Setup

1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd "c:\Users\sowmi\Downloads\mini project\backend"
   ```

2. Install Python dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

3. Configure Environment Variables:
   - Copy `.env.example` to `backend/.env` (or edit existing `backend/.env`):
     ```ini
     PORT=5000
     DATABASE_URL=sqlite:///ecotourism_pricing.db
     JWT_SECRET_KEY=eco_tourism_super_secret_jwt_key_2026
     OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast
     OPEN_METEO_ARCHIVE_URL=https://archive-api.open-meteo.com/v1/archive
     LIVE_DATA_REFRESH_INTERVAL_MINUTES=60
     MAX_PRICE_CHANGE_PCT=30.0
     ENABLE_AUTO_PUBLIC_PRICING=false
     DEFAULT_PREDICTION_MODEL=best
     # Optional: Add your Ticketmaster API Key
     # TICKETMASTER_API_KEY=your_ticketmaster_api_key_here
     ```

4. Populate Database with Demonstration Data:
   ```powershell
   python seed_data.py
   ```

5. Run Automated Pytest Test Suite:
   ```powershell
   python -m pytest tests/
   ```
   *(All 17 test modules will execute and validate authentication, weather, scraping, multi-model training, SHAP explainers, pricing guardrails, and data refresh endpoints.)*

6. Start Flask Backend Server:
   ```powershell
   python run.py
   ```
   *The backend server will start at `http://localhost:5000`.*

---

### Step 2: Frontend Setup

1. Open a second PowerShell terminal and navigate to `frontend`:
   ```powershell
   cd "c:\Users\sowmi\Downloads\mini project\frontend"
   ```

2. Install npm dependencies:
   ```powershell
   npm install
   ```

3. Verify Production Bundle Compilation:
   ```powershell
   npm run build
   ```

4. Start Vite Development Server:
   ```powershell
   npm run dev
   ```
   *The frontend dashboard will start at `http://localhost:5173`.*

---

## 🔑 Demonstration Accounts

| Role | Username | Password | Dashboard URL | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Hospitality Manager** | `manager` | `password123` | `/dashboard` | Live data source refresh, 3-model comparison, SHAP explainability, pricing approval/override, CSV import |
| **Eco Traveler / Customer** | `customer` | `password123` | `/user` | Property search, dynamic room quotes, instant reservations, booking cancellation |

*(The login screen at `/login` provides one-click demonstration login buttons for instant access.)*

---

## 📋 Summary of Files Changed & Rationale

| File Path | Description of Changes |
| :--- | :--- |
| `backend/requirements.txt` | Added `xgboost>=2.0.0` and `shap>=0.45.0` dependencies. |
| `backend/app/config.py` | Added environment settings for Open-Meteo, Ticketmaster, refresh intervals, max price change bounds, and default prediction model. |
| `backend/app/models/data_source.py` | Created new `DataSourceStatus` model for persistent health, staleness, records count, and refresh tracking. |
| `backend/app/models/weather.py` | Added `data_type` (observation vs forecast vs historical), `observation_time`, `fetch_time`, `source_url`, `weather_code`, `latitude`, `longitude`. |
| `backend/app/models/event.py` | Added `external_id`, `status` ('active', 'cancelled', 'rescheduled'), and `last_checked`. |
| `backend/app/models/prediction.py` | Added `all_models_metrics`, `best_model_name`, `training_period_start/end`, `test_period_start/end`, and `shap_summary`. |
| `backend/app/models/recommendation.py` | Added `selected_model_name`, `confidence_score`, `shap_values` dictionary, `pricing_rules_explanation`, and `is_stale_data_warning`. |
| `backend/app/database.py` | Implemented automatic safe schema migration checking column existence and creating new columns and tables in SQLite. |
| `backend/app/services/weather_service.py` | Integrated Open-Meteo live API (`https://api.open-meteo.com/v1/forecast`) using actual retreat coordinates, WMO code conversion, eco-suitability score, and caching with retry. |
| `backend/app/services/scraping_service.py` | Integrated Ticketmaster Discovery API, permitted scraper fallback, event deduplication, and DataSourceStatus logging. |
| `backend/app/services/data_refresh_service.py` | Created unified refresh coordinator for manual and background syncing across weather, events, and bookings. |
| `backend/app/ml/multi_model.py` | Built `MultiModelDemandForecaster` containing Linear Regression (with leak-free `StandardScaler`), Random Forest, and XGBoost; strict chronological split; real SHAP explainers (`LinearExplainer` & `TreeExplainer`); local waterfall & global importance. |
| `backend/app/ml/demand_model.py` | Wrapped `MultiModelDemandForecaster` ensuring full backward compatibility. |
| `backend/app/ml/train_pipeline.py` | Trained all three models on same time-series split, benchmarked vs median, and stored active run in database. |
| `backend/app/services/pricing_service.py` | Separated ML forecast from pricing rules, integrated model selection, real SHAP values, volatility bounds (`MAX_PRICE_CHANGE_PCT`), stale warnings, and audit logging. |
| `backend/app/routes/prediction_routes.py` | Updated `/predictions/predict`, `/ml/train`, `/ml/status`, and added `/ml/explain` endpoint. |
| `backend/app/routes/recommendation_routes.py` | Accepted `model_name` parameter and returned model names, confidence scores, and SHAP breakdowns. |
| `backend/app/routes/event_routes.py` | Returned configured external data sources and Ticketmaster credential status. |
| `backend/app/routes/data_routes.py` | Added `GET /api/data/sources`, `POST /api/data/refresh-live`, and updated `import_csv` with column validation and duplicate detection. |
| `backend/tests/test_multi_model_shap.py` | Added comprehensive tests for 3-model training, metrics comparison, predictions, and real SHAP explanations. |
| `backend/tests/test_external_data_and_refresh.py` | Added tests for data source status, live refresh triggers, and CSV column validation with duplicate detection. |
| `frontend/src/services/api.js` | Added API methods `dataService.getSources()`, `dataService.refreshLive()`, and `mlService.explain()`. |
| `frontend/src/pages/dashboard/MainDashboard.jsx` | Added Live Data Sources widget with sync triggers, model badge, confidence score, and stale warnings on recommendations. |
| `frontend/src/pages/dashboard/ForecastLabPage.jsx` | Added 3-model comparison table (LR, RF, XGB vs baseline), model selector, global SHAP feature importance chart, and ad-hoc forecaster with positive/negative SHAP waterfall. |
| `frontend/src/pages/dashboard/PricingPage.jsx` | Added model selector to recommendation form, confidence scores, stale warnings, expandable SHAP breakdown, and dynamic pricing rules breakdown. |
| `frontend/src/pages/dashboard/DataManagementPage.jsx` | Added live data sources status table with refresh triggers, and CSV import guidance with duplicate detection feedback. |
| `frontend/src/pages/dashboard/EventsPage.jsx` | Displayed Ticketmaster API key configured vs unconfigured status in the source dropdown. |
