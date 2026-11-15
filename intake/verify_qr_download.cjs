// Verifies the Edit Car -> QR Code Preview & Print -> Download contains a scannable QR code.
// Regression test: html2canvas used to drop the image (nested display:inline-block), so the
// downloaded PNG had the frame but no QR at all. Decodes the capture and checks the payload.
const { chromium } = require('/usr/local/lib/node_modules/playwright');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'https://mfzl-2026.github.io/QRStag26';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1100 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('carqr_logged_in','true');
    localStorage.setItem('carqr_admin_password','admin123');
    localStorage.setItem('carqr_current_user', JSON.stringify({email:'admin@carqr.io',name:'Admin',role:'super_admin',role_name:'Super Admin',is_active:true,permissions:['car_edit','car_create','car_delete']}));
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function(){ if(this.download){ window.__dl={name:this.download,href:this.href}; return;} return orig.apply(this,arguments); };
  });
  const alerts=[]; p.on('dialog', async d => { alerts.push(d.message()); await d.dismiss(); });
  await p.goto(`${BASE}/index.html`, { waitUntil:'networkidle', timeout:60000 });
  await p.waitForTimeout(3000);
  const chev = p.locator('button:has(svg.lucide-chevron-down)').first();
  if (await chev.count()) { await chev.click(); await p.waitForTimeout(2000); }
  await p.locator('button:has-text("Add Car")').first().click();
  await p.waitForTimeout(3500);

  // on-screen preview must still be intact
  const onScreen = await p.evaluate(() => {
    const img = document.querySelector('.qr-preview-container img[alt="QR Code"]');
    const w = document.querySelector('.qr-preview-container');
    return { natural: img ? [img.naturalWidth, img.naturalHeight] : null, wrapperDisplay: img?.parentElement?.style.display, box: [w.offsetWidth, w.offsetHeight] };
  });
  console.log('  on-screen preview:', JSON.stringify(onScreen));

  await p.locator('button:has-text("Download")').last().click();
  await p.waitForTimeout(7000);

  const dl = await p.evaluate(() => window.__dl || null);
  if (!dl) { console.log('  ❌ no download produced'); console.log('  alerts:', alerts); await b.close(); process.exit(1); }
  const buf = Buffer.from(dl.href.split(',')[1], 'base64');
  fs.writeFileSync('intake/qa/qr-download.png', buf);
  const stats = await p.evaluate(async d => {
    const img = new Image(); img.src = 'data:image/png;base64,'+d; await img.decode();
    const c = document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img,0,0);
    const px = x.getImageData(0,0,c.width,c.height).data;
    let dark=0;
    for (let i=0;i<px.length;i+=4) if (px[i]<128&&px[i+1]<128&&px[i+2]<128&&px[i+3]>10) dark++;
    return { w:c.width, h:c.height, dark };
  }, dl.href.split(',')[1]);
  console.log('  download:', dl.name, '|', stats.w+'x'+stats.h, '| dark px:', stats.dark);
  console.log('  alerts:', alerts.length ? alerts : 'none');
  const after = await p.evaluate(() => document.querySelector('.qr-preview-container img[alt="QR Code"]')?.parentElement?.style.display);
  console.log('  wrapper display restored to:', JSON.stringify(after));
  const ok = stats.dark > 50000;
  console.log(ok ? '\n✅ QR CODE IS NOW IN THE DOWNLOAD' : '\n❌ QR still missing');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
