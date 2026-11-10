// Verifies the DEPLOYED site renders the Vehicle Specifications block.
//
//   node intake/verify_live_specs.cjs
//
// It loads the live GitHub Pages customer page and QR scan-result page with a
// mocked Supabase response (so the real scan counter is never touched) and
// asserts every specification field is on the page.
//
// To see the block for real, a vehicle must have spec data saved - use the
// admin panel to fill the Vehicle Specifications section of any car.
const { chromium } = require('/usr/local/lib/node_modules/playwright');

const BASE = process.env.LIVE_BASE || 'https://mfzl-2026.github.io/QRStag26';
const CAR = process.env.CAR_ID || 'n0dlound3mmpl5djxn';

const CAR_ROW = {
  id: CAR, company_id: 'comp1', make: 'Volvo', model: 'XC60', year: 2026,
  price: '$45,000', mileage: '12,000 KM', color: 'Blue',
  fuelType: 'Hybrid', fuel_type: 'Hybrid', transmission: 'Automatic',
  description: 'Excellent condition - sunroof - leather seats - reverse camera',
  location: 'Baghdad', images: [], contactPhone: '07701234567',
  contact_phone: '07701234567', contactEmail: 'sales@mkma.com',
  contact_email: 'sales@mkma.com', contactWhatsApp: '9647701234567',
  contact_whatsapp: '9647701234567', videoLink: '', qr_template: 'standard',
  qr_frame: null, qr_shape: 'square', logo_position: 'none',
  company_name_position: 'top', is_active: true, scan_start_date: '',
  scan_end_date: '', scan_count: 267,
  body_type: 'SUV', car_condition: 'Clean Title', trim_level: 'B5 Inscription',
  engine: '2.0L', horsepower: '250', cylinders: 4, wheel_drive: 'AWD', turbo: 'Yes',
  camera_features: ['Rear Camera', '360° Camera', 'Dash Cam'], wheel_size: '19"',
  seat_material: 'Nappa Leather', number_of_seats: 5,
  warranty_status: 'Dealer Warranty', warranty_details: '2 years / 40,000 km'
};

const EXPECT = ['Specifications', 'Body Type', 'Clean Title', 'Nappa Leather',
  '250 HP', '360° Camera', 'Dealer Warranty', '19"', 'AWD', 'SUV',
  'B5 Inscription', '2.0L', '5'];

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  const surfaces = [
    ['Customer Car Details Page', `${BASE}/index-customer.html?car=${CAR}`, 'live-customer'],
    ['QR Scan Result Page', `${BASE}/customer-standalone.html?car=${CAR}`, 'live-qr'],
  ];
  for (const [name, url, shot] of surfaces) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1500 } });
    const page = await ctx.newPage();
    await page.route('**/rest/v1/**', async route => {
      const req = route.request();
      if (req.method() !== 'GET') {
        return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
      }
      const u = req.url();
      const single = (req.headers()['accept'] || '').includes('pgrst.object');
      let body = [];
      if (u.includes('/cars')) body = single ? CAR_ROW : [CAR_ROW];
      else if (u.includes('/companies')) body = single ? { id: 'comp1', name: 'MKMA Showroom', branding_logo: '' } : [{ id: 'comp1', name: 'MKMA Showroom', branding_logo: '' }];
      else if (u.includes('/app_settings')) body = single ? { id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' } : [{ id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' }];
      await route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'Content-Range': '0-0/1' }, body: JSON.stringify(body)
      });
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body.innerText);
    const missing = EXPECT.filter(k => !text.includes(k));
    console.log(`\n=== LIVE ${name} ===`);
    console.log(`  ${EXPECT.length - missing.length}/${EXPECT.length} markers present`);
    if (missing.length) { console.log('  MISSING:', missing.join(', ')); failures += missing.length; }
    else console.log('  ✅ all specification fields render on the deployed site');
    await page.screenshot({ path: `${__dirname}/qa/${shot}.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(failures === 0 ? '\n✅ LIVE SITE VERIFIED' : `\n❌ ${failures} missing`);
  process.exit(failures === 0 ? 0 : 1);
})();
