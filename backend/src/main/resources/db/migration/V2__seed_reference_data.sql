-- V2__seed_reference_data.sql
-- Reference data: IATA Charge Codes, Airline Master, Airport Master

-- 1. Charge Codes Table (25 IATA codes as defined in architecture-contract.md §3.3.3)
CREATE TABLE IF NOT EXISTS charge_codes (
    code         VARCHAR(50)  PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description  VARCHAR(255) NOT NULL
);

INSERT INTO charge_codes (code, display_name, description) VALUES
('BAGGAGE',               'Baggage Handling',           'Handling of passenger baggage at departure and arrival'),
('BAGGAGE_DELIVERY',      'Baggage Delivery',           'Delivery of baggage to final destination after arrival'),
('CARGO_HANDLING',        'Cargo Handling',             'Loading, unloading and processing of air cargo'),
('CATERING',              'Catering',                   'In-flight meal and beverage provisioning services'),
('CLEANING',              'Aircraft Cleaning',          'Interior and exterior cleaning of aircraft'),
('COMMISSION',            'Commission',                 'Commission charges for ground handling services'),
('CREW_ACCOMMODATION',    'Crew Accommodation',         'Hotel and lodging services for flight crew layovers'),
('CREW_TRANSPORTATION',   'Crew Transportation',        'Ground transportation services for flight crew'),
('CUSTOMS_SERVICE_CHARGE','Customs Service Charge',     'Customs clearance and documentation services'),
('DEICING',               'De-icing',                  'Aircraft de-icing and anti-icing treatment'),
('DEPARTURE_STAMPS',      'Departure Stamps',           'Departure tax and stamp processing fees'),
('IMMIGRATION_FINES',     'Immigration Fines',          'Fines levied for immigration regulation violations'),
('LOUNGES',               'Lounge Services',            'Airport lounge access and related hospitality services'),
('MISCELLANEOUS',         'Miscellaneous',              'Other ground handling services not classified elsewhere'),
('MISHANDLING_BAGGAGE',   'Mishandled Baggage',         'Costs associated with lost, delayed or damaged baggage'),
('MISHANDLING_PASSENGER', 'Mishandled Passenger',       'Costs associated with denied boarding or irregular operations'),
('MOTOR_FUEL',            'Motor Fuel',                 'Ground support equipment fuel charges'),
('PASSENGER_HANDLING',    'Passenger Handling',         'Check-in, boarding, and passenger assistance services'),
('PASSENGER_TRANSPORTATION','Passenger Transportation', 'Airside and landside passenger transportation'),
('PASSENGER_SECURITY',    'Passenger Security',         'Security screening and passenger security services'),
('RAMP_HANDLING',         'Ramp Handling',              'Aircraft marshalling, pushback, and ramp services'),
('RENT_EQUIPMENT',        'Equipment Rental',           'Rental of ground support equipment and facilities'),
('STAND',                 'Stand / Parking',            'Aircraft stand, gate, or parking charges'),
('STPC',                  'STPC',                       'Stopover Passenger Care services'),
('UTILITIES',             'Utilities',                  'Electricity, water, and other utility services provided to aircraft')
ON CONFLICT (code) DO NOTHING;

-- 2. Airlines Table (starter set of major international airlines)
CREATE TABLE IF NOT EXISTS airlines (
    iata_code VARCHAR(2)  PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    country   VARCHAR(100) NOT NULL
);

INSERT INTO airlines (iata_code, name, country) VALUES
('LH', 'Lufthansa',              'Germany'),
('EK', 'Emirates',               'United Arab Emirates'),
('SQ', 'Singapore Airlines',     'Singapore'),
('BA', 'British Airways',        'United Kingdom'),
('AF', 'Air France',             'France'),
('QR', 'Qatar Airways',          'Qatar'),
('AA', 'American Airlines',      'United States'),
('UA', 'United Airlines',        'United States'),
('DL', 'Delta Air Lines',        'United States'),
('KL', 'KLM Royal Dutch Airlines','Netherlands'),
('TK', 'Turkish Airlines',       'Turkey'),
('CX', 'Cathay Pacific',         'Hong Kong'),
('JL', 'Japan Airlines',         'Japan'),
('NH', 'All Nippon Airways',     'Japan'),
('EY', 'Etihad Airways',         'United Arab Emirates'),
('QF', 'Qantas Airways',         'Australia'),
('AC', 'Air Canada',             'Canada'),
('IB', 'Iberia',                 'Spain'),
('AZ', 'ITA Airways',            'Italy'),
('SK', 'Scandinavian Airlines',  'Sweden'),
('OS', 'Austrian Airlines',      'Austria'),
('LX', 'Swiss International Air Lines', 'Switzerland'),
('SV', 'Saudi Arabian Airlines', 'Saudi Arabia'),
('AI', 'Air India',              'India'),
('6E', 'IndiGo',                 'India')
ON CONFLICT (iata_code) DO NOTHING;

