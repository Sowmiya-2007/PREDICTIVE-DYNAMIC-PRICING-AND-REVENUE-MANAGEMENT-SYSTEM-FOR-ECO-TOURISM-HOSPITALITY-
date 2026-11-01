# Eco-Tourism Hospitality Datasets Documentation

This directory contains the datasets utilized by the **Predictive Dynamic Pricing and Revenue Management System for Eco-Tourism Hospitality Incorporating Local Event Scraping**.

---

## 📁 Directory Structure

```
data/
├── historical/
│   ├── hotel_bookings.csv      # Real-pattern historical hotel booking demand dataset
│   └── weather_data.csv        # Regional daily weather observations & eco-suitability metrics
└── sample/
    ├── local_events.csv        # Harvested and verified regional festival & event notices
    └── properties.csv          # Eco-tourism property specifications & boundary bounds
```

---

## 1. Historical Hotel Bookings Dataset (`data/historical/hotel_bookings.csv`)

- **Origin & Methodology**: Structured following standard hotel booking demand benchmarking (Antonio, de Almeida and Nunes, 2019) adapted specifically for tropical eco-tourism and rainforest retreat profiles across South Asian bio-reserves (Western Ghats & Sundarbans).
- **Data Status**: Standardized Benchmark / Historical Simulation Data.
- **Record Count**: 4,344 historical reservations spanning from October 2025 to November 2026.
- **Key Columns**:
  - `booking_code`: Unique transaction identifier (`ECO-HIST-xxxxx`).
  - `property_id`: Foreign reference to registered eco-resort.
  - `property_name`: Name of destination lodge.
  - `room_type`: Suite or eco-cottage category.
  - `guest_name`: Reservation guest designation.
  - `check_in_date` & `check_out_date`: Arrival and departure calendar dates (YYYY-MM-DD).
  - `lead_time_days`: Advance booking window (days between reservation and check-in).
  - `stays_in_weekend_nights` & `stays_in_week_nights`: Night distribution.
  - `num_guests`: Party size.
  - `rooms_booked`: Number of rooms occupied.
  - `price_per_night`: ADR charged per night (INR ₹).
  - `total_price`: Aggregate reservation revenue.
  - `booking_status`: `completed`, `confirmed`, or `cancelled`.
  - `market_segment`: Customer segment (`Direct Eco-Traveler`, `Conservationists`, `Corporate Offsite`, etc.).

---

## 2. Weather & Climate Observations Dataset (`data/historical/weather_data.csv`)

- **Origin & Methodology**: Regional daily weather metrics derived from Indian Meteorological Department (IMD) historical averages and Open-Meteo climate patterns for Wayanad (Kerala), Nilgiris (Tamil Nadu), Sundarbans (West Bengal), and Coorg (Karnataka).
- **Data Status**: Regional Climate Observations & Seasonal Indices.
- **Record Count**: 1,644 daily climate entries covering a complete 13-month seasonal cycle.
- **Key Columns**:
  - `date`: Calendar date of observation.
  - `location`: Eco-tourism sanctuary locality.
  - `state_or_region`: Administrative state.
  - `temp_c`: Daily average temperature in Celsius.
  - `rainfall_mm`: Daily precipitation in millimeters (capturing Southwest monsoon downpours vs winter dry spells).
  - `humidity_pct`: Relative atmospheric humidity percentage.
  - `weather_condition`: Qualitative weather classification (`Clear & Sunny`, `Light Showers`, `Moderate Rain`, `Heavy Rain`, `Pleasant Breeze`).
  - `eco_suitability_score`: Climate comfort index (0.0 to 1.0) measuring suitability for outdoor canopy walks, safaris, and nature trails.

---

## 3. Local Events & Tourism Scraping (`data/sample/local_events.csv`)

- **Origin & Methodology**: Harvested via automated web scraping (`BeautifulSoup`) from permitted state eco-tourism bulletins (Kerala Tourism, Wildlife Tourism Boards, Wikipedia Cultural Festivals).
- **Data Status**: Real regional cultural festivals, biodiversity symposiums, and sports marathons.
- **Key Columns**: `title`, `location`, `category`, `start_date`, `end_date`, `expected_footfall`, `impact_intensity`, `description`.

---

## 4. Missing Values & Preprocessing Pipeline

- Missing numerical values (`lead_time_days`, `price_per_night`, `temp_c`, `rainfall_mm`) are imputed using localized median values within matching season and region.
- Missing categorical values are imputed with the regional mode.
- Temporal time-series records are chronologically split (80% training, 20% validation) to strictly prevent future-data leakage into machine learning regressors.
