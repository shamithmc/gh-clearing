CREATE TABLE IF NOT EXISTS mtow_records (
    tail_number VARCHAR(20) PRIMARY KEY,
    aircraft_type VARCHAR(50) NOT NULL,
    weight DECIMAL(10, 2) NOT NULL
);
