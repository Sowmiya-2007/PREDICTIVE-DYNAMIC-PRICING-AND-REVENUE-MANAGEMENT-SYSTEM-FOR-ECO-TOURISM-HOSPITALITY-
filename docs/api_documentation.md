# REST API Documentation

Base URL: `http://localhost:5000/api`

All protected endpoints require the following HTTP header:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new manager or admin user account.
- **Request Body**:
  ```json
  {
    "username": "priya_manager",
    "email": "priya@ecoresort.org",
    "password": "securePassword123",
    "full_name": "Priya Varma",
    "role": "hospitality_manager"
  }
  ```
- **Response**: `201 Created` with JWT token and user profile.

### `POST /api/auth/login`
Authenticates user and issues JWT token.
- **Request Body**:
  ```json
  {
    "username": "manager",
    "password": "manager123"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": 2,
      "username": "manager",
      "full_name": "Priya Varma",
      "role": "hospitality_manager"
    }
  }
  ```

### `GET /api/auth/me`
Retrieves currently authenticated user profile.
- **Header**: Bearer token required.

---

## 2. Properties Endpoints

### `GET /api/properties`
List all active eco-tourism properties.
- **Query Params**: `search`, `location`, `category`.
- **Response**: List of properties with base rates and sustainability ratings.

### `GET /api/properties/:id`
Retrieves property details, room types, and recent booking logs.

### `POST /api/properties`
Registers a new eco-lodge with price boundaries (Protected).
- **Request Body**:
  ```json
  {
    "name": "Munnar Cloud Forest Eco-Lodge",
    "location": "Munnar, Kerala",
    "state_or_region": "Kerala",
    "eco_category": "Forest Eco-Lodge",
    "base_price": 3800.0,
    "min_price": 2400.0,
    "max_price": 8900.0,
    "total_capacity": 18,
    "sustainability_rating": 4.9,
    "description": "Zero-carbon resort powered by solar energy."
  }
  ```

### `PUT /api/properties/:id`
Updates property rate boundaries and metadata (Protected).

### `DELETE /api/properties/:id`
Archives property (Administrator role required).

---

## 3. Local Event Intelligence Endpoints

### `GET /api/events`
Lists collected local festivals, eco-marathons, and cultural exhibits.
- **Query Params**: `location`, `category`, `source`, `upcoming_only=true`.

### `POST /api/events`
Manually enters a verified local festival (Protected).

### `POST /api/events/scrape`
Executes real-time BeautifulSoup scraper on configured tourism portals.
- **Request Body**: `{"source_id": "kerala_tourism"}`
- **Response**: Scraping duration, number of new unique events collected.

### `GET /api/events/scraping-runs`
Returns log history of all past web scraping jobs.

---

## 4. Machine Learning & Forecasting Endpoints

### `POST /api/predictions/predict`
Calculates ad-hoc demand prediction.
- **Request Body**:
  ```json
  {
    "property_id": 1,
    "target_date": "2026-10-25"
  }
  ```
- **Response**: Predicted occupancy %, estimated rooms demanded, confidence score, and extracted features.

### `POST /api/ml/train`
Executes model training pipeline using RandomForestRegressor with chronological splitting.
- **Response**: Evaluation metrics (MAE, RMSE, R²), baseline metrics, training record count.

### `GET /api/ml/status`
Returns metadata and performance benchmarks of active demand forecasting model.

---

## 5. Dynamic Pricing Endpoints

### `POST /api/pricing/recommend`
Generates pricing recommendation using demand forecast and business rules.
- **Request Body**:
  ```json
  {
    "property_id": 1,
    "target_date": "2026-10-20"
  }
  ```
- **Response**: Current rate, recommended rate, absolute difference, percentage difference, and plain-language explanation.

### `GET /api/pricing/recommendations`
Lists recommendations with status filter (`pending`, `approved`, `applied`, `rejected`).

### `POST /api/pricing/recommendations/:id/approve`
Approves recommendation and applies rate to room inventory.

### `POST /api/pricing/recommendations/:id/override`
Applies rate with manager-specified custom price within property bounds.
- **Request Body**: `{"override_price": 5400.0}`

### `POST /api/pricing/recommendations/:id/reject`
Rejects recommendation with required explanation.
- **Request Body**: `{"reason": "Block group reservation locked in."}`

### `GET /api/pricing/history`
Returns historical audit trail of applied price changes.

---

## 6. Revenue Analytics Endpoints

### `GET /api/analytics/kpis`
Summary metrics: total properties, average room rate, predicted demand, occupancy rate, total revenue, and estimated uplift.

### `GET /api/analytics/trends`
Time-series observations: date, actual occupancy %, predicted demand %, ADR, RevPAR, and daily revenue.

### `GET /api/analytics/event-impact`
Compares occupancy, ADR, and RevPAR between event days and non-event days.

### `GET /api/analytics/simulation`
Simulates 3 revenue strategies (Fixed Base vs Seasonal vs Proposed AI System) stating explicit price elasticities and carrying capacity constraints.

---

---

## 7. Weather & Climate Endpoints

### `GET /api/weather/destinations`
Returns today's real-time climate conditions, temperature, rainfall, and eco-tourism activity suitability score across all registered eco-destinations.

### `GET /api/weather/forecast`
Returns multi-day daily weather forecast for a specific eco-property.
- **Query Params**: `property_id=1`, `days=7`
- **Response**: Array of daily forecasts (temperature, rainfall in mm, humidity %, condition, eco suitability index).

### `GET /api/weather/lookup`
Retrieves climate observation or seasonal forecast for a specific location and date.
- **Query Params**: `location=Wayanad, Kerala`, `date=2026-10-25`

---

## 8. Data Management & Multi-Source Datasets

### `POST /api/data/reset-seed`
Restores demonstration database to initial pristine state and re-ingests regional climate observations.

### `GET /api/data/datasets-overview`
Returns record counts, file status, and provenance information for Historical Bookings (`hotel_bookings.csv`), Weather Observations (`weather_data.csv`), Local Events (`local_events.csv`), and Eco Properties.

### `GET /api/data/export-revenue-report`
Downloads comprehensive CSV revenue report.

### `POST /api/data/import-csv`
Uploads multipart CSV file (`events`, `weather`, or `bookings`) to ingest external catalogs.

