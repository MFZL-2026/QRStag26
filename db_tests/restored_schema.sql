-- ============================================================
-- Faithful replica of the RESTORED Supabase project's schema,
-- as reported by PostgREST (OpenAPI) on 2026-10-29.
-- Used to test migrate_restored_project.sql locally.
-- ============================================================

DROP TABLE IF EXISTS cars, companies, scan_records, leads, app_settings CASCADE;

CREATE TABLE companies (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  created_at        TEXT NOT NULL,
  branding_color    TEXT DEFAULT '#3b82f6',
  branding_logo     TEXT,
  custom_features   TEXT[] ,
  custom_price      INTEGER
);

CREATE TABLE cars (
  id                      TEXT PRIMARY KEY,
  company_id              TEXT,
  make                    TEXT NOT NULL,
  model                   TEXT NOT NULL,
  year                    INTEGER,
  price                   TEXT,
  mileage                 TEXT,
  transmission            TEXT,
  color                   TEXT,
  description             TEXT,
  location                TEXT,
  "fuelType"              TEXT,
  "contactPhone"          TEXT,
  "contactEmail"          TEXT,
  "contactName"           TEXT,
  contact_whatsapp        TEXT,
  images                  TEXT[] ,
  features                TEXT[] ,
  condition               TEXT DEFAULT 'Good',
  engine                  TEXT,
  horsepower              TEXT,
  owners                  INTEGER DEFAULT 1,
  "VIN"                   TEXT,
  vin                     TEXT,
  scan_start_date         TEXT,
  scan_end_date           TEXT,
  qr_template             TEXT DEFAULT 'standard',
  qr_frame                TEXT,
  qr_shape                TEXT DEFAULT 'square',
  logo_position           TEXT DEFAULT 'none',
  company_name_position   TEXT DEFAULT 'top',
  ccr_no                  TEXT,
  approved_on             TEXT,
  produced_in_and_after   TEXT,
  country_of_production   TEXT,
  pollutant_limits        TEXT,
  label_no                TEXT,
  manufacturer            TEXT,
  motor_vehicle_class     TEXT,
  fe_cafe_combined        TEXT,
  created_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE scan_records (
  id         TEXT PRIMARY KEY,
  car_id     TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

CREATE TABLE leads (
  id             TEXT PRIMARY KEY,
  car_id         TEXT NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  interest_level TEXT DEFAULT 'warm',
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE app_settings (
  id               TEXT PRIMARY KEY DEFAULT 'app_settings',
  app_name         TEXT DEFAULT 'Car QR Showcase',
  app_logo         TEXT,
  app_description  TEXT,
  primary_color    TEXT DEFAULT '#3b82f6',
  secondary_color  TEXT DEFAULT '#1e40af',
  custom_qr_url    TEXT,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed rows that mirror the real project
INSERT INTO companies (id, name, address, phone, email, created_at)
VALUES ('c1', 'Auto Hub', 'Beirut', '123', 'a@b.c', '2026-01-01T00:00:00Z'),
       ('c2', 'Drive Co', 'Tripoli', '456', 'd@e.f', '2026-01-02T00:00:00Z');

INSERT INTO cars (id, company_id, make, model, year, "fuelType", "contactPhone", "contactEmail", images)
VALUES ('car1', 'c1', 'Toyota', 'Camry', 2022, 'petrol', '711', 'x@y.z', ARRAY['a.jpg']),
       ('car2', 'c2', 'Honda', 'Civic', 2021, 'diesel', '722', 'q@r.s', ARRAY['b.jpg']);

INSERT INTO scan_records (id, car_id, scanned_at)
VALUES ('s1', 'car1', '2026-02-01T00:00:00Z');

INSERT INTO leads (id, car_id, name, phone, email)
VALUES ('l1', 'car1', 'Ali', '700', 'ali@x.com');
