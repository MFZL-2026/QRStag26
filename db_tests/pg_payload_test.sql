\set ON_ERROR_STOP on
\echo '=== TEST 1: admin upsert of a NEW car (exact carToSave payload, camelCase) ==='
-- This is precisely what App.tsx handleSaveCar() sends: the CarData interface
-- spread into the payload, with contactWhatsApp / videoLink / video_link removed.
INSERT INTO cars
SELECT (json_populate_record(NULL::cars, $body$
{
  "id":"car_test_001",
  "company_id":"co_test_001",
  "make":"Toyota",
  "model":"Camry",
  "year":2024,
  "price":"25000",
  "mileage":"10000",
  "fuelType":"Petrol",
  "transmission":"Automatic",
  "color":"White",
  "description":"Test car",
  "contactPhone":"+971501234567",
  "contactEmail":"dealer@example.com",
  "location":"Dubai",
  "images":["https://img.example.com/a.jpg","https://img.example.com/b.jpg"],
  "scan_start_date":"",
  "scan_end_date":"",
  "qr_template":"standard",
  "qr_frame":null,
  "qr_shape":"square",
  "logo_position":"none",
  "company_name_position":"top",
  "contact_whatsapp":"501234567",
  "ccr_no":"CCR1",
  "approved_on":"2024-01-01",
  "produced_in_and_after":"2024",
  "country_of_production":"Japan",
  "pollutant_limits":"Euro 6",
  "vin":"VIN123",
  "label_no":"LBL1",
  "manufacturer":"Toyota",
  "motor_vehicle_class":"Sedan",
  "fe_cafe_combined":"1.5",
  "created_at":"2026-10-27T00:00:00.000Z"
}$body$::json)).*
ON CONFLICT (id) DO UPDATE SET
  make=EXCLUDED.make, model=EXCLUDED.model, "fuelType"=EXCLUDED."fuelType",
  "contactPhone"=EXCLUDED."contactPhone", "contactEmail"=EXCLUDED."contactEmail",
  contact_whatsapp=EXCLUDED.contact_whatsapp, images=EXCLUDED.images,
  created_at=EXCLUDED.created_at;

\echo '--- camel/snake sync check (trigger must populate the snake twins) ---'
SELECT "fuelType", fuel_type, "contactPhone", contact_phone, "contactEmail", contact_email,
       contact_whatsapp, images, is_active, scan_count, qr_template
FROM cars WHERE id = 'car_test_001';

\echo ''
\echo '=== TEST 2: scan_records insert WITHOUT id (App.tsx recordScan) ==='
INSERT INTO scan_records (car_id, scanned_at)
VALUES ('car_test_001', '2026-10-27T10:00:00.000Z');
SELECT id, car_id, scanned_at FROM scan_records;

\echo ''
\echo '=== TEST 3: scan_records insert WITH id (customer-standalone.html) ==='
INSERT INTO scan_records (id, car_id, scanned_at)
VALUES ('scan_manual_1', 'car_test_001', '2026-10-27T10:05:00.000Z');
SELECT count(*) AS scan_rows FROM scan_records;

\echo ''
\echo '=== TEST 4: lead insert (App.tsx saveLead + customer-standalone) ==='
INSERT INTO leads (id, car_id, name, phone, email, interest_level, notes, created_at)
VALUES ('lead_1', 'car_test_001', 'Jane Buyer', '+971509999999', 'jane@example.com', 'urgent', 'wants test drive', '2026-10-27T10:10:00.000Z');
INSERT INTO leads (id, car_id, name, phone, email, interest_level, notes)
VALUES ('lead_2', 'car_test_001', 'John Buyer', NULL, NULL, 'normal', NULL);
SELECT id, name, interest_level, created_at FROM leads ORDER BY created_at;

\echo ''
\echo '=== TEST 5: customer view PATCH scan_count + last_scanned_at ==='
UPDATE cars SET scan_count = 1, last_scanned_at = '2026-10-27T10:00:00.000Z' WHERE id = 'car_test_001';
SELECT scan_count, last_scanned_at FROM cars WHERE id = 'car_test_001';

\echo ''
\echo '=== TEST 6: companies upsert (App.tsx handleSaveCompany) ==='
INSERT INTO companies
SELECT (json_populate_record(NULL::companies, $body$
{
  "id":"co_test_001",
  "name":"Test Motors",
  "address":"Sheikh Zayed Rd",
  "phone":"+97140000000",
  "email":"info@example.com",
  "created_at":"2026-10-27T00:00:00.000Z",
  "plan":"free",
  "custom_price":null,
  "custom_features":["a","b"],
  "branding_color":"#3b82f6",
  "branding_logo":""
}$body$::json)).*
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, branding_color=EXCLUDED.branding_color;
SELECT id, name, plan, custom_features, branding_color FROM companies;

