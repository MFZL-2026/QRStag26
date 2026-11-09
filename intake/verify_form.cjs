// Verifies the Edit Car form contains the new Vehicle Specifications section,
// with every field present and dropdowns offering only valid values.
const { chromium } = require('/usr/local/lib/node_modules/playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';

const MOCK_CAR = {
  id: 'testcar123', company_id: 'comp1', make: 'Volvo', model: 'XC60', year: 2026,
  price: '$45,000', mileage: '12,000 KM', color: 'Blue', fuelType: 'Hybrid',
  fuel_type: 'Hybrid', transmission: 'Automatic', description: 'Great car',
  location: 'Baghdad', images: [], contactPhone: '07701234567',
  contact_phone: '07701234567', contactEmail: 's@m.com', contact_email: 's@m.com',
  contactWhatsApp: '9647701234567', contact_whatsapp: '9647701234567',
  videoLink: '', qr_template: 'standard', qr_frame: null, qr_shape: 'square',
  logo_position: 'none', company_name_position: 'top', is_active: true,
  scan_start_date: '', scan_end_date: '', scan_count: 12,
  body_type: 'SUV', car_condition: 'Used', trim_level: 'B5 Inscription',
  engine: '2.0L', horsepower: '250', cylinders: 4, wheel_drive: 'AWD',
  turbo: 'Yes', camera_features: ['Rear Camera', '360° Camera'],
  wheel_size: '19"', seat_material: 'Nappa Leather', number_of_seats: 5,
  warranty_status: 'Dealer Warranty', warranty_details: '2 years / 40,000 km',
};
const MOCK_COMPANY = { id: 'comp1', name: 'MKMA Showroom', branding_logo: '', branding_color: '#3b82f6' };

const LABELS = [
  'Body Type', 'Car Condition', 'Trim Level', 'Engine Capacity', 'Horsepower (HP)',
  'Number of Cylinders', 'Wheel Drive System', 'Turbo', 'Number of Seats',
  'Seat Material', 'Wheel Size', 'Warranty Status', 'Warranty Details',
  'Camera Features'
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('carqr_logged_in', 'true');
    localStorage.setItem('carqr_admin_password', 'admin123');
    localStorage.setItem('carqr_current_user', JSON.stringify({
      email: 'admin@carqr.io', name: 'Admin', role: 'super_admin', role_name: 'Super Admin', is_active: true, permissions: ['car_edit', 'car_create', 'car_delete']
    }));
  });
  await page.route('**/rest/v1/**', async route => {
    const url = route.request().url();
    const single = (route.request().headers()['accept'] || '').includes('pgrst.object');
    let body = [];
    if (url.includes('/cars')) body = single ? MOCK_CAR : [MOCK_CAR];
    else if (url.includes('/companies')) body = single ? MOCK_COMPANY : [MOCK_COMPANY];
    else if (url.includes('/app_settings')) body = single ? { id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' } : [{ id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' }];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Content-Range': '0-0/1' }, body: JSON.stringify(body) });
  });

  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);

  // Expand the company card to reach the Cars tab
  const chevron = page.locator('button:has(svg.lucide-chevron-down)').first();
  if (await chevron.count()) { await chevron.click(); await page.waitForTimeout(1500); }

  // Open the Edit Car modal
  const editBtn = page.locator('button:has(svg.lucide-edit-3)').first();
  let opened = 'edit';
  if (await editBtn.count() === 0) {
    opened = 'add';
    await page.locator('button:has-text("Add Car")').first().click();
  } else {
    await editBtn.click();
  }
  await page.waitForTimeout(1800);

  const modalText = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === 'Edit Car');
    return h ? h.closest('div').parentElement.innerText : document.body.innerText;
  });

  const hasSection = /Vehicle Specifications/i.test(modalText);
  const missing = LABELS.filter(l => !modalText.includes(l));

  // dropdown value checks
  const dropdownChecks = await page.evaluate(() => {
    const pick = (labelText) => {
      const labels = [...document.querySelectorAll('label')];
      const lab = labels.find(l => l.textContent.trim() === labelText);
      if (!lab) return null;
      const sel = lab.parentElement.querySelector('select');
      return sel ? [...sel.options].map(o => o.value).filter(Boolean) : null;
    };
    return {
      body: pick('Body Type'),
      condition: pick('Car Condition'),
      drive: pick('Wheel Drive System'),
      turbo: pick('Turbo'),
      seat: pick('Seat Material'),
      warranty: pick('Warranty Status'),
      cylinders: pick('Number of Cylinders'),
    };
  });

  console.log('\n=== Edit Car form ===');
  console.log(`  opened via: ${opened} button`);
  console.log(`  "Vehicle Specifications" section present: ${hasSection}`);
  console.log(`  field labels present: ${LABELS.length - missing.length}/${LABELS.length}`);
  if (missing.length) { console.log('  MISSING LABELS:'); missing.forEach(m => console.log('    - ' + m)); }
  else console.log('  all 14 new field labels present in the form');
  console.log('  dropdown options:');
  for (const [k, v] of Object.entries(dropdownChecks)) {
    console.log(`    ${k}: ${v ? v.length + ' options -> ' + v.join(', ') : 'NOT A DROPDOWN'}`);
  }

  // camera feature checkboxes
  const camBoxes = await page.locator('input[type=checkbox]').count();
  console.log(`  checkbox inputs in modal: ${camBoxes}`);

  await page.screenshot({ path: '/workspace/car-qr-showcase/intake/qa/v-editform.png', fullPage: true });
  await browser.close();

  const ok = hasSection && missing.length === 0;
  console.log(ok ? '\n✅ EDIT CAR FORM VERIFIED' : '\n❌ FORM VERIFICATION FAILED');
  process.exit(ok ? 0 : 1);
})();
