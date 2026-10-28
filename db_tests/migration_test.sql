-- ============================================================
-- Test: run migrate_restored_project.sql against a replica of the
-- restored schema, twice (idempotency), then assert the result.
-- ============================================================
\set ON_ERROR_STOP on

\echo '--- ensuring Supabase-like roles exist ---'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

\echo '--- applying restored schema replica ---'
\i db_tests/restored_schema.sql

\echo '--- applying migration (run 1) ---'
\i migrate_restored_project.sql

\echo '--- applying migration (run 2 - must be idempotent) ---'
\i migrate_restored_project.sql

\echo ''
\echo '=========== ASSERTIONS ==========='

DO $$
DECLARE
  v_missing TEXT;
  v_count   INT;
BEGIN
  -- every column the app writes must now exist
  SELECT string_agg(c, ', ') INTO v_missing FROM unnest(ARRAY[
    'plan'
  ]) AS c WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies' AND column_name=c);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL companies missing: %', v_missing;
  END IF;

  SELECT string_agg(c, ', ') INTO v_missing FROM unnest(ARRAY[
    'scan_count','last_scanned_at','is_active','expiry_date','start_date',
    'video_link','fuel_type','contact_phone','contact_email'
  ]) AS c WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cars' AND column_name=c);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL cars missing: %', v_missing;
  END IF;

  RAISE NOTICE 'OK  all expected columns exist';
END $$;

\echo ''
\echo '--- companies.plan backfilled ---'
SELECT id, name, plan FROM companies ORDER BY name;

\echo ''
\echo '--- snake_case twins backfilled from camelCase ---'
SELECT id, make, "fuelType", fuel_type, "contactPhone", contact_phone, "contactEmail", contact_email
FROM cars ORDER BY id;

\echo ''
\echo '--- trigger syncs camelCase -> snake_case on INSERT ---'
INSERT INTO cars (id, company_id, make, model, "fuelType", "contactPhone", "contactEmail")
VALUES ('car3', 'c1', 'Tesla', 'Model 3', 'electric', '733', 'z@z.z');
SELECT id, fuel_type, contact_phone, contact_email FROM cars WHERE id='car3';

\echo ''
\echo '--- trigger syncs camelCase -> snake_case on UPDATE ---'
UPDATE cars SET "fuelType" = 'hybrid', "contactPhone" = '744', "contactEmail" = 'new@z.z' WHERE id = 'car3';
SELECT id, fuel_type, contact_phone, contact_email FROM cars WHERE id='car3';

\echo ''
\echo '--- trigger syncs snake_case -> camelCase on UPDATE (reverse direction) ---'
UPDATE cars SET fuel_type = 'plug-in' WHERE id = 'car3';
SELECT id, "fuelType", fuel_type FROM cars WHERE id='car3';

\echo ''
\echo '--- ASSERT: both spellings always agree ---'
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM cars
  WHERE (fuel_type IS DISTINCT FROM "fuelType")
     OR (contact_phone IS DISTINCT FROM "contactPhone")
     OR (contact_email IS DISTINCT FROM "contactEmail");
  IF n > 0 THEN
    RAISE EXCEPTION 'FAIL: % car row(s) have mismatched camel/snake values', n;
  END IF;
  RAISE NOTICE 'OK  camelCase and snake_case agree on every row';
END $$;

\echo ''
\echo '--- scan_records.id now has a database default ---'
INSERT INTO scan_records (car_id, scanned_at) VALUES ('car1', '2026-03-01T00:00:00Z');
SELECT id, car_id FROM scan_records ORDER BY scanned_at;

\echo ''
\echo '--- defaults on the new car columns ---'
INSERT INTO cars (id, make, model) VALUES ('car4', 'Kia', 'Rio');
SELECT id, scan_count, is_active, images FROM cars WHERE id='car4';

\echo ''
\echo '=========== ALL MIGRATION TESTS PASSED ==========='
