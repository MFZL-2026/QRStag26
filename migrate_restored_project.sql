-- ============================================================
-- Migration for the RESTORED Supabase project
--   project ref : uifcfnkbccluhyryywxe
--   run in      : Supabase Dashboard -> SQL Editor -> New query
--
-- WHY THIS FILE EXISTS
-- --------------------
-- The restored database still carries the ORIGINAL schema, which is missing
-- a few columns the current app writes to. PostgREST rejects the WHOLE
-- request when a payload contains an unknown key, so each missing column
-- breaks one feature:
--
--   companies.plan            -> saving a company fails (PGRST204)
--   cars.scan_count           -> customer page scan counter fails (PGRST204)
--   cars.last_scanned_at      -> customer page scan counter fails (PGRST204)
--   cars.is_active            -> "active" filter fails
--   cars.expiry_date          -> listing validity dates fail
--   cars.start_date           -> listing validity dates fail
--   cars.video_link           -> video field on the QR page fails
--   cars.fuel_type            -> snake_case twin of "fuelType" missing
--   cars.contact_phone        -> snake_case twin of "contactPhone" missing
--   cars.contact_email        -> snake_case twin of "contactEmail" missing
--   scan_records.id default   -> inserts without a client-side id fail (23502)
--
-- The app has been made resilient (it drops unknown columns and retries), so
-- this migration is what actually makes those fields PERSIST.
--
-- This script is IDEMPOTENT: safe to run more than once, and safe on a
-- database that already has the columns.
-- ============================================================

-- ------------------------------------------------------------
-- 1. companies: subscription plan
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN plan TEXT DEFAULT 'free';
  END IF;
END $$;

-- Backfill: every existing company gets the free tier unless already set.
UPDATE public.companies SET plan = 'free' WHERE plan IS NULL;

-- ------------------------------------------------------------
-- 2. cars: scan counters + validity dates + video + snake_case twins
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'scan_count'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN scan_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'last_scanned_at'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN last_scanned_at TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN expiry_date TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN start_date TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'video_link'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN video_link TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN fuel_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN contact_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- Backfill the snake_case twins from the camelCase columns that already hold
-- the data, so both spellings return the same value.
UPDATE public.cars SET fuel_type      = "fuelType"      WHERE fuel_type      IS NULL AND "fuelType"      IS NOT NULL;
UPDATE public.cars SET contact_phone = "contactPhone"  WHERE contact_phone IS NULL AND "contactPhone"  IS NOT NULL;
UPDATE public.cars SET contact_email = "contactEmail"  WHERE contact_email IS NULL AND "contactEmail"  IS NOT NULL;

UPDATE public.cars SET scan_count = 0 WHERE scan_count IS NULL;
UPDATE public.cars SET is_active = true WHERE is_active IS NULL;

-- ------------------------------------------------------------
-- 3. scan_records: let the database generate an id
--    (the app also sends one, this only helps other clients)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_records' AND column_name = 'id'
  ) THEN
    EXECUTE 'ALTER TABLE public.scan_records ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
  ELSE
    ALTER TABLE public.scan_records ADD COLUMN id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Keep camelCase and snake_case in sync on every write
--
--    The admin app always writes the camelCase spelling
--    ("fuelType" / "contactPhone" / "contactEmail"), while the
--    customer views read the snake_case spelling. Whichever one
--    actually changed in this statement wins, so an edit can never
--    leave a stale value behind in the other spelling.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_car_compat_fields() RETURNS trigger AS $$
BEGIN
  -- fuel type
  IF NEW."fuelType" IS DISTINCT FROM OLD."fuelType" THEN
    NEW.fuel_type := NEW."fuelType";
  ELSIF NEW.fuel_type IS DISTINCT FROM OLD.fuel_type THEN
    NEW."fuelType" := NEW.fuel_type;
  ELSIF NEW."fuelType" IS NOT NULL THEN
    NEW.fuel_type := NEW."fuelType";
  END IF;

  -- contact phone
  IF NEW."contactPhone" IS DISTINCT FROM OLD."contactPhone" THEN
    NEW.contact_phone := NEW."contactPhone";
  ELSIF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN
    NEW."contactPhone" := NEW.contact_phone;
  ELSIF NEW."contactPhone" IS NOT NULL THEN
    NEW.contact_phone := NEW."contactPhone";
  END IF;

  -- contact email
  IF NEW."contactEmail" IS DISTINCT FROM OLD."contactEmail" THEN
    NEW.contact_email := NEW."contactEmail";
  ELSIF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN
    NEW."contactEmail" := NEW.contact_email;
  ELSIF NEW."contactEmail" IS NOT NULL THEN
    NEW.contact_email := NEW."contactEmail";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_car_compat_fields ON public.cars;
CREATE TRIGGER trg_sync_car_compat_fields
  BEFORE INSERT OR UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.sync_car_compat_fields();

-- ------------------------------------------------------------
-- 5. Make sure the anon role can still read and write everything
--    (guarded: the roles only exist on a real Supabase project)
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  r TEXT;
  roles TEXT := '';
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      roles := roles || r || ',';
    END IF;
  END LOOP;

  IF roles = '' THEN
    RAISE NOTICE 'No Supabase roles found on this server — skipping GRANT statements.';
    RETURN;
  END IF;

  roles := rtrim(roles, ',');
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %s', roles);

  FOREACH t IN ARRAY ARRAY['companies','cars','scan_records','leads','app_settings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO %s', t, roles);
  END LOOP;

  RAISE NOTICE 'Granted table privileges to: %', roles;
END $$;

-- ------------------------------------------------------------
-- 6. Verification queries (run these after the script)
-- ------------------------------------------------------------
-- SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='cars'
--     AND column_name IN ('scan_count','last_scanned_at','is_active','fuel_type')
--   ORDER BY column_name;
--   -- expect 4 rows

-- SELECT id, name, plan FROM public.companies ORDER BY name;
--   -- expect plan = 'free' for every company
