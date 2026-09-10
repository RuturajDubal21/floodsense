-- =============================================================================
-- FloodSense - Urban Flood Nowcasting System
-- MySQL Relational Database Schema & Initial Data Seeding
-- Database Target: MySQL 8.0+ (localhost:3306)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS floodsense DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE floodsense;

-- -----------------------------------------------------------------------------
-- Table 1: users (Emergency Authorities & System Users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'CITIZEN', -- 'EMERGENCY_AUTHORITY', 'ADMIN', 'CITIZEN'
    department VARCHAR(100) DEFAULT 'Disaster Management Cell',
    badge_number VARCHAR(50) DEFAULT 'PMC-EMG-01',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- Table 2: flood_zones (Sub-basin Hydrological Parameters & Telemetry)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flood_zones (
    zone_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    area_sq_km DECIMAL(6,2) NOT NULL,
    center_lat DECIMAL(9,6) NOT NULL,
    center_lng DECIMAL(9,6) NOT NULL,
    elevation_meters INT NOT NULL,
    slope_percent DECIMAL(4,2) NOT NULL,
    impervious_percent INT NOT NULL,
    historical_risk_score INT NOT NULL,
    baseline_rainfall INT NOT NULL DEFAULT 15,
    drainage_capacity_lps INT NOT NULL DEFAULT 4500,
    current_water_depth_cm INT DEFAULT 0,
    current_risk_score INT DEFAULT 15,
    current_hazard_category VARCHAR(20) DEFAULT 'LOW',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- Table 3: citizen_reports (Crowdsourced Inundation Observations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_reports (
    id VARCHAR(50) PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL,
    water_depth_cm INT NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MODERATE', -- 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
    coords_lat DECIMAL(9,6) NOT NULL,
    coords_lng DECIMAL(9,6) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'RESOLVED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES flood_zones(zone_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- Table 4: audit_logs (Emergency Command Actions & Simulation Logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    username VARCHAR(50) DEFAULT 'SYSTEM',
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- Initial Data Seeding (Emergency Officers & Predefined Zones)
-- =============================================================================

-- Seed Pre-approved Emergency Authority Accounts
-- Passwords below are SHA-256 hashes of:
-- 'admin123' -> '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
-- 'officer123' -> 'ed27918d2d6c97a26f6d5032b49206d203875ec8039c94b79b63a9eb657b988f'
INSERT INTO users (username, password_hash, full_name, role, department, badge_number) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Chief Disaster Commander', 'EMERGENCY_AUTHORITY', 'Pune Disaster Management Control Room', 'PMC-CMD-001'),
('officer1', 'ed27918d2d6c97a26f6d5032b49206d203875ec8039c94b79b63a9eb657b988f', 'Officer R. Sharma', 'EMERGENCY_AUTHORITY', 'Wakad Sub-basin Rescue Division', 'PMC-EMG-104')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Seed Sub-basin Zones
INSERT INTO flood_zones (zone_id, name, area_sq_km, center_lat, center_lng, elevation_meters, slope_percent, impervious_percent, historical_risk_score, baseline_rainfall, drainage_capacity_lps) VALUES
('zone-wakad', 'Wakad Sub-basin', 4.20, 18.598700, 73.763400, 554, 1.20, 78, 75, 15, 4500),
('zone-baner', 'Baner Highway Corridor', 3.80, 18.559000, 73.786800, 562, 2.10, 82, 60, 15, 5200),
('zone-aundh', 'Aundh - Mula River Bank', 3.10, 18.562600, 73.808700, 548, 0.80, 75, 85, 15, 3800),
('zone-hinjewadi', 'Hinjewadi IT Phase 1', 5.50, 18.591200, 73.738900, 575, 3.50, 88, 40, 15, 6000),
('zone-shivajinagar', 'Shivajinagar Central Basin', 4.00, 18.530800, 73.847400, 550, 1.00, 90, 80, 15, 4100),
('zone-kothrud', 'Kothrud - Paud Road', 4.80, 18.507400, 73.807700, 582, 4.20, 70, 25, 15, 5800),
('zone-pashan', 'Pashan Lake Catchment', 3.50, 18.540000, 73.790000, 568, 2.50, 62, 50, 15, 4900),
('zone-vimannagar', 'Viman Nagar Airport Basin', 4.10, 18.567900, 73.914300, 565, 1.80, 85, 55, 15, 5100)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Sample Citizen Report
INSERT INTO citizen_reports (id, zone_id, water_depth_cm, description, severity, coords_lat, coords_lng, status) VALUES
('rep-101', 'zone-wakad', 25, 'Water accumulation near Wakad Flyover underpass. Vehicles struggling.', 'HIGH', 18.596000, 73.762000, 'VERIFIED')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Log Initialization
INSERT INTO audit_logs (username, action, details) VALUES
('SYSTEM', 'DATABASE_INITIALIZATION', 'FloodSense MySQL Database schema created and pre-seeded.');
