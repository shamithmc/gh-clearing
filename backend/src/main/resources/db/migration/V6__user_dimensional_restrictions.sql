CREATE TABLE IF NOT EXISTS user_airport_restrictions (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    airport_code VARCHAR(3) NOT NULL,
    PRIMARY KEY (user_id, airport_code)
);

CREATE TABLE IF NOT EXISTS user_airline_restrictions (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    airline_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, airline_id)
);

CREATE TABLE IF NOT EXISTS user_charge_code_restrictions (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    charge_code VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, charge_code)
);
