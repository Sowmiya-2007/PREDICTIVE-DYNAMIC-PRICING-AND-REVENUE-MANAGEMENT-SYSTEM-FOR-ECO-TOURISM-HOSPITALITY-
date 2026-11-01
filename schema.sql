-- ====================================================================
-- Predictive Dynamic Pricing and Revenue Management System for Eco-Tourism
-- Database Schema for MySQL 8.0+
-- ====================================================================

CREATE DATABASE IF NOT EXISTS ecotourism_pricing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecotourism_pricing;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    phone VARCHAR(50) NULL,
    preferred_destination VARCHAR(100) NULL,
    eco_preference VARCHAR(100) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- 2. Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    state_or_region VARCHAR(100) NOT NULL,
    description TEXT,
    eco_category VARCHAR(80) NOT NULL DEFAULT 'Forest Eco-Lodge',
    latitude DOUBLE,
    longitude DOUBLE,
    base_price DOUBLE NOT NULL DEFAULT 3500.0,
    min_price DOUBLE NOT NULL DEFAULT 2000.0,
    max_price DOUBLE NOT NULL DEFAULT 9500.0,
    total_capacity INT NOT NULL DEFAULT 20,
    sustainability_rating DOUBLE DEFAULT 4.8,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_prop_loc (location),
    INDEX idx_prop_cat (eco_category)
) ENGINE=InnoDB;

-- 3. Room Types Table
CREATE TABLE IF NOT EXISTS room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INT NOT NULL DEFAULT 2,
    base_price DOUBLE NOT NULL DEFAULT 3500.0,
    min_price DOUBLE NOT NULL DEFAULT 2000.0,
    max_price DOUBLE NOT NULL DEFAULT 8500.0,
    total_rooms INT NOT NULL DEFAULT 5,
    amenities VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_rt_property (property_id)
) ENGINE=InnoDB;

-- 4. Room Inventory Table
CREATE TABLE IF NOT EXISTS room_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_type_id INT NOT NULL,
    inventory_date DATE NOT NULL,
    total_rooms INT NOT NULL DEFAULT 5,
    available_rooms INT NOT NULL DEFAULT 5,
    booked_rooms INT NOT NULL DEFAULT 0,
    current_price DOUBLE NOT NULL DEFAULT 3500.0,
    is_blocked BOOLEAN DEFAULT FALSE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_roomtype_date (room_type_id, inventory_date),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    INDEX idx_inv_date (inventory_date)
) ENGINE=InnoDB;

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL UNIQUE,
    property_id INT NOT NULL,
    room_type_id INT NOT NULL,
    user_id INT NULL,
    guest_name VARCHAR(120) NOT NULL,
    guest_email VARCHAR(120) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT NOT NULL DEFAULT 2,
    rooms_booked INT NOT NULL DEFAULT 1,
    price_per_night DOUBLE NOT NULL,
    total_price DOUBLE NOT NULL,
    special_requests VARCHAR(255) NULL,
    booking_status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    lead_time_days INT DEFAULT 7,
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_bk_dates (check_in_date, check_out_date),
    INDEX idx_bk_user (user_id)
) ENGINE=InnoDB;

-- 6. Scraping Runs Table
CREATE TABLE IF NOT EXISTS scraping_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    source_url VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    events_collected INT DEFAULT 0,
    duration_seconds DOUBLE DEFAULT 0.0,
    error_message TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Local Events Table
CREATE TABLE IF NOT EXISTS local_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(150) NOT NULL,
    event_category VARCHAR(80) NOT NULL DEFAULT 'festival',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    expected_footfall INT DEFAULT 1000,
    impact_intensity VARCHAR(30) NOT NULL DEFAULT 'medium',
    source_url VARCHAR(255),
    source_name VARCHAR(100) DEFAULT 'Local Tourism Portal',
    collection_method VARCHAR(50) DEFAULT 'scraped',
    scraping_run_id INT,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (scraping_run_id) REFERENCES scraping_runs(id) ON DELETE SET NULL,
    INDEX idx_event_dates (start_date, end_date),
    INDEX idx_event_loc (location)
) ENGINE=InnoDB;