-- 3. Airports Table (starter set of major international airports)
CREATE TABLE IF NOT EXISTS airports (
    iata_code VARCHAR(3)  PRIMARY KEY,
    name      VARCHAR(150) NOT NULL,
    city      VARCHAR(100) NOT NULL,
    country   VARCHAR(100) NOT NULL,
    region    VARCHAR(50)  NOT NULL
);

INSERT INTO airports (iata_code, name, city, country, region) VALUES
('DXB', 'Dubai International Airport',               'Dubai',        'United Arab Emirates', 'MIDDLE_EAST'),
('LHR', 'London Heathrow Airport',                   'London',       'United Kingdom',       'EUROPE'),
('CDG', 'Charles de Gaulle Airport',                 'Paris',        'France',               'EUROPE'),
('FRA', 'Frankfurt Airport',                         'Frankfurt',    'Germany',              'EUROPE'),
('AMS', 'Amsterdam Airport Schiphol',                'Amsterdam',    'Netherlands',          'EUROPE'),
('SIN', 'Singapore Changi Airport',                  'Singapore',    'Singapore',            'ASIA_PACIFIC'),
('HKG', 'Hong Kong International Airport',           'Hong Kong',    'Hong Kong',            'ASIA_PACIFIC'),
('NRT', 'Narita International Airport',              'Tokyo',        'Japan',                'ASIA_PACIFIC'),
('ICN', 'Incheon International Airport',             'Seoul',        'South Korea',          'ASIA_PACIFIC'),
('SYD', 'Sydney Kingsford Smith Airport',            'Sydney',       'Australia',            'ASIA_PACIFIC'),
('JFK', 'John F. Kennedy International Airport',     'New York',     'United States',        'NORTH_AMERICA'),
('LAX', 'Los Angeles International Airport',         'Los Angeles',  'United States',        'NORTH_AMERICA'),
('ORD', 'O''Hare International Airport',             'Chicago',      'United States',        'NORTH_AMERICA'),
('ATL', 'Hartsfield-Jackson Atlanta International',  'Atlanta',      'United States',        'NORTH_AMERICA'),
('YYZ', 'Toronto Pearson International Airport',     'Toronto',      'Canada',               'NORTH_AMERICA'),
('GRU', 'São Paulo–Guarulhos International Airport', 'São Paulo',    'Brazil',               'SOUTH_AMERICA'),
('BOG', 'El Dorado International Airport',           'Bogotá',       'Colombia',             'SOUTH_AMERICA'),
('DOH', 'Hamad International Airport',               'Doha',         'Qatar',                'MIDDLE_EAST'),
('AUH', 'Abu Dhabi International Airport',           'Abu Dhabi',    'United Arab Emirates', 'MIDDLE_EAST'),
('RUH', 'King Khalid International Airport',         'Riyadh',       'Saudi Arabia',         'MIDDLE_EAST'),
('NBO', 'Jomo Kenyatta International Airport',       'Nairobi',      'Kenya',                'AFRICA'),
('JNB', 'OR Tambo International Airport',            'Johannesburg', 'South Africa',         'AFRICA'),
('CAI', 'Cairo International Airport',               'Cairo',        'Egypt',                'AFRICA'),
('DEL', 'Indira Gandhi International Airport',       'New Delhi',    'India',                'ASIA_PACIFIC'),
('BOM', 'Chhatrapati Shivaji Maharaj International', 'Mumbai',       'India',                'ASIA_PACIFIC'),
('PVG', 'Shanghai Pudong International Airport',     'Shanghai',     'China',                'ASIA_PACIFIC'),
('PEK', 'Beijing Capital International Airport',     'Beijing',      'China',                'ASIA_PACIFIC'),
('BKK', 'Suvarnabhumi Airport',                      'Bangkok',      'Thailand',             'ASIA_PACIFIC'),
('KUL', 'Kuala Lumpur International Airport',        'Kuala Lumpur', 'Malaysia',             'ASIA_PACIFIC'),
('MAD', 'Adolfo Suárez Madrid-Barajas Airport',     'Madrid',       'Spain',                'EUROPE')
ON CONFLICT (iata_code) DO NOTHING;

