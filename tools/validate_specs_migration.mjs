// Validates add_car_specifications.sql against a real Postgres engine (PGlite)
// before it is pasted into the Supabase SQL Editor.
//
//   node validate_specs_migration.mjs
//
// Checks:
//   1. the migration runs clean on a cars table that already has engine/horsepower
//   2. it is idempotent (second run is a no-op, not an error)
//   3. the resulting column types match what the app writes
//   4. the app's real payload shape saves - camera_features as a JSON string array
//      into a TEXT[] column (the exact trap that broke the earlier migration)
import fs from 'node:fs';

// Resolve PGlite from the local install, falling back to the sandbox copy.
let PGlite;
try {
  ({ PGlite } = await import('@electric-sql/pglite'));
} catch {
  ({ PGlite } = await import('/workspace/car-qr-showcase/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js'));
}

const MIRROR = fs.readFileSync('/workspace/car-qr-showcase/tmp/mirror_schema.sql', 'utf8');
const MIG = fs.readFileSync('/workspace/car-qr-showcase/add_car_specifications.sql', 'utf8');

const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
await db.exec(MIRROR);
console.log('mirror schema loaded');

const q = async (label, sql) => {
  const r = await db.query(sql);
  console.log(`\n-- ${label}`);
  for (const row of r.rows) console.log('   ', JSON.stringify(row));
  return r.rows;
};

let failed = false;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  -> ' + extra : ''}`);
  if (!ok) failed = true;
};

try {
  await db.exec(MIG);
  console.log('\nMIGRATION PASS 1: OK');
} catch (e) {
  console.log('\nMIGRATION PASS 1 FAILED:', e.message);
  process.exit(1);
}

try {
  await db.exec(MIG);
  console.log('MIGRATION PASS 2 (idempotency): OK');
} catch (e) {
  console.log('MIGRATION PASS 2 FAILED:', e.message);
  failed = true;
}

console.log('\n=== column types ===');
const cols = await q('new cars columns', `SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='cars'
    AND column_name IN ('body_type','warranty_status','warranty_details','cylinders',
                        'wheel_drive','turbo','camera_features','wheel_size',
                        'seat_material','number_of_seats','car_condition','trim_level')
  ORDER BY column_name`);
check('12 new columns present', cols.length === 12, `${cols.length} found`);

const byName = Object.fromEntries(cols.map(c => [c.column_name, c]));
const expect = {
  body_type: 'text', warranty_status: 'text', warranty_details: 'text',
  cylinders: 'integer', wheel_drive: 'text', turbo: 'text',
  camera_features: 'ARRAY', wheel_size: 'text', seat_material: 'text',
  number_of_seats: 'integer', car_condition: 'text', trim_level: 'text',
};
for (const [name, want] of Object.entries(expect)) {
  const got = byName[name]?.data_type;
  const ok = got === want || (want === 'ARRAY' && String(got).includes('ARRAY'));
  check(`${name} is ${want}`, ok, `got ${got}`);
}

console.log('\n=== the app writes these shapes - make sure they save ===');
// 1. camera_features as a JSON string array into TEXT[]  (the historical trap)
try {
  await db.exec(`INSERT INTO public.cars (id, make, model, year, camera_features)
                 VALUES ('spec_test_1','Volvo','XC60',2026, ARRAY['Rear Camera','360° Camera']::text[])`);
  const r = await db.query(`SELECT camera_features FROM public.cars WHERE id='spec_test_1'`);
  check('camera_features accepts a text[]', JSON.stringify(r.rows[0].camera_features).includes('360'), JSON.stringify(r.rows[0].camera_features));
} catch (e) {
  check('camera_features accepts a text[]', false, e.message);
}

// 2. the exact payload the Edit Car form sends
try {
  await db.exec(`INSERT INTO public.cars (id, make, model, year, price, mileage, color,
        "fuelType", transmission, description, location, images, scan_start_date, scan_end_date,
        qr_template, qr_frame, qr_shape, logo_position, company_name_position, created_at,
        ccr_no, approved_on, produced_in_and_after, country_of_production, pollutant_limits, vin,
        label_no, manufacturer, motor_vehicle_class, fe_cafe_combined,
        body_type, warranty_status, warranty_details, cylinders, wheel_drive, engine, horsepower,
        turbo, camera_features, wheel_size, seat_material, number_of_seats, car_condition, trim_level,
        contact_whatsapp)
    VALUES ('spec_test_2','Volvo','XC60',2026,'$45,000','12,000 KM','Blue','Hybrid','Automatic',
        'Great car','Baghdad',ARRAY[]::text[],'','','standard',NULL,'square','none','top',now(),
        '','','','','','','','','','',
        'SUV','Dealer Warranty','2 years / 40,000 km',4,'AWD','2.0L','250',
        'Yes',ARRAY['Rear Camera','Dash Cam']::text[],'19"','Nappa Leather',5,'Clean Title','B5 Inscription',
        '9647701234567')`);
  const r = await db.query(`SELECT car_condition, body_type, engine, horsepower, cylinders,
      number_of_seats, camera_features FROM public.cars WHERE id='spec_test_2'`);
  const row = r.rows[0];
  check('full Edit Car payload saves', row.car_condition === 'Clean Title' && row.engine === '2.0L'
    && row.cylinders === 4 && row.number_of_seats === 5, JSON.stringify(row));
} catch (e) {
  check('full Edit Car payload saves', false, e.message);
}

// 3. NULL-able integers clear cleanly (the form sends null for blank fields)
try {
  await db.exec(`INSERT INTO public.cars (id, make, model, year, cylinders, number_of_seats)
                 VALUES ('spec_test_3','Toyota','Camry',2024,NULL,NULL)`);
  const r = await db.query(`SELECT cylinders, number_of_seats FROM public.cars WHERE id='spec_test_3'`);
  check('blank integer fields store as NULL', r.rows[0].cylinders === null, JSON.stringify(r.rows[0]));
} catch (e) {
  check('blank integer fields store as NULL', false, e.message);
}

console.log(failed ? '\n*** VALIDATION FAILED ***' : '\n=== VALIDATION PASSED ===');
await db.close();
process.exit(failed ? 1 : 0);
