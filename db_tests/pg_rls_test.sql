\set ON_ERROR_STOP on
SET ROLE anon;

\echo '=== anon SELECT from cars (customer QR view) ==='
SELECT count(*) AS cars_visible FROM cars;

\echo '=== anon SELECT companies / app_settings / scan_records / leads ==='
SELECT (SELECT count(*) FROM companies) AS companies,
       (SELECT count(*) FROM app_settings) AS settings,
       (SELECT count(*) FROM scan_records) AS scans,
       (SELECT count(*) FROM leads) AS leads;

\echo '=== anon INSERT car (admin app upsert path) ==='
INSERT INTO cars (id, company_id, make, model, year, "fuelType", "contactPhone", images, created_at)
SELECT id, company_id, make, model, year, "fuelType", "contactPhone", images, created_at
FROM json_populate_record(NULL::cars, $body$
{"id":"rls_car_1","company_id":"co_1","make":"MG","model":"ZS","year":2024,
 "fuelType":"Hybrid","contactPhone":"+971500000000","images":[],
 "created_at":"2026-10-27T00:00:00.000Z"}$body$::json);

\echo '=== anon INSERT scan_records without id ==='
INSERT INTO scan_records (car_id, scanned_at) VALUES ('rls_car_1', NOW()::text);

\echo '=== anon INSERT lead ==='
INSERT INTO leads (id, car_id, name, phone, email, interest_level, notes, created_at)
VALUES ('rls_lead_1','rls_car_1','Anon Buyer','+971500000001','a@b.c','normal','from qr', NOW()::text);

\echo '=== anon UPDATE cars (scan_count + last_scanned_at PATCH) ==='
UPDATE cars SET scan_count = 1, last_scanned_at = NOW()::text WHERE id='rls_car_1';

\echo '=== anon UPSERT app_settings (admin branding save) ==='
INSERT INTO app_settings (id, app_name, app_logo, app_description, primary_color, secondary_color, custom_qr_url, updated_at)
VALUES ('app_settings','Car QR Showcase','','QR Code Management', '#3b82f6','#1e40af','https://example.com', NOW()::text)
ON CONFLICT (id) DO UPDATE SET custom_qr_url = EXCLUDED.custom_qr_url;

\echo '=== anon DELETE (handleDeleteCar) ==='
DELETE FROM scan_records WHERE car_id='rls_car_1';
DELETE FROM leads WHERE car_id='rls_car_1';
DELETE FROM cars WHERE id='rls_car_1';

\echo '=== final row counts as anon ==='
SELECT (SELECT count(*) FROM cars) AS cars, (SELECT count(*) FROM scan_records) AS scans, (SELECT count(*) FROM leads) AS leads;
RESET ROLE;
