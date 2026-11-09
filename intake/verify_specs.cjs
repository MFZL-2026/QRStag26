// Functional verification: renders the BUILT app on all three surfaces with a
// mocked Supabase response containing every new vehicle specification field,
// and asserts the field labels + values are actually on the page.
const { chromium } = require('/usr/local/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';

const MOCK_CAR = {
  id: 'testcar123', company_id: 'comp1',
  make: 'Volvo', model: 'XC60', year: 2026,
  price: '$45,000', mileage: '12,000 KM', color: 'Blue',
  fuelType: 'Hybrid', fuel_type: 'Hybrid', transmission: 'Automatic',
  description: 'Excellent condition - sunroof - leather seats - reverse camera',
  location: 'Baghdad', images: [],
  contactPhone: '07701234567', contact_phone: '07701234567',
  contactEmail: 'sales@mkma.com', contact_email: 'sales@mkma.com',
  contactWhatsApp: '9647701234567', contact_whatsapp: '9647701234567',
  videoLink: '', video_link: '',
  qr_template: 'standard', qr_frame: null, qr_shape: 'square',
  logo_position: 'none', company_name_position: 'top',
  expiry_date: '', start_date: '', is_active: true,
  scan_start_date: '', scan_end_date: '', scan_count: 12,
  ccr_no: 'CCR123', approved_on: '2024-01-15', produced_in_and_after: '2024',
  country_of_production: 'Sweden', pollutant_limits: 'Euro 6',
  vin: 'YV1XXAEB5LA123456', label_no: 'LBL-77', manufacturer: 'Volvo',
  motor_vehicle_class: 'Class 1', fe_cafe_combined: '22 MPG',
  // ---- the 14 new specification fields ----
  body_type: 'SUV',
  car_condition: 'Certified Pre-Owned',
  trim_level: 'B5 Inscription',
  engine: '2.0L',
  horsepower: '250',
  cylinders: 4,
  wheel_drive: 'AWD',
  turbo: 'Yes',
  camera_features: ['Rear Camera', '360° Camera', 'Dash Cam'],
  wheel_size: '19"',
  seat_material: 'Nappa Leather',
  number_of_seats: 5,
  warranty_status: 'Dealer Warranty',
  warranty_details: '2 years / 40,000 km',
  created_at: '2026-11-01T10:00:00Z'
};
const MOCK_COMPANY = { id: 'comp1', name: 'MKMA Showroom', branding_logo: '', branding_color: '#3b82f6' };
const MOCK_SETTINGS = { id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' };

// label -> expected value on the page
const EXPECT = [
  ['Body Type', 'SUV'],
  ['Condition', 'Certified Pre-Owned'],
  ['Trim', 'B5 Inscription'],
  ['Engine Capacity', '2.0L'],
  ['Horsepower', '250 HP'],
  ['Cylinders', '4'],
  ['Wheel Drive', 'AWD'],
  ['Turbo', 'Yes'],
  ['Seats', '5'],
  ['Seat Material', 'Nappa Leather'],
  ['Wheel Size', '19"'],
  ['Warranty', 'Dealer Warranty'],
  ['Warranty Details', '2 years / 40,000 km'],
  ['Camera Features', 'Rear Camera, 360° Camera, Dash Cam'],
];

async function mockSupabase(page) {
  await page.route('**/rest/v1/**', async route => {
    const url = route.request().url();
    const accept = (route.request().headers()['accept'] || '');
    const single = accept.includes('pgrst.object');
    let body = [];
    if (url.includes('/cars')) body = single ? MOCK_CAR : [MOCK_CAR];
    else if (url.includes('/companies')) body = single ? MOCK_COMPANY : [MOCK_COMPANY];
    else if (url.includes('/app_settings')) body = single ? MOCK_SETTINGS : [MOCK_SETTINGS];
    else if (url.includes('/scan_records')) body = [];
    else if (url.includes('/leads')) body = [];
    else body = [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Content-Range': '0-0/1' },
      body: JSON.stringify(body)
    });
  });
}

(async () => {
  const browser = await chromium.launch();
  let failures = 0;

  const surfaces = [
    { name: 'Customer Car Details Page', url: `${BASE}/index-customer.html?car=testcar123`, shot: 'v-customer' },
    { name: 'QR Scan Result Page (standalone)', url: `${BASE}/customer-standalone.html?car=testcar123`, shot: 'v-standalone' },
    { name: 'Car View Page (admin public view)', url: `${BASE}/index.html?car=testcar123`, shot: 'v-adminview', admin: true },
  ];

  for (const s of surfaces) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1400 } });
    const page = await ctx.newPage();
    if (s.admin) {
      await page.addInitScript(() => {
        localStorage.setItem('carqr_logged_in', 'true');
        localStorage.setItem('carqr_admin_password', 'admin123');
        localStorage.setItem('carqr_current_user', JSON.stringify({ email: 'admin@carqr.io', name: 'Admin', role: 'super_admin' }));
      });
    }
    await mockSupabase(page);
    await page.goto(s.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500);

    const text = await page.evaluate(() => document.body.innerText);
    const missing = [];
    for (const [label, value] of EXPECT) {
      const hasLabel = text.includes(label);
      const hasValue = text.includes(value);
      if (!hasLabel || !hasValue) missing.push(`${label}${hasLabel ? '' : ' [label missing]'}${hasValue ? '' : ' [value missing]'}`);
    }
    const hasSpecHeading = /Specifications/i.test(text);

    console.log(`\n=== ${s.name} ===`);
    console.log(`  url: ${s.url}`);
    console.log(`  "Specifications" heading present: ${hasSpecHeading}`);
    console.log(`  fields verified: ${EXPECT.length - missing.length}/${EXPECT.length}`);
    if (missing.length) { console.log('  MISSING:'); missing.forEach(m => console.log('    - ' + m)); failures += missing.length; }
    else console.log('  all 14 new specification fields render correctly');

    await page.screenshot({ path: `/workspace/car-qr-showcase/intake/qa/${s.shot}.png`, fullPage: true });
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\n✅ ALL SURFACES VERIFIED' : `\n❌ ${failures} problem(s)`);
  process.exit(failures === 0 ? 0 : 1);
})();