-- 8. Model Training Runs Table
CREATE TABLE IF NOT EXISTS model_training_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL DEFAULT 'EcoDemandForecaster',
    version VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100) NOT NULL DEFAULT 'RandomForestRegressor',
    training_records_count INT NOT NULL DEFAULT 0,
    mae DOUBLE NOT NULL,
    rmse DOUBLE NOT NULL,
    r2 DOUBLE,
    baseline_mae DOUBLE NOT NULL,
    baseline_rmse DOUBLE NOT NULL,
    features_list JSON,
    hyperparameters JSON,
    is_active BOOLEAN DEFAULT TRUE,
    trained_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. Demand Predictions Table
CREATE TABLE IF NOT EXISTS demand_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_type_id INT,
    target_date DATE NOT NULL,
    predicted_demand DOUBLE NOT NULL,
    predicted_occupancy_rate DOUBLE NOT NULL,
    confidence_score DOUBLE DEFAULT 0.88,
    actual_demand DOUBLE,
    actual_occupancy_rate DOUBLE,
    influencing_factors JSON,
    model_version VARCHAR(50) DEFAULT 'v1.0-rf',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    INDEX idx_pred_date (target_date)
) ENGINE=InnoDB;

-- 10. Pricing Recommendations Table
CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_type_id INT NOT NULL,
    target_date DATE NOT NULL,
    current_price DOUBLE NOT NULL,
    recommended_price DOUBLE NOT NULL,
    absolute_diff DOUBLE NOT NULL,
    percent_diff DOUBLE NOT NULL,
    predicted_demand DOUBLE NOT NULL,
    predicted_occupancy DOUBLE NOT NULL,
    demand_multiplier DOUBLE DEFAULT 1.0,
    event_impact_factor DOUBLE DEFAULT 1.0,
    seasonal_factor DOUBLE DEFAULT 1.0,
    rationale TEXT NOT NULL,
    min_price_enforced BOOLEAN DEFAULT FALSE,
    max_price_enforced BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewed_by_id INT,
    reviewed_at DATETIME,
    override_price DOUBLE,
    rejection_reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_rec_status (status),
    INDEX idx_rec_date (target_date)
) ENGINE=InnoDB;

-- 11. Price History Table
CREATE TABLE IF NOT EXISTS price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_type_id INT NOT NULL,
    date_applied DATE NOT NULL,
    old_price DOUBLE NOT NULL,
    new_price DOUBLE NOT NULL,
    change_type VARCHAR(50) NOT NULL DEFAULT 'recommendation_applied',
    recommendation_id INT,
    changed_by_id INT,
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    FOREIGN KEY (recommendation_id) REFERENCES pricing_recommendations(id) ON DELETE SET NULL,
    FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ph_date (date_applied)
) ENGINE=InnoDB;

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    details JSON,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_action (action)
) ENGINE=InnoDB;

-- 13. Weather Observations Table
CREATE TABLE IF NOT EXISTS weather_observations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT,
    location VARCHAR(150) NOT NULL,
    state_or_region VARCHAR(100),
    date DATE NOT NULL,
    temp_c DOUBLE NOT NULL DEFAULT 24.0,
    rainfall_mm DOUBLE NOT NULL DEFAULT 0.0,
    humidity_pct INT NOT NULL DEFAULT 65,
    weather_condition VARCHAR(100) NOT NULL DEFAULT 'Clear & Sunny',
    eco_suitability_score DOUBLE NOT NULL DEFAULT 0.85,
    source VARCHAR(100) DEFAULT 'Regional Climate Feed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_weather_loc_date (location, date),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_weather_date (date),
    INDEX idx_weather_loc (location)
) ENGINE=InnoDB;

