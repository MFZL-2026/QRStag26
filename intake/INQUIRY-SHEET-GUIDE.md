# Vehicle Inquiry Sheet & Intake Ledger — Guide

Standardised paperwork for onboarding vehicles into **Car QR Showcase**.

Built **from the live Edit Car form** (`car-qr-showcase/src/App.tsx`), so every field on the
sheet exists in the form and every dropdown offers only values the form accepts. Nothing here
is invented.

Updated 2026-11-09 for the new **Vehicle Specifications** fields (body type, warranty, cylinders,
wheel drive, engine capacity, horsepower, turbo, cameras, wheel size, seat material, seats,
condition, trim level).

---

## The kit

| File | What it is | Use it for |
|---|---|---|
| `Vehicle-Inquiry-Sheet.pdf` | 4 pages, A4 — **pages 1–2 are the sheet**, pages 3–4 are the operator reference | Print one per vehicle, hand to the dealer, fill in |
| `Vehicle-Intake-Ledger.xlsx` | 4 sheets: Instructions, Vehicle Intake Ledger (51 columns), Bulk Import CSV, Valid Values | Digital batch entry + one-click CSV for bulk import |
| `Vehicle-Bulk-Import-Template.csv` | Header row + 2 example rows | The simplest path — open in Excel, fill, upload |
| `build_inquiry_sheet.py` / `build_ledger.py` | Generators | Regenerate if the Edit Car form changes |
| `verify_specs.cjs` / `verify_form.cjs` | Playwright checks | Prove the new spec fields render on all three surfaces |

---

## The four things that will bite you

### 1. There is no separate "features" field
The customer QR page renders **Description, fuel type, colour, mileage, price, photos, location,
the full specifications block and the contact details**. That is all.

`cars.features` and `cars.owners` still exist as database columns but have **no input in the Edit
Car form and are never shown to the customer.** Everything else — engine, horsepower,
condition, seats, trim — now has a real field.

→ Don't collect features and owners separately. Put that content into **Description**.

### 2. Make and Model are the only hard blocks
The form refuses to save without both. Everything else can be empty and completed later.
**Set Make before Model** — changing the Make clears the Model.

### 3. The comma trap (bulk import only)
The admin bulk importer splits each row on commas (`src/App.tsx` → `parseCSV`). A single comma
inside **Description** or **Location** shifts every column after it and corrupts the row.

→ Use a hyphen or semicolon: `Excellent condition - sunroof - leather seats - reverse camera`

The Edit Car form itself is not affected. The ledger's **Comma check** column flags it, and the
**Bulk Import CSV** sheet neutralises commas automatically on export.

### 4. The bulk importer only carries 12 fields
The CSV importer reads exactly: `make, model, year, price, mileage, fuelType, transmission,
color, description, contactPhone, contactEmail, location`.

**The new vehicle specifications are not in the CSV.** Import a batch, then open each car in the
Edit Car form and fill in the Vehicle Specifications section — or enter each vehicle through the
form in the first place.

---

## Field map — sheet → Edit Car form

| Sheet section | Field on the sheet | Edit Car form field | Notes |
|---|---|---|---|
| A | Dealer / company | `Company` | The dealer account the vehicle belongs to |
| A | Make * | `Make` | 19 options + "+ Other (Enter Manually)" |
| A | Model * | `Model` | Depends on Make. Changing Make clears Model |
| A | Year | `Year` | Numeric |
| A | VIN / chassis no. | `VIN` (regulatory) | The only VIN input on the form |
| A | Country of origin | `Country of Production` | Regulatory block |
| A | Body type | `Body Type` | Dropdown |
| A | Car condition | `Car Condition` | Dropdown: New / Used / Certified Pre-Owned / … |
| A | Trim level | `Trim Level` | Free text with suggestions |
| B | Price | `Price` | Free text, keep the currency symbol |
| B | Mileage | `Mileage` | Free text, keep the unit |
| B | Location | `Location` | Shown on the customer page |
| B | Colour | `Color` | 13 dropdown values |
| B | Fuel type | `Fuel Type` | 8 dropdown values |
| B | Transmission | `Transmission` | 5 dropdown values |
| B | Engine capacity | `Engine Capacity` | Free text with suggestions (e.g. 2.0L) |
| B | Horsepower (HP) | `Horsepower (HP)` | Numeric |
| B | Number of cylinders | `Number of Cylinders` | Dropdown |
| B | Wheel drive system | `Wheel Drive System` | Dropdown: FWD / RWD / AWD / 4WD |
| B | Turbo | `Turbo` | Dropdown: Yes / No / Twin-Turbo / Supercharged |
| B | Number of owners | `Description` | **No dedicated field** |
| C | Standard features + description | `Description` | The main text the buyer reads |
| D | Phone / WhatsApp / Email | `Phone`, `WhatsApp`, `Email` | WhatsApp strips a leading `00` automatically |
| D | Video link | `Video Link` | URL |
| E | Regulatory block (10 fields) | `Vehicle Regulatory Information` | All map 1:1 |
| F | Photos supplied | `Car Photos (up to 10)` | Max 10, auto-compressed to 100 KB |
| G | Number of seats | `Number of Seats` | Numeric |
| G | Seat material | `Seat Material` | Dropdown |
| G | Wheel size | `Wheel Size` | Free text with suggestions |
| G | Warranty status / details | `Warranty Status` / `Warranty Details` | Dropdown + free text |
| G | Camera features | `Camera Features` | Tick all that apply (multi-select) |
| H | Sign-off | — | Operational, not stored |
| — | Scan start / end date | `QR Scan Timeframe` | Optional. Blank = QR always live |
| — | QR template / frame / shape / logo / name position | QR print settings | Operator picks. Defaults: standard, square, no logo, name on top |

