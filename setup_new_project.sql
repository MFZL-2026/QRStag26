-- ============================================
-- Car QR Showcase - Complete Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- for a NEW Supabase project.
--
-- IMPORTANT: This schema mirrors the EXACT columns the application writes.
-- The admin app upserts the whole car record, so any column name that does
-- not exist here will make every save fail with "column does not exist".
-- ============================================

-- ---------------------------------------------------------------
-- 1. COMPANIES
-- Written by App.tsx handleSaveCompany() as: {...editingCompany, branding_color, branding_logo}
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW()::text),
  plan TEXT DEFAULT 'free',
  custom_price NUMERIC,
  custom_features TEXT[] DEFAULT '{}',
  branding_color TEXT DEFAULT '#3b82f6',
  branding_logo TEXT DEFAULT ''
);

-- ---------------------------------------------------------------
-- 2. CARS
-- Written by App.tsx handleSaveCar() / handleBulkImport().
-- NOTE the camelCase columns (fuelType, contactPhone, contactEmail):
-- the admin app spreads the CarData interface straight into the upsert
-- payload, so these keys are sent to PostgREST verbatim. They must exist.
-- The snake_case twins are kept in sync by the trigger at the bottom.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  price TEXT,
  mileage TEXT,
  transmission TEXT,
  color TEXT,
  description TEXT,
  location TEXT,

  -- camelCase fields exactly as the admin app sends them
  "fuelType" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,

  -- snake_case fields read by both customer views
  fuel_type TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,

  images TEXT[] DEFAULT '{}',
  video_link TEXT,

  scan_start_date TEXT,
  scan_end_date TEXT,
  qr_template TEXT DEFAULT 'standard',
  qr_frame TEXT,
  qr_shape TEXT DEFAULT 'square',
  logo_position TEXT DEFAULT 'none',
  company_name_position TEXT DEFAULT 'top',

  expiry_date TEXT,
  start_date TEXT,
  is_active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TEXT,

  -- Vehicle regulatory information
  ccr_no TEXT,
  approved_on TEXT,
  produced_in_and_after TEXT,
  country_of_production TEXT,
  pollutant_limits TEXT,
  vin TEXT,
  label_no TEXT,
  manufacturer TEXT,
  motor_vehicle_class TEXT,
  fe_cafe_combined TEXT,

  created_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- ---------------------------------------------------------------
-- 3. SCAN RECORDS
-- The admin app inserts WITHOUT an id (App.tsx recordScan / handleSaveCar),
-- so the primary key must have a default.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  car_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- ---------------------------------------------------------------
-- 4. LEADS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  car_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  interest_level TEXT DEFAULT 'normal',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- ---------------------------------------------------------------
-- 5. NOTIFICATIONS (kept for forward compatibility; the app
--    currently keeps notifications in memory only)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- ---------------------------------------------------------------
-- 6. APP SETTINGS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  app_name TEXT DEFAULT 'Car QR Showcase',
  app_logo TEXT DEFAULT '',
  app_description TEXT DEFAULT 'QR Code Management for Car Dealerships',
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',
  custom_qr_url TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- ---------------------------------------------------------------
-- 7. INDEXES
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cars_company_id ON cars(company_id);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_records_car_id ON scan_records(car_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_scanned_at ON scan_records(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_car_id ON leads(car_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ---------------------------------------------------------------
-- 8. Keep camelCase and snake_case contact/fuel columns in sync.
--    The admin app writes camelCase only; the customer views read
--    snake_case first. This trigger guarantees both stay correct.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_car_compat_fields() RETURNS trigger AS $$
BEGIN
  IF NEW.contact_phone IS NULL AND NEW."contactPhone" IS NOT NULL THEN
    NEW.contact_phone := NEW."contactPhone";
  END IF;
  IF NEW.contact_email IS NULL AND NEW."contactEmail" IS NOT NULL THEN
    NEW.contact_email := NEW."contactEmail";
  END IF;
  IF NEW.fuel_type IS NULL AND NEW."fuelType" IS NOT NULL THEN
    NEW.fuel_type := NEW."fuelType";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_car_compat_fields ON cars;
CREATE TRIGGER trg_sync_car_compat_fields
  BEFORE INSERT OR UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION sync_car_compat_fields();

-- ---------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
--    The frontend talks to Supabase with the anon key, so every table
--    the app touches needs permissive policies.
-- ---------------------------------------------------------------
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

GRANT ALL ON companies TO anon, authenticated, service_role;
GRANT ALL ON cars TO anon, authenticated, service_role;
GRANT ALL ON scan_records TO anon, authenticated, service_role;
GRANT ALL ON leads TO anon, authenticated, service_role;
GRANT ALL ON notifications TO anon, authenticated, service_role;
GRANT ALL ON app_settings TO anon, authenticated, service_role;

-- Read (customer QR view + admin dashboard)
DROP POLICY IF EXISTS "Public read companies" ON companies;
CREATE POLICY "Public read companies" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read cars" ON cars;
CREATE POLICY "Public read cars" ON cars FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read scan_records" ON scan_records;
CREATE POLICY "Public read scan_records" ON scan_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read leads" ON leads;
CREATE POLICY "Public read leads" ON leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read notifications" ON notifications;
CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read app_settings" ON app_settings;
CREATE POLICY "Public read app_settings" ON app_settings FOR SELECT USING (true);

-- Full management (admin app upserts/deletes with the anon key)
DROP POLICY IF EXISTS "Public manage companies" ON companies;
CREATE POLICY "Public manage companies" ON companies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage cars" ON cars;
CREATE POLICY "Public manage cars" ON cars FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage scan_records" ON scan_records;
CREATE POLICY "Public manage scan_records" ON scan_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage leads" ON leads;
CREATE POLICY "Public manage leads" ON leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage notifications" ON notifications;
CREATE POLICY "Public manage notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage app_settings" ON app_settings;
CREATE POLICY "Public manage app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------
-- 10. Seed default app settings (the app expects id = 'app_settings')
-- ---------------------------------------------------------------
INSERT INTO app_settings (id, app_name, app_description, primary_color, secondary_color, custom_qr_url, updated_at)
VALUES ('app_settings', 'Car QR Showcase', 'QR Code Management for Car Dealerships', '#3b82f6', '#1e40af', '', NOW()::text)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 11. Verification (run this after the script to confirm)
-- ---------------------------------------------------------------
-- SELECT table_name, column_name FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name IN ('cars','companies','scan_records','leads','app_settings')
--  ORDER BY table_name, ordinal_position;
-- Expected: cars has fuelType, contactPhone, contactEmail, fuel_type,
--           contact_phone, contact_email, contact_whatsapp, images, last_scanned_at
