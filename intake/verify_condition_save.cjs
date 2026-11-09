// End-to-end save-path proof: pick a Car Condition in the Edit Car form,
// click Save, and inspect the payload actually sent to Supabase.
// Also asserts the dropdown offers the new values.
const { chromium } = require('/usr/local/lib/node_modules/playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';

const MOCK_CAR = {
  id: 'testcar123', company_id: 'comp1', make: 'Volvo', model: 'XC60', year: 2026,
  price: '$45,000', mileage: '12,000 KM', color: 'Blue', fuelType: 'Hybrid',
  fuel_type: 'Hybrid', transmission: 'Automatic', description: 'Great car',
  location: 'Baghdad', images: [], contactPhone: '0770', contact_phone: '0770',
  contactEmail: 's@m.com', contact_email: 's@m.com', contactWhatsApp: '964',
  contact_whatsapp: '964', videoLink: '', qr_template: 'standard', qr_frame: null,
  qr_shape: 'square', logo_position: 'none', company_name_position: 'top',
  is_active: true, scan_start_date: '', scan_end_date: '', scan_count: 12,
  body_type: 'SUV', car_condition: 'Used', trim_level: '', engine: '', horsepower: '',
  cylinders: null, wheel_drive: '', turbo: '', camera_features: [],
  wheel_size: '', seat_material: '', number_of_seats: null,
  warranty_status: '', warranty_details: '',
};
const MOCK_COMPANY = { id: 'comp1', name: 'MKMA Showroom', branding_logo: '', branding_color: '#3b82f6' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('carqr_logged_in', 'true');
    localStorage.setItem('carqr_admin_password', 'admin123');
    localStorage.setItem('carqr_current_user', JSON.stringify({
      email: 'admin@carqr.io', name: 'Admin', role: 'super_admin',
      role_name: 'Super Admin', is_active: true
    }));
  });

  const writes = [];
  await page.route('**/rest/v1/**', async route => {
    const req = route.request();
    const url = req.url();
    const single = (req.headers()['accept'] || '').includes('pgrst.object');
    if (req.method() !== 'GET') {
      try { writes.push({ url, method: req.method(), body: JSON.parse(req.postData() || 'null') }); } catch { }
    }
    let body = [];
    if (url.includes('/cars')) body = single ? MOCK_CAR : [MOCK_CAR];
    else if (url.includes('/companies')) body = single ? MOCK_COMPANY : [MOCK_COMPANY];
    else if (url.includes('/app_settings')) body = single ? { id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' } : [{ id: 'app_settings', app_name: 'QRStag', app_logo: '', custom_qr_url: 'https://qrstag.io' }];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Content-Range': '0-0/1' }, body: JSON.stringify(body) });
  });

  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  const chev = page.locator('button:has(svg.lucide-chevron-down)').first();
  if (await chev.count()) { await chev.click(); await page.waitForTimeout(1500); }
  await page.locator('button:has-text("Add Car")').first().click();
  await page.waitForTimeout(1800);

  // Make and Model are required - fill them so the save is not blocked
  const mk = page.locator('label', { hasText: 'Make' }).first().locator('xpath=..').locator('select').first();
  await mk.selectOption('Volvo');
  await page.waitForTimeout(600);
  const md = page.locator('label', { hasText: 'Model' }).first().locator('xpath=..').locator('select').first();
  await md.selectOption('XC60');
  await page.waitForTimeout(600);

  // dropdown options
  const options = await page.evaluate(() => {
    const lab = [...document.querySelectorAll('label')].find(l => l.textContent.trim() === 'Car Condition');
    const sel = lab.parentElement.querySelector('select');
    return [...sel.options].map(o => o.value);
  });
  console.log('\n=== Car Condition dropdown options ===');
  console.log('  ' + options.join(', '));
  console.log(`  contains "Clean Title": ${options.includes('Clean Title')}`);
  console.log(`  contains "Painted":     ${options.includes('Painted')}`);

  // pick each new value in turn and save
  const results = [];
  for (const value of ['Clean Title', 'Painted']) {
    writes.length = 0;
    // the modal closes after a successful save - reopen it for the next value
    if (value !== 'Clean Title') {
      await page.locator('button:has-text("Add Car")').first().click();
      await page.waitForTimeout(1800);
      const mk2 = page.locator('label', { hasText: 'Make' }).first().locator('xpath=..').locator('select').first();
      await mk2.selectOption('Volvo'); await page.waitForTimeout(500);
      const md2 = page.locator('label', { hasText: 'Model' }).first().locator('xpath=..').locator('select').first();
      await md2.selectOption('XC60'); await page.waitForTimeout(500);
    }
    const lab = page.locator('label', { hasText: /^Car Condition$/ }).first();
    const sel = lab.locator('xpath=..').locator('select').first();
    await sel.selectOption(value);
    await page.waitForTimeout(400);
    // click Save
    const save = page.locator('button:has-text("Save")').first();
    if (!(await save.count())) { console.log('  ❌ no Save button found'); break; }
    await save.click();
    await page.waitForTimeout(2000);

    const carWrite = writes.find(w => w.url.includes('/cars'));
    const payload = carWrite && Array.isArray(carWrite.body) ? carWrite.body[0] : (carWrite ? carWrite.body : null);
    const got = payload ? payload.car_condition : undefined;
    console.log(`\n=== save with "${value}" ===`);
    console.log(`  request: ${carWrite ? carWrite.method + ' ' + carWrite.url.split('/rest/v1/')[1].split('?')[0] : 'NONE'}`);
    console.log(`  payload.car_condition = ${JSON.stringify(got)}`);
    console.log(`  ✅ saved correctly: ${got === value}`);
    results.push(got === value);
  }

  await browser.close();
  const ok = options.includes('Clean Title') && options.includes('Painted') && results.every(Boolean);
  console.log(ok ? '\n✅ SAVE PATH VERIFIED' : '\n❌ SAVE PATH FAILED');
  process.exit(ok ? 0 : 1);
})();
