-- ============================================
-- Car QR Showcase - Complete Database Schema
-- Run this in Supabase SQL Editor for a NEW project
-- ============================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  custom_price NUMERIC,
  custom_features TEXT[],
  branding_color TEXT DEFAULT '#3b82f6',
  branding_logo TEXT DEFAULT ''
);

-- 2. CARS TABLE
CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  price TEXT,
  mileage TEXT,
  fuel_type TEXT,
  transmission TEXT,
  color TEXT,
  description TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  location TEXT,
  images TEXT,
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
  -- Vehicle Regulatory Information
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

-- 3. SCAN RECORDS TABLE
CREATE TABLE IF NOT EXISTS scan_records (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

-- 4. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  interest_level TEXT DEFAULT 'normal',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- 6. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  app_name TEXT DEFAULT 'Car QR Showcase',
  app_logo TEXT DEFAULT '',
  app_description TEXT DEFAULT 'QR Code Management for Car Dealerships',
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',
  custom_qr_url TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (NOW()::text)
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_cars_company_id ON cars(company_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_car_id ON scan_records(car_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_scanned_at ON scan_records(scanned_at);
CREATE INDEX IF NOT EXISTS idx_leads_car_id ON leads(car_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- ROW LEVEL SECURITY (enable but allow public read for customer view)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies (needed for customer QR view)
DROP POLICY IF EXISTS "Public read companies" ON companies;
CREATE POLICY "Public read companies" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read cars" ON cars;
CREATE POLICY "Public read cars" ON cars FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read app_settings" ON app_settings;
CREATE POLICY "Public read app_settings" ON app_settings FOR SELECT USING (true);

-- Public insert policies (scan tracking + lead capture)
DROP POLICY IF EXISTS "Public insert scans" ON scan_records;
CREATE POLICY "Public insert scans" ON scan_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert leads" ON leads;
CREATE POLICY "Public insert leads" ON leads FOR INSERT WITH CHECK (true);

-- Admin policies (service role bypasses RLS, but add for anon key writes)
DROP POLICY IF EXISTS "Public manage scan_records" ON scan_records;
CREATE POLICY "Public manage scan_records" ON scan_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage leads" ON leads;
CREATE POLICY "Public manage leads" ON leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage cars" ON cars;
CREATE POLICY "Public manage cars" ON cars FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage companies" ON companies;
CREATE POLICY "Public manage companies" ON companies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage app_settings" ON app_settings;
CREATE POLICY "Public manage app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage notifications" ON notifications;
CREATE POLICY "Public manage notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Seed default app settings
INSERT INTO app_settings (id, app_name, app_description, primary_color, secondary_color, custom_qr_url, updated_at)
VALUES ('app_settings', 'Car QR Showcase', 'QR Code Management for Car Dealerships', '#3b82f6', '#1e40af', '', NOW()::text)
ON CONFLICT (id) DO NOTHING;
