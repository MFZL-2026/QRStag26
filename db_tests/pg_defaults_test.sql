\set ON_ERROR_STOP on
\echo '=== POSTGREST-FAITHFUL INSERT: only payload columns are listed, rest use DEFAULTs ==='
-- PostgREST builds: INSERT INTO tbl (col1,col2) SELECT col1,col2 FROM json_populate_record(NULL::tbl, body)
-- so columns absent from the payload fall back to their column DEFAULT.
INSERT INTO cars (id, company_id, make, model, year, "fuelType", "contactPhone", images, created_at)
SELECT id, company_id, make, model, year, "fuelType", "contactPhone", images, created_at
FROM json_populate_record(NULL::cars, $body$
{"id":"car_default_1","company_id":"co_1","make":"Nissan","model":"Altima","year":2022,
 "fuelType":"Petrol","contactPhone":"+971500000000","images":["a.jpg"],
 "created_at":"2026-10-27T00:00:00.000Z"}$body$::json);

\echo '--- defaults that must NOT be null ---'
SELECT id, is_active, scan_count, images, qr_template, qr_shape, logo_position,
       company_name_position, fuel_type, contact_phone, last_scanned_at
FROM cars WHERE id='car_default_1';

\echo ''
\echo '=== trigger still syncs camel -> snake on this path ==='
SELECT "fuelType", fuel_type, "contactPhone", contact_phone FROM cars WHERE id='car_default_1';

\echo ''
\echo '=== app_settings seed row present with defaults ==='
SELECT id, app_name, app_logo, app_description, primary_color, secondary_color, custom_qr_url
FROM app_settings WHERE id='app_settings';

\echo ''
\echo '=== bulk import with images=[] and year as text ==='
INSERT INTO cars (id, company_id, make, model, year, "fuelType", images, created_at)
SELECT id, company_id, make, model, year, "fuelType", images, created_at
FROM json_populate_record(NULL::cars, $body$
{"id":"car_default_2","company_id":"co_1","make":"Kia","model":"Sportage","year":"2021",
 "fuelType":"Diesel","images":[],"created_at":"2026-10-27T00:00:00.000Z"}$body$::json);
SELECT id, year, images, is_active, scan_count FROM cars WHERE id='car_default_2';

\echo ''
\echo '=== idempotency: re-running the whole schema script must not fail ==='
\echo '(run separately below)'
