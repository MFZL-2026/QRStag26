-- ============================================================
-- Scan counter trigger (optional, but recommended)
--   run in      : Supabase Dashboard -> SQL Editor -> New query
--
-- WHY
--   Every customer page view already inserts one row into
--   public.scan_records (that POST always worked). The React
--   customer page ALSO tries to update cars.scan_count, but the
--   published build on GitHub Pages was missing the .then() that
--   makes supabase-js actually send that PATCH - so the counter
--   stayed at 0.
--
--   This trigger makes the DATABASE the source of truth: every
--   scan_records insert bumps the counter on the matching car.
--   It works no matter which frontend build is published.
--
--   It is IDEMPOTENT and safe to run more than once.
--
--   DOUBLE-COUNT PROTECTION
--     A fixed frontend sends its own PATCH cars ... at the same
--     moment as the scan_records insert. To make sure a single
--     page view is counted exactly ONCE, this trigger only bumps
--     the counter when the car was not scanned in the last 5
--     seconds. Whichever of the two writes lands first wins:
--       - trigger first -> counter +1, frontend PATCH writes the
--         same absolute value (it read the pre-scan value) -> 1
--       - PATCH first   -> trigger sees a fresh last_scanned_at
--         and skips -> 1
--
-- HOW TO RUN
--   Open the file, select ALL of it, copy (the first line must be
--   a "--" comment, NOT the file name), paste into the SQL Editor
--   and press Run. You should see "Success. No rows returned".
-- ============================================================


CREATE OR REPLACE FUNCTION public.bump_car_scan_count() RETURNS trigger AS $$
BEGIN
  UPDATE public.cars
     SET scan_count      = COALESCE(scan_count, 0) + 1,
         last_scanned_at = now()
   WHERE id = NEW.car_id
     AND (last_scanned_at IS NULL OR last_scanned_at < now() - interval '5 seconds');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_car_scan_count ON public.scan_records;
CREATE TRIGGER trg_bump_car_scan_count
  AFTER INSERT ON public.scan_records
  FOR EACH ROW EXECUTE FUNCTION public.bump_car_scan_count();


-- ------------------------------------------------------------
-- Verification (run after the script)
--
-- SELECT id, "fuelType", fuel_type FROM public.cars;
--   -- camelCase and snake_case must still match
--
-- SELECT id, scan_count, last_scanned_at FROM public.cars
--  WHERE id = 'n0dlound3mmpl5djxn';
--   -- open the customer page once, then re-run: scan_count must be 1
