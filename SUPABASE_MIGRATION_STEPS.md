# Adding the Vehicle Specifications fields to Supabase

The Edit Car form, the customer page, the Car View page and the QR scan-result page are **already
built, committed and live**. The only thing missing is the database columns that store the values.

This guide is for adding them. It takes about a minute.

---

## What you are adding

14 new specification fields on the `cars` table. **12 of them need new columns.** Two are reused:

| Field | Column | Status |
|---|---|---|
| Body Type | `body_type` | new — text |
| Warranty Status | `warranty_status` | new — text |
| Warranty Details | `warranty_details` | new — text |
| Number of Cylinders | `cylinders` | new — integer |
| Wheel Drive System | `wheel_drive` | new — text |
| Turbo | `turbo` | new — text |
| Camera Features | `camera_features` | new — **text[]** (list) |
| Wheel Size | `wheel_size` | new — text |
| Seat Material | `seat_material` | new — text |
| Number of Seats | `number_of_seats` | new — integer |
| Car Condition | `car_condition` | new — text |
| Trim Level | `trim_level` | new — text |
| Engine Capacity | `engine` | **already exists** — reuse |
| Horsepower (HP) | `horsepower` | **already exists** — reuse |

---

## Step 1 — open the right project

Go to <https://supabase.com/dashboard> and pick the project whose reference is:

```
uifcfnkbccluhyryywxe
```

The reference is in the project URL: `supabase.com/dashboard/project/<the-reference>`.
If the ref does **not** match, stop — you are in the wrong project.

---

## Step 2 — open the SQL Editor

In the left sidebar of the project page click **SQL Editor** → **New query**.

---

## Step 3 — paste this and run it

Select everything below and paste it into the editor, then press **Run** (or Ctrl/Cmd + Enter).

> The first line must be the `--` comment. If your paste starts with the file name, delete it.

```sql
-- ============================================================
-- Vehicle Specifications for the Car record
--   project ref : uifcfnkbccluhyryywxe
--   run in      : Supabase Dashboard -> SQL Editor -> New query
--
-- HOW TO RUN
--   1. Open this file, select ALL of it, copy.
--   2. Supabase Dashboard -> your project -> SQL Editor -> New query
--   3. Paste (the first line MUST be a "--" comment, NOT the
--      file name) and press Run.
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
```

**Expected result:** `Success. No rows returned`

That is correct even though you ran `ALTER TABLE` — the query returns no rows because it does not
`SELECT` anything. Any error would be shown in red with a message.

---

## Step 4 — verify

Still in the SQL Editor, run this:

```sql
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'cars'
   AND column_name IN (
     'body_type','warranty_status','warranty_details','cylinders',
     'wheel_drive','turbo','camera_features','wheel_size',
     'seat_material','number_of_seats','car_condition','trim_level')
 ORDER BY column_name;
```

**Expected: 12 rows.**

| column_name | data_type |
|---|---|
| body_type | text |
| camera_features | ARRAY |
| car_condition | text |
| cylinders | integer |
| number_of_seats | integer |
| seat_material | text |
| trim_level | text |
| turbo | text |
| warranty_details | text |
| warranty_status | text |
| wheel_drive | text |
| wheel_size | text |

If you get **12 rows**, you are done. Nothing else is needed — the app is already live and will
start storing the fields immediately.

---

## Step 5 — confirm it works in the app

1. Open the admin panel → **Cars** → expand your dealer → **Add Car** (or edit an existing car).
2. Scroll to the **Vehicle Specifications** section.
3. Fill in a few fields — set **Car Condition** to `Clean Title` or `Painted`, pick a Body Type,
   tick a couple of Camera Features.
4. Save.
5. Reopen the car. The values are still there, and the **Specifications** block now appears on
   the customer page, the Car View page and the QR scan-result page.

If the admin panel shows *"Some fields were not saved"* instead, the migration did not run or did
not complete — go back to Step 3.

---

## Already tested

This exact SQL was executed against a real PostgreSQL engine before being handed over:

- **Runs clean** on a `cars` table that already has `engine` and `horsepower`.
- **Idempotent** — ran twice, second run is a no-op, not an error.
- **All 12 columns** created with the exact types the app writes.
- **`camera_features` accepts a `text[]`** — this is the same trap that broke an earlier
  migration in this project (assigning jsonb to a text[] column), so it is checked explicitly.
- **The full Edit Car payload saves** — including `car_condition = 'Clean Title'`,
  `cylinders = 4`, `number_of_seats = 5`, and a camera-features list.
- **Blank integer fields store as NULL** — the form sends null for empty fields.

---

## If you would rather I run it

Create a Supabase personal access token:

1. <https://supabase.com/dashboard/account/tokens>
2. **Generate new token** → name it `migrate-specs` → copy the `sbp_...` value.
3. Paste it here.

I will then run the migration and the verification myself with:

```bash
python3 run_sql_via_api.py <sbp_TOKEN> add_car_specifications.sql
```

The token is used once, in memory, and never written to disk. **Revoke it afterwards** — it is a
full-access credential for your account.

---

## Related: two other live credentials to rotate

While you are in the dashboard:

1. **The GitHub PAT.** It is embedded in `car-qr-showcase/.git/config` and was also pasted into
   an earlier chat. Revoke it in GitHub → Settings → Developer settings → Personal access
   tokens, then rewrite the remote without a token in the URL.
2. **The `service_role` API key.** It was found on disk in `car-qr-showcase/tmp/` scripts (from
   an earlier session). It is **not** in any git commit and **not** on the live site — I verified
   both — but it is a full-access key that bypasses row-level security. Rotate it in
   Dashboard → Project Settings → API Keys, and delete those `tmp/` scripts.
