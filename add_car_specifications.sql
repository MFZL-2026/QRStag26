-- ============================================================
-- Vehicle Specifications for the Car record
--   project ref : uifcfnkbccluhyryywxe
--   run in      : Supabase Dashboard -> SQL Editor -> New query
--
-- HOW TO RUN
--   1. Open this file, select ALL of it, copy.
--   2. Supabase Dashboard -> your project -> SQL Editor -> New query
--   3. Paste (the first line MUST be a "--" comment, NOT the file name)
--      and press Run.
--   4. You should see "Success. No rows returned".
--
-- WHY
--   14 new vehicle specification fields for the Car Edit Form, so a
--   vehicle profile shows a complete spec sheet instead of four fields:
--
--     body_type        Car Body Type          Sedan / SUV / Coupe / ...
--     warranty_status  Warranty Status        dropdown
--     warranty_details Warranty Details       free text
--     cylinders        Number of Cylinders    3 / 4 / 5 / 6 / 8 / ...
--     wheel_drive      Wheel Drive System     FWD / RWD / AWD / 4WD
--     turbo            Turbo                  Yes / No
--     camera_features  Camera Features        TEXT[] multi-select
--     wheel_size       Wheel Size             e.g. 18"
--     seat_material    Seat Material          Leather / Fabric / ...
--     number_of_seats  Number of Seats        integer
--     car_condition    Car Condition          New / Used / Certified ...
--     trim_level       Trim Level             e.g. Sport, Luxury
--
--   TWO FIELDS ARE REUSED, NOT RE-CREATED
--     engine      already exists (TEXT, values like '2.5 L') -> Engine Capacity
--     horsepower  already exists (TEXT, values like '203')    -> Horsepower (HP)
--     Both were previously unreachable: they had no input in the Edit Car
--     form and were never shown to the customer. This script does NOT
--     touch them - only the app now writes and reads them.
--
--   The legacy `condition` column is left alone. It already holds values
--   like 'Good' / 'Excellent', which are incompatible with the new
--   New / Used / Certified Pre-Owned scale, so the new field uses its own
--   `car_condition` column instead.
--
--   PostgREST rejects the WHOLE request when a payload contains an
--   unknown key, so until this script is run the app will save the car
--   but drop the new fields, and the admin panel will show
--   "Some fields were not saved". That is expected and safe.
--
--   The script is IDEMPOTENT: safe to run more than once, and safe on a
--   database that already has the columns.
--
--   TYPE NOTE
--     camera_features is TEXT[] (a plain list of strings), exactly like
--     companies.custom_features on this project. It must NOT be forced to
--     jsonb - assigning a jsonb value to a TEXT[] column fails with
--     "column is of type text[] but expression is of type jsonb".
--
-- VERIFICATION (run after the script)
--   SELECT column_name, data_type
--     FROM information_schema.columns
--    WHERE table_name = 'cars'
--      AND column_name IN ('body_type','warranty_status','warranty_details',
--                           'cylinders','wheel_drive','turbo','camera_features',
--                           'wheel_size','seat_material','number_of_seats',
--                           'car_condition','trim_level');
--   -- expect 12 rows
-- ============================================================


-- ------------------------------------------------------------
-- Vehicle Specifications
-- ------------------------------------------------------------
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS warranty_status TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS warranty_details TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS cylinders INTEGER;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS wheel_drive TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS turbo TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS camera_features TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS wheel_size TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS seat_material TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS number_of_seats INTEGER;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS car_condition TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS trim_level TEXT;

-- Normalise the multi-select column so it is never NULL
UPDATE public.cars SET camera_features = '{}'::text[] WHERE camera_features IS NULL;

-- Make sure the two reused columns really exist (they are normally
-- already present; this only covers a fresh/partial database)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS engine TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS horsepower TEXT;