\echo ''
\echo '=== TEST 7: app_settings upsert (App.tsx saveAppSettings) ==='
INSERT INTO app_settings
SELECT (json_populate_record(NULL::app_settings, $body$
{
  "id":"app_settings",
  "app_name":"Car QR Showcase",
  "app_logo":"",
  "app_description":"QR Code Management for Car Dealerships",
  "primary_color":"#3b82f6",
  "secondary_color":"#1e40af",
  "custom_qr_url":"https://example.com",
  "updated_at":"2026-10-27T00:00:00.000Z"
}$body$::json)).*
ON CONFLICT (id) DO UPDATE SET app_name=EXCLUDED.app_name, custom_qr_url=EXCLUDED.custom_qr_url;
SELECT id, app_name, custom_qr_url FROM app_settings;

\echo ''
\echo '=== TEST 8: bulk CSV import row - year arrives as a STRING from parseInt fallback ==='
INSERT INTO cars
SELECT (json_populate_record(NULL::cars, $body$
{"id":"car_test_002","company_id":"co_test_001","make":"Honda","model":"Civic","year":"2020",
 "price":"18000","mileage":"5000","fuelType":"Hybrid","transmission":"CVT","color":"Black",
 "description":"bulk imported","contactPhone":"","contactEmail":"","location":"Abu Dhabi",
 "images":[],"scan_start_date":"","scan_end_date":"","qr_template":"standard","logo_position":"none",
 "company_name_position":"top","created_at":"2026-10-27T00:00:00.000Z"}$body$::json)).*;
SELECT id, make, year, fuel_type FROM cars WHERE id='car_test_002';

\echo ''
\echo '=== TEST 9: EDIT save - payload now also carries snake_case columns read back from DB ==='
INSERT INTO cars
SELECT (json_populate_record(NULL::cars, $body$
{"id":"car_test_001","company_id":"co_test_001","make":"Toyota","model":"Camry","year":2024,
 "price":"25500","mileage":"10000","fuelType":"Petrol","transmission":"Automatic","color":"White",
 "description":"Test car edited","contactPhone":"+971501234567","contactEmail":"dealer@example.com",
 "contact_phone":"+971501234567","contact_email":"dealer@example.com","fuel_type":"Petrol",
 "location":"Dubai","images":["https://img.example.com/a.jpg"],"scan_start_date":"","scan_end_date":"",
 "qr_template":"standard","qr_frame":null,"qr_shape":"square","logo_position":"none",
 "company_name_position":"top","contact_whatsapp":"501234567","is_active":true,"scan_count":1,
 "last_scanned_at":"2026-10-27T10:00:00.000Z","created_at":"2026-10-27T00:00:00.000Z",
 "ccr_no":"CCR1","approved_on":"2024-01-01","produced_in_and_after":"2024","country_of_production":"Japan",
 "pollutant_limits":"Euro 6","vin":"VIN123","label_no":"LBL1","manufacturer":"Toyota",
 "motor_vehicle_class":"Sedan","fe_cafe_combined":"1.5"}$body$::json)).*
ON CONFLICT (id) DO UPDATE SET price=EXCLUDED.price, description=EXCLUDED.description;
SELECT id, price, description, fuel_type, contact_phone FROM cars WHERE id='car_test_001';

\echo ''
\echo '=== TEST 10: customer view SELECT * shape (what the QR page receives) ==='
SELECT id, make, model, "fuelType", fuel_type, "contactPhone", contact_phone, "contactEmail",
       contact_email, contact_whatsapp, images, is_active, expiry_date, start_date,
       scan_start_date, scan_end_date, qr_template, qr_frame, qr_shape, logo_position,
       company_name_position, scan_count, last_scanned_at
FROM cars WHERE id='car_test_001';

\echo ''
\echo '=== TEST 11: DELETE cascade used by handleDeleteCar / handleDeleteCompany ==='
DELETE FROM scan_records WHERE car_id='car_test_001';
DELETE FROM leads WHERE car_id='car_test_001';
DELETE FROM cars WHERE id='car_test_001';
DELETE FROM cars WHERE company_id='co_test_001';
DELETE FROM companies WHERE id='co_test_001';
SELECT (SELECT count(*) FROM cars) AS cars_left, (SELECT count(*) FROM scan_records) AS scans_left,
       (SELECT count(*) FROM leads) AS leads_left, (SELECT count(*) FROM companies) AS companies_left;

\echo ''
\echo '=== TEST 12: RLS policies present for every table ==='
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;

\echo ''
\echo '=== ALL TESTS PASSED ==='