---

## Where the specifications appear

All 14 fields are saved on the vehicle record and displayed on **three** surfaces:

1. **Customer Car Details Page** — `src/CustomerApp.tsx`, reached at `index-customer.html?car=…`
2. **Car View Page** — the admin's public "Car Details" view, `src/App.tsx` → `viewingCarId`
3. **QR Code Scan Result Page** — `customer-standalone.html`, the standalone page that records the scan

Each shows a **Specifications** block (2 columns on mobile, 3 on desktop) that only appears when
the vehicle actually has specification data — existing cars keep their current look.

---

## Valid values (the only ones the form accepts)

**Colour** — White, Black, Silver, Gray, Red, Blue, Green, Yellow, Orange, Brown, Beige, Gold, Other

**Fuel type** — Gasoline, Diesel, Electric, Hybrid, Plug-in Hybrid, CNG, LPG, Other

**Transmission** — Automatic, Manual, Semi-Automatic, CVT, Other

**Body type** — Sedan, SUV, Crossover, Coupe, Hatchback, Wagon, Station Wagon, Convertible,
Pickup Truck, Van, Minivan, Truck

**Car condition** — New, Used, Certified Pre-Owned, Demonstrator, Ex-Fleet, Rebuilt, Salvage

**Wheel drive** — FWD, RWD, AWD, 4WD

**Turbo** — Yes, No, Twin-Turbo, Supercharged

**Cylinders** — 3, 4, 5, 6, 8, 10, 12

**Seat material** — Leather, Nappa Leather, Alcantara, Fabric, Suede, Vinyl, Leather & Fabric, Other

**Warranty status** — Factory Warranty, Dealer Warranty, Under Warranty, Expired, Not Warrantied,
Extended Warranty

**Camera features** — Rear Camera, Front Camera, 360° Camera, Blind Spot Camera, Dash Cam,
Parking Sensors Front, Parking Sensors Rear, Underbody Camera, Surround View Monitor

**Make** — Toyota, Honda, Ford, Chevrolet, BMW, Mercedes-Benz, Audi, Nissan, Hyundai, Kia,
Volkswagen, Tesla, Porsche, Lexus, Mazda, Subaru, Jeep, Land Rover, Volvo (+ manual entry)

**Models** are per-make; the full list is on the ledger's *Valid Values* sheet (and it feeds the
dependent Model dropdown live).

**QR template** — standard, luxury, classic, bold, minimalist, sports, eco, ev, hybrid, plugin_hybrid
**QR shape** — square, rounded_xs/sm/md/lg/xl, pill, circle, circle_md, octagon, hexagon, diamond
**Logo position** — none, top, center, bottom
**Company name position** — none, top, bottom

---

## ⚠️ Run the migration first

The new columns must exist in Supabase before the fields will save. The app survives without them
(it drops unknown columns and retries) — but the data would not be stored, and the admin panel
would show *"Some fields were not saved"*.

Run **`car-qr-showcase/add_car_specifications.sql`** once in the Supabase SQL Editor. It is
idempotent — safe to run more than once.

Two of the fourteen fields **reuse existing columns** rather than adding new ones:
`engine` (Engine Capacity) and `horsepower` (Horsepower). They already existed but had no form
input and were never shown to the customer.

---

## Regenerating

```bash
cd car-qr-showcase/intake
python3 build_inquiry_sheet.py > inquiry_sheet.html
bash /workspace/.skills/pdf/scripts/make.sh render \
  --in inquiry_sheet.html --out Vehicle-Inquiry-Sheet.pdf --format A4 --wait 3000

python3 build_ledger.py
python3 /workspace/.skills/xlsx/scripts/recalc.py Vehicle-Intake-Ledger.xlsx 120
```

Both generators carry the option lists as plain Python constants at the top — update those if the
Edit Car form's dropdowns change, and re-run.
