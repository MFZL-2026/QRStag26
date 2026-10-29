-- ============================================================
-- Migration for the RESTORED Supabase project
--   project ref : uifcfnkbccluhyryywxe
--   run in      : Supabase Dashboard -> SQL Editor -> New query
--
-- HOW TO RUN
--   1. Open the file, select ALL of it, copy.
--   2. Supabase Dashboard -> your project -> SQL Editor -> New query
--   3. Paste (make sure the first line is a "--" comment, NOT the
--      file name) and press Run.
--   4. You should see "Success. No rows returned".
--
-- WHY
--   The restored database still carries the ORIGINAL schema, which is
--   missing columns the current app writes to. PostgREST rejects the WHOLE
--   request when a payload contains an unknown key, so every missing column
--   silently breaks one feature:
--
--     companies.plan / branding_color / branding_logo / custom_price
--                                   -> saving a company fails (PGRST204)
--     cars.scan_count / last_scanned_at
--                                   -> the customer-page scan counter fails
--     cars.is_active                 -> the "Active" filter fails
--     cars.video_link                -> the video field on the QR page fails
--     cars.fuel_type / contact_phone / contact_email
--                                   -> snake_case twins of the camelCase
--                                      columns the customer views read
--     cars.approved_on, produced_in_and_after, country_of_production,
--     cars.motor_vehicle_class, fe_cafe_combined
--                                   -> regulatory block on the QR page fails
--     cars.expiry_date / start_date  -> listing validity dates fail
--     leads.interest_level / notes   -> the "Get in Touch" form fails
--     app_settings.app_name          -> the customer page settings read fails
--
--   The app is written to survive this (it drops unknown columns and
--   retries), but a dropped column means the data is NOT stored. This
--   script is what actually makes those fields persist.
--
--   The script is IDEMPOTENT: safe to run more than once, and safe on a
--   database that already has the columns.
-- ============================================================


-- ------------------------------------------------------------
-- 1. companies: plan + branding + customisation
-- ------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS custom_price INTEGER;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS custom_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS branding_color TEXT DEFAULT '#3b82f6';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS branding_logo TEXT DEFAULT '';

UPDATE public.companies SET plan = 'free' WHERE plan IS NULL;
UPDATE public.companies SET branding_color = '#3b82f6' WHERE branding_color IS NULL OR branding_color = '';
UPDATE public.companies SET custom_features = '[]'::jsonb WHERE custom_features IS NULL;


-- ------------------------------------------------------------
-- 2. cars: scan counters, validity dates, video, regulatory fields
-- ------------------------------------------------------------
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS expiry_date TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS video_link TEXT;

-- snake_case twins of the camelCase columns
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- regulatory block shown on the customer QR page
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS approved_on TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS produced_in_and_after TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS country_of_production TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS motor_vehicle_class TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS fe_cafe_combined TEXT;

UPDATE public.cars SET scan_count = 0 WHERE scan_count IS NULL;
UPDATE public.cars SET is_active = true WHERE is_active IS NULL;

-- Copy the existing camelCase values into the snake_case twins so both
-- spellings return the same value from day one.
UPDATE public.cars SET fuel_type      = "fuelType"     WHERE fuel_type      IS NULL AND "fuelType"     IS NOT NULL;
UPDATE public.cars SET contact_phone = "contactPhone" WHERE contact_phone IS NULL AND "contactPhone" IS NOT NULL;
UPDATE public.cars SET contact_email = "contactEmail" WHERE contact_email IS NULL AND "contactEmail" IS NOT NULL;


-- ------------------------------------------------------------
-- 3. leads: the "Get in Touch" form fields
-- ------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_level TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id TEXT;


-- ------------------------------------------------------------
-- 4. scan_records: let the database generate ids and store extras
-- ------------------------------------------------------------
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- The app always sends an id, but give the column a default as well so
-- other clients (and manual inserts) work.
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.scan_records ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;


-- ------------------------------------------------------------
-- 5. app_settings: the customer page reads app_name
-- ------------------------------------------------------------
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'Car QR Showcase';

UPDATE public.app_settings SET app_name = 'Car QR Showcase' WHERE app_name IS NULL OR app_name = '';


-- ------------------------------------------------------------
-- 6. Keep camelCase and snake_case in sync on every write
--
--    The admin app always writes the camelCase spelling
--    ("fuelType" / "contactPhone" / "contactEmail"), while the
--    customer views read the snake_case spelling. Whichever one
--    actually changed in this statement wins, so an edit can never
--    leave a stale value behind in the other spelling.
--
--    NULLs never overwrite a real value, and the INSERT branch is
--    handled separately (OLD is not assigned on INSERT).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_car_compat_fields() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.fuel_type      := COALESCE(NEW."fuelType",     NEW.fuel_type);
    NEW."fuelType"     := COALESCE(NEW."fuelType",     NEW.fuel_type);
    NEW.contact_phone  := COALESCE(NEW."contactPhone", NEW.contact_phone);
    NEW."contactPhone" := COALESCE(NEW."contactPhone", NEW.contact_phone);
    NEW.contact_email  := COALESCE(NEW."contactEmail", NEW.contact_email);
    NEW."contactEmail" := COALESCE(NEW."contactEmail", NEW.contact_email);
    RETURN NEW;
  END IF;

  -- fuel type
  IF NEW."fuelType" IS DISTINCT FROM OLD."fuelType" THEN
    IF NEW."fuelType" IS NOT NULL THEN
      NEW.fuel_type := NEW."fuelType";
    END IF;
  ELSIF NEW.fuel_type IS DISTINCT FROM OLD.fuel_type THEN
    IF NEW.fuel_type IS NOT NULL THEN
      NEW."fuelType" := NEW.fuel_type;
    END IF;
  END IF;

  -- contact phone
  IF NEW."contactPhone" IS DISTINCT FROM OLD."contactPhone" THEN
    IF NEW."contactPhone" IS NOT NULL THEN
      NEW.contact_phone := NEW."contactPhone";
    END IF;
  ELSIF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN
    IF NEW.contact_phone IS NOT NULL THEN
      NEW."contactPhone" := NEW.contact_phone;
    END IF;
  END IF;

  -- contact email
  IF NEW."contactEmail" IS DISTINCT FROM OLD."contactEmail" THEN
    IF NEW."contactEmail" IS NOT NULL THEN
      NEW.contact_email := NEW."contactEmail";
    END IF;
  ELSIF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN
    IF NEW.contact_email IS NOT NULL THEN
      NEW."contactEmail" := NEW.contact_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_car_compat_fields ON public.cars;
CREATE TRIGGER trg_sync_car_compat_fields
  BEFORE INSERT OR UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.sync_car_compat_fields();


-- ------------------------------------------------------------
-- 7. Make sure the anon role can read and write everything
--
--    These three roles always exist on a Supabase project, so the
--    GRANTs are safe to run directly (no conditional block needed).
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies    TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars         TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_records TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads        TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated, service_role;


-- ------------------------------------------------------------
-- 8. Verification queries (run these after the script)
-- ------------------------------------------------------------
-- SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='cars'
--     AND column_name IN ('scan_count','last_scanned_at','is_active','fuel_type')
--   ORDER BY column_name;
--   -- expect 4 rows
--
-- SELECT id, name, plan FROM public.companies ORDER BY name;
--   -- expect plan = 'free' for every company
--
-- SELECT id, "fuelType", fuel_type FROM public.cars;
--   -- expect the camelCase and snake_case values to match
