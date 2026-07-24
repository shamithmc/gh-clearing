-- Phase 8.5 AOR1: geographic coordinates for airline operations maps.
-- Coordinates are sourced from the public-domain OurAirports airport dataset.
ALTER TABLE airports ADD COLUMN latitude DECIMAL(9, 6);
ALTER TABLE airports ADD COLUMN longitude DECIMAL(9, 6);

UPDATE airports SET latitude = 52.308601, longitude = 4.763890 WHERE iata_code = 'AMS';
UPDATE airports SET latitude = 33.636700, longitude = -84.428101 WHERE iata_code = 'ATL';
UPDATE airports SET latitude = 24.440966, longitude = 54.649237 WHERE iata_code = 'AUH';
UPDATE airports SET latitude = 13.681100, longitude = 100.747002 WHERE iata_code = 'BKK';
UPDATE airports SET latitude = 4.701590, longitude = -74.146900 WHERE iata_code = 'BOG';
UPDATE airports SET latitude = 19.088699, longitude = 72.867897 WHERE iata_code = 'BOM';
UPDATE airports SET latitude = 30.111534, longitude = 31.396694 WHERE iata_code = 'CAI';
UPDATE airports SET latitude = 49.008960, longitude = 2.554117 WHERE iata_code = 'CDG';
UPDATE airports SET latitude = 28.555630, longitude = 77.095190 WHERE iata_code = 'DEL';
UPDATE airports SET latitude = 25.273056, longitude = 51.608056 WHERE iata_code = 'DOH';
UPDATE airports SET latitude = 25.249790, longitude = 55.370992 WHERE iata_code = 'DXB';
UPDATE airports SET latitude = 50.026706, longitude = 8.558350 WHERE iata_code = 'FRA';
UPDATE airports SET latitude = -23.431274, longitude = -46.469954 WHERE iata_code = 'GRU';
UPDATE airports SET latitude = 22.311840, longitude = 113.914862 WHERE iata_code = 'HKG';
UPDATE airports SET latitude = 37.469101, longitude = 126.450996 WHERE iata_code = 'ICN';
UPDATE airports SET latitude = 40.639447, longitude = -73.779317 WHERE iata_code = 'JFK';
UPDATE airports SET latitude = -26.140081, longitude = 28.246801 WHERE iata_code = 'JNB';
UPDATE airports SET latitude = 2.745580, longitude = 101.709999 WHERE iata_code = 'KUL';
UPDATE airports SET latitude = 33.942501, longitude = -118.407997 WHERE iata_code = 'LAX';
UPDATE airports SET latitude = 51.470748, longitude = -0.459909 WHERE iata_code = 'LHR';
UPDATE airports SET latitude = 40.493407, longitude = -3.572249 WHERE iata_code = 'MAD';
UPDATE airports SET latitude = -1.318886, longitude = 36.928233 WHERE iata_code = 'NBO';
UPDATE airports SET latitude = 35.768580, longitude = 140.388714 WHERE iata_code = 'NRT';
UPDATE airports SET latitude = 41.978600, longitude = -87.904800 WHERE iata_code = 'ORD';
UPDATE airports SET latitude = 40.077349, longitude = 116.596702 WHERE iata_code = 'PEK';
UPDATE airports SET latitude = 31.143400, longitude = 121.805000 WHERE iata_code = 'PVG';
UPDATE airports SET latitude = 24.957600, longitude = 46.698799 WHERE iata_code = 'RUH';
UPDATE airports SET latitude = 1.350190, longitude = 103.994003 WHERE iata_code = 'SIN';
UPDATE airports SET latitude = -33.946098, longitude = 151.177002 WHERE iata_code = 'SYD';
UPDATE airports SET latitude = 43.675935, longitude = -79.629421 WHERE iata_code = 'YYZ';

ALTER TABLE airports ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE airports ALTER COLUMN longitude SET NOT NULL;
ALTER TABLE airports ADD CONSTRAINT chk_airports_latitude CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE airports ADD CONSTRAINT chk_airports_longitude CHECK (longitude BETWEEN -180 AND 180);
