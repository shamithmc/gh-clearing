CREATE TABLE IF NOT EXISTS aircraft_type_mtow_defaults (
    aircraft_type VARCHAR(50) PRIMARY KEY,
    weight DECIMAL(10, 2) NOT NULL CHECK (weight >= 0)
);
