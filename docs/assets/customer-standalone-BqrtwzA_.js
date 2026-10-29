import"./modulepreload-polyfill-B5Qt9EMX.js";import{b as I}from"./browser-DhvumiXS.js";const u=window.__APP_CONFIG__&&window.__APP_CONFIG__.supabaseUrl||"https://uifcfnkbccluhyryywxe.supabase.co",c=window.__APP_CONFIG__&&window.__APP_CONFIG__.supabaseAnonKey||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU",_=[{id:"standard",name:"Standard",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#333333"},{id:"luxury",name:"Luxury",fgColor:"#d4af37",bgColor:"#1a1a2e",borderColor:"#d4af37"},{id:"classic",name:"Classic",fgColor:"#1a1a1a",bgColor:"#f5f5dc",borderColor:"#8b7355"},{id:"bold",name:"Bold",fgColor:"#ffffff",bgColor:"#dc2626",borderColor:"#991b1b"},{id:"minimalist",name:"Minimalist",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#e5e7eb"},{id:"sports",name:"Sports",fgColor:"#ffffff",bgColor:"#0f172a",borderColor:"#22c55e"},{id:"eco",name:"Eco",fgColor:"#ffffff",bgColor:"#16a34a",borderColor:"#15803d"},{id:"ev",name:"EV",fgColor:"#ffffff",bgColor:"#2563eb",borderColor:"#1d4ed8"},{id:"hybrid",name:"Hybrid",fgColor:"#ffffff",bgColor:"#22c55e",borderColor:"#16a34a"},{id:"plugin_hybrid",name:"Plug-in Hybrid",fgColor:"#ffffff",bgColor:"#06b6d4",borderColor:"#0891b2"}];let e={loading:!0,error:null,car:null,company:null,images:[],currentImage:0,showLeadForm:!1,leadSaved:!1,appName:"QRSTag",customQrUrl:"",saving:!1,leadForm:{name:"",phone:"",email:"",interest_level:"normal",notes:""}};function $(){return Math.random().toString(36).substring(2,15)+Date.now().toString(36)}function S(){return new URLSearchParams(window.location.search).get("car")}function F(){const a=localStorage.getItem("appSettings");if(a){const o=JSON.parse(a);o.appName&&(e.appName=o.appName)}}async function k(){try{const a=S();if(!a){e.error="No car ID provided",e.loading=!1,i();return}const o=new AbortController,r=setTimeout(()=>o.abort(),15e3);let t;try{t=await fetch(`${u}/rest/v1/cars?id=eq.${a}&select=*`,{headers:{apikey:c,Authorization:`Bearer ${c}`},signal:o.signal})}catch(d){clearTimeout(r);const s=d&&d.name==="AbortError";e.error=s?"The database did not respond in time. Please try again.":"Cannot reach the database. Please check your internet connection.",e.loading=!1,i();return}if(clearTimeout(r),!t.ok){e.error="Database error ("+t.status+"). Please try again later.",e.loading=!1,i();return}const n=await t.json();if(console.log("Fetch response status:",t.status),console.log("Cars data:",n),!n||n.length===0){e.error="Car not found. ID: "+a,e.loading=!1,i();return}const l=n[0];if(console.log("Car data loaded:",l),console.log("Company ID:",l.company_id),l.images)try{e.images=typeof l.images=="string"?JSON.parse(l.images):l.images}catch{e.images=[]}if(e.car=l,e.leadForm.car_id=a,l.company_id){const s=await(await fetch(`${u}/rest/v1/companies?id=eq.${l.company_id}&select=*`,{headers:{apikey:c,Authorization:`Bearer ${c}`}})).json();s&&s.length>0&&(e.company=s[0])}try{const s=await(await fetch(`${u}/rest/v1/app_settings?id=eq.app_settings&select=app_name,custom_qr_url`,{headers:{apikey:c,Authorization:`Bearer ${c}`}})).json();console.log("App settings loaded:",s),s&&s.length>0&&(s[0].app_name&&(e.appName=s[0].app_name,console.log("App name set to:",e.appName)),s[0].custom_qr_url&&(e.customQrUrl=s[0].custom_qr_url))}catch{console.log("Using default app settings")}const p=`scanned_${a}`;if(!sessionStorage.getItem(p)){sessionStorage.setItem(p,"true");const d=(l.scan_count||0)+1,s=$(),h=new Date().toISOString();fetch(`${u}/rest/v1/scan_records`,{method:"POST",headers:{apikey:c,Authorization:`Bearer ${c}`,"Content-Type":"application/json",Prefer:"return=minimal",Upsert:"true"},body:JSON.stringify({id:s,car_id:a,scanned_at:h})}).then(async m=>{if(m.ok||m.status===201||m.status===200)console.log("✓ Scan recorded successfully:",s,"for car:",a);else{const g=await m.text();console.error("✗ Failed to record scan:",m.status,g)}}).catch(m=>{console.error("✗ Scan record error:",m)}),(async m=>{let g={...m};for(let v=0;v<4;v++){const b=await fetch(`${u}/rest/v1/cars?id=eq.${a}`,{method:"PATCH",headers:{apikey:c,Authorization:`Bearer ${c}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(g)});if(b.ok)return console.log("✓ Scan count updated to:",d),!0;const y=await b.text(),f=y.match(/Could not find the '([^']+)' column/);if(f&&f[1]in g){console.warn(`⚠ Database has no "${f[1]}" column — skipping scan counter update`),delete g[f[1]];continue}return console.error("✗ Scan count update failed:",b.status,y),!1}return!1})({scan_count:d,last_scanned_at:h}).catch(m=>{console.error("✗ Scan count update error:",m)})}}catch(a){console.error("Error:",a),e.error="Failed to load car data"}finally{e.loading=!1,i(),e.car&&R()}}function C(){var r;const a=((r=e.car)==null?void 0:r.qr_template)||"standard",o=_.find(t=>t.id===a)||_[0];return{fg:o.fgColor||"#000000",bg:o.bgColor||"#ffffff",border:o.borderColor||"#333333"}}const L={square:"0px",rounded_xs:"4px",rounded_sm:"8px",rounded_md:"16px",rounded_lg:"24px",rounded_xl:"32px",pill:"64px",circle:"50%",circle_md:"40%",octagon:"10px",hexagon:"12px",diamond:"4px"};function T(){var o;const a=((o=e.car)==null?void 0:o.qr_shape)||"square";return L[a]||"0px"}function A(){var o;const a=((o=e.car)==null?void 0:o.qr_shape)||"square";return["circle","pill","rounded_xl"].includes(a)}function N(){if(!e.car||e.car.is_active===!1)return!1;const a=new Date,o=e.car.scan_start_date?new Date(e.car.scan_start_date):null,r=e.car.scan_end_date?new Date(e.car.scan_end_date):null;return!(o&&a<o||r&&a>r)}function P(){if(!e.car)return"";const a=new Date,o=e.car.scan_start_date?new Date(e.car.scan_start_date):null,r=e.car.scan_end_date?new Date(e.car.scan_end_date):null;return!o&&!r?"Active":o&&a<o?`Starts ${e.car.scan_start_date}`:r&&a>r?"Expired":"Active"}function R(){const a=document.getElementById("qr-code");if(!a||!e.car)return;const o=C(),r=T(),t=A();let n;e.customQrUrl?n=e.customQrUrl.endsWith("/")?e.customQrUrl:e.customQrUrl+"/":n=window.location.origin+window.location.pathname.replace("index.html","").replace("customer-standalone.html","");const l=`${n}customer-standalone.html?car=${e.car.id}`;a.innerHTML="";const p=t?"M":"L";I.toCanvas(l,{width:200,margin:2,errorCorrectionLevel:p,color:{dark:o.fg,light:o.bg}},(d,s)=>{d?console.error(d):(s.style.borderRadius=r,s.style.overflow="hidden",a.appendChild(s),a.style.border=`2px solid ${o.border}`,a.style.borderRadius=r,a.style.padding="8px",a.style.backgroundColor=o.bg,a.style.display="inline-block")})}async function E(){if(!e.leadForm.name.trim()){alert("Please enter your name");return}e.saving=!0,i();try{const a=await fetch(`${u}/rest/v1/leads`,{method:"POST",headers:{apikey:c,Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({id:$(),car_id:e.car.id,name:e.leadForm.name,phone:e.leadForm.phone||null,email:e.leadForm.email||null,interest_level:e.leadForm.interest_level,notes:e.leadForm.notes||null})});if(!a.ok){const o=await a.text();throw new Error(o||"Failed to save")}e.leadSaved=!0,setTimeout(()=>{e.showLeadForm=!1,e.leadSaved=!1,e.leadForm={name:"",phone:"",email:"",interest_level:"normal",notes:""},i()},3e3)}catch(a){console.error("Error saving lead:",a),alert("Failed to submit. Please try again.")}finally{e.saving=!1,i()}}function i(){const a=document.getElementById("app"),o=C(),r=N();if(document.body.style.background="#f3f4f6",e.loading){a.innerHTML=`
          <div class="min-h-screen flex items-center justify-center bg-gray-100">
            <div class="text-center bg-white rounded-2xl shadow-lg p-12">
              <div class="spinner mx-auto mb-4"></div>
              <p class="text-gray-600">Loading car details...</p>
            </div>
          </div>
        `;return}if(e.error||!e.car){a.innerHTML=`
          <div class="min-h-screen flex items-center justify-center p-4 bg-gray-100">
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
              <div class="text-6xl mb-4">🔍</div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Car Not Found</h2>
              <p class="text-gray-600">${e.error||"This QR code is invalid or has been removed."}</p>
            </div>
          </div>
        `;return}const t=e.car,n=e.company;a.innerHTML=`
        <!-- Header -->
        ${n?`
          <div class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
              ${n.branding_logo&&t.logo_position==="top"?`<img src="${n.branding_logo}" alt="Logo" class="w-10 h-10 object-contain">`:""}
              <h1 class="text-lg font-semibold text-gray-800">${n.name}</h1>
            </div>
          </div>
        `:""}

        <div class="max-w-2xl mx-auto p-4">
          <!-- QR Not Active Warning -->
          ${r?"":`
            <div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
              <div class="text-5xl mb-3">⚠️</div>
              <h2 class="text-xl font-bold text-red-600 mb-2">QR Code Not Active</h2>
              <p class="text-gray-600">Status: ${P()}</p>
            </div>
          `}

          <!-- Car Details Card -->
          <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <!-- Image Gallery -->
            ${e.images.length>0?`
              <div class="mb-6">
                <div class="relative rounded-xl overflow-hidden mb-2 bg-gray-100">
                  <img src="${e.images[e.currentImage]}" alt="${t.make} ${t.model}" class="w-full h-64 object-cover">
                  ${e.images.length>1?`
                    <button onclick="prevImage()" class="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">◀</button>
                    <button onclick="nextImage()" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">▶</button>
                  `:""}
                </div>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  ${e.images.map((l,p)=>`
                    <img src="${l}" alt="Thumbnail ${p+1}" onclick="setImage(${p})" class="w-16 h-16 object-cover rounded-lg cursor-pointer ${e.currentImage===p?"ring-2 ring-blue-500":"opacity-70"} flex-shrink-0">
                  `).join("")}
                </div>
              </div>
            `:""}

            <!-- Car Title and Price -->
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">${t.year} ${t.make} ${t.model}</h1>
              ${t.price?`<p class="text-3xl font-bold text-blue-600">${t.price}</p>`:""}
            </div>

            <!-- Car Specs Grid -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              ${t.mileage?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Mileage</p><p class="font-semibold">${t.mileage}</p></div>`:""}
              ${t.color?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Color</p><p class="font-semibold">${t.color}</p></div>`:""}
              ${t.fuelType?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Fuel Type</p><p class="font-semibold">${t.fuelType}</p></div>`:""}
              ${t.transmission?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Transmission</p><p class="font-semibold">${t.transmission}</p></div>`:""}
            </div>

            <!-- Description -->
            ${t.description?`
              <div class="mb-6">
                <h3 class="font-semibold text-gray-800 mb-2">Description</h3>
                <p class="text-gray-600 leading-relaxed">${t.description}</p>
              </div>
            `:""}

            <!-- Vehicle Regulatory Information -->
            ${t.ccr_no||t.vin||t.approved_on||t.produced_in_and_after||t.country_of_production||t.pollutant_limits||t.label_no||t.manufacturer||t.motor_vehicle_class||t.fe_cafe_combined?`
              <div class="mb-6 bg-blue-50 rounded-xl p-4">
                <h3 class="font-semibold text-blue-800 mb-3">Vehicle Regulatory Information</h3>
                <div class="grid grid-cols-2 gap-3">
                  ${t.ccr_no?`<div><p class="text-xs text-blue-500 mb-1">CCR No</p><p class="font-medium text-sm">${t.ccr_no}</p></div>`:""}
                  ${t.approved_on?`<div><p class="text-xs text-blue-500 mb-1">Approved On</p><p class="font-medium text-sm">${t.approved_on}</p></div>`:""}
                  ${t.produced_in_and_after?`<div><p class="text-xs text-blue-500 mb-1">Produced In & After</p><p class="font-medium text-sm">${t.produced_in_and_after}</p></div>`:""}
                  ${t.country_of_production?`<div><p class="text-xs text-blue-500 mb-1">Country of Production</p><p class="font-medium text-sm">${t.country_of_production}</p></div>`:""}
                  ${t.pollutant_limits?`<div><p class="text-xs text-blue-500 mb-1">Pollutant Limits</p><p class="font-medium text-sm">${t.pollutant_limits}</p></div>`:""}
                  ${t.vin?`<div><p class="text-xs text-blue-500 mb-1">VIN</p><p class="font-medium text-sm">${t.vin}</p></div>`:""}
                  ${t.label_no?`<div><p class="text-xs text-blue-500 mb-1">Label No</p><p class="font-medium text-sm">${t.label_no}</p></div>`:""}
                  ${t.manufacturer?`<div><p class="text-xs text-blue-500 mb-1">Manufacturer</p><p class="font-medium text-sm">${t.manufacturer}</p></div>`:""}
                  ${t.motor_vehicle_class?`<div><p class="text-xs text-blue-500 mb-1">Motor Vehicle Class</p><p class="font-medium text-sm">${t.motor_vehicle_class}</p></div>`:""}
                  ${t.fe_cafe_combined?`<div><p class="text-xs text-blue-500 mb-1">FE (CAFE) Combined</p><p class="font-medium text-sm">${t.fe_cafe_combined}</p></div>`:""}
                </div>
              </div>
            `:""}

            <!-- Contact Buttons -->
            <div class="grid grid-cols-3 gap-3 mb-4">
              ${t.contactPhone?`<a href="tel:${t.contactPhone}" class="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition"><span class="text-blue-600 text-xl">📞</span><span class="font-medium text-blue-700 text-sm">Call</span></a>`:""}
              ${t.contact_whatsapp?`<a href="https://wa.me/${t.contact_whatsapp.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Hi, I'm interested in your ${t.year} ${t.make} ${t.model}`)}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition"><span class="text-green-600 text-xl">💬</span><span class="font-medium text-green-700 text-sm">WhatsApp</span></a>`:""}
              ${t.contactEmail?`<a href="mailto:${t.contactEmail}?subject=Inquiry about ${t.year} ${t.make} ${t.model}" class="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition"><span class="text-gray-600 text-xl">✉️</span><span class="font-medium text-gray-700 text-sm">Email</span></a>`:""}
            </div>

            <!-- Interested Button -->
            <button onclick="${r?"toggleLeadForm()":""}" class="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${r?"bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90":"bg-gray-300 text-gray-500 cursor-not-allowed"}">
              <span class="text-xl">✨</span> I'm Interested - Contact Me
            </button>
          </div>

          <!-- QR Code Card - WITH TEMPLATE COLORS (branding + the actual QR image) -->
          <div class="rounded-2xl shadow-lg p-6 mb-6" style="background: ${o.bg}; border: 4px solid ${o.border}">
            <div class="text-center">
              ${n!=null&&n.branding_logo?`
                <img src="${n.branding_logo}" alt="Company Logo" class="w-32 h-32 object-contain mx-auto mb-4">
              `:""}
              <h2 class="text-2xl font-bold" style="color: ${o.fg}">${(n==null?void 0:n.name)||"Dealership"}</h2>

              <!-- The QR image itself. initQRCode() fills this container with a
                   canvas; without this element the QR was never rendered. -->
              ${r?`
                <div class="mt-4 flex justify-center">
                  <div id="qr-code"></div>
                </div>
                <p class="text-xs mt-2" style="color: ${o.fg}; opacity: 0.7">Scan to view full vehicle details</p>
              `:""}
            </div>
          </div>

          <!-- Footer -->
          ${t.company_name_position==="bottom"&&n?`
            <div class="flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg p-6 mb-6">
              ${n.branding_logo&&t.logo_position==="bottom"?`<img src="${n.branding_logo}" alt="Logo" class="w-12 h-12 object-contain">`:""}
              <p class="text-lg font-semibold text-gray-700">${n.name}</p>
            </div>
          `:""}

          <!-- Powered by footer -->
          <footer class="text-center py-6 text-gray-500 text-sm">
            <p>Powered by QRSTag</p>
          </footer>
        </div>

        <!-- Lead Form Modal -->
        ${e.showLeadForm?`
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              ${e.leadSaved?`
                <div class="text-center py-8">
                  <div class="text-6xl mb-4">✅</div>
                  <h3 class="text-xl font-bold text-green-600 mb-2">Thank You!</h3>
                  <p class="text-gray-600">We'll contact you soon.</p>
                </div>
              `:`
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xl font-bold">I'm Interested</h2>
                  <button onclick="toggleLeadForm()" class="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
                </div>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium mb-1">Your Name *</label>
                    <input type="text" value="${e.leadForm.name}" onchange="updateLeadForm('name', this.value)" class="w-full p-3 border rounded-lg" placeholder="John Doe">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Phone</label>
                    <input type="tel" value="${e.leadForm.phone}" onchange="updateLeadForm('phone', this.value)" class="w-full p-3 border rounded-lg" placeholder="+1 555-123-4567">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value="${e.leadForm.email}" onchange="updateLeadForm('email', this.value)" class="w-full p-3 border rounded-lg" placeholder="john@example.com">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Interest Level</label>
                    <div class="flex gap-2">
                      <button onclick="setInterestLevel('urgent')" class="flex-1 py-3 rounded-lg capitalize font-medium ${e.leadForm.interest_level==="urgent"?"bg-red-500 text-white":"bg-gray-100"}">Urgent</button>
                      <button onclick="setInterestLevel('normal')" class="flex-1 py-3 rounded-lg capitalize font-medium ${e.leadForm.interest_level==="normal"?"bg-blue-500 text-white":"bg-gray-100"}">Normal</button>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Notes</label>
                    <textarea onchange="updateLeadForm('notes', this.value)" class="w-full p-3 border rounded-lg h-20 resize-none" placeholder="Any questions or notes...">${e.leadForm.notes}</textarea>
                  </div>
                  <button onclick="saveLead()" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition">
                    ${e.saving?'<div class="spinner-small"></div> Submitting...':"✨ Submit Interest"}
                  </button>
                </div>
              `}
            </div>
          </div>
        `:""}
      `}window.toggleLeadForm=()=>{e.showLeadForm=!e.showLeadForm,i()};window.updateLeadForm=(a,o)=>{e.leadForm[a]=o};window.setInterestLevel=a=>{e.leadForm.interest_level=a,i()};window.setImage=a=>{e.currentImage=a,i()};window.prevImage=()=>{e.currentImage=e.currentImage===0?e.images.length-1:e.currentImage-1,i()};window.nextImage=()=>{e.currentImage=e.currentImage===e.images.length-1?0:e.currentImage+1,i()};window.saveLead=E;const j="display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important;";function w(a,o){!a||a.id==="app"||a.getAttribute("data-platform-hidden")!==o&&(a.setAttribute("data-platform-hidden",o),a.style.cssText=o)}function x(){const a=document.body.lastElementChild;a&&a.id!=="app"&&a.tagName!=="SCRIPT"&&w(a,j),document.querySelectorAll("*").forEach(o=>{if(o.id==="app"||o.tagName==="SCRIPT"||o.tagName==="STYLE")return;const r=o.textContent||"";(r.includes("MiniMax")||r.includes("mcode")||r.includes("Created by"))&&w(o,"display: none !important; visibility: hidden !important;")})}x();[50,100,200,500,1e3,2e3].forEach(a=>{setTimeout(x,a)});if(typeof MutationObserver<"u"){let a=!1;new MutationObserver(()=>{a||(a=!0,requestAnimationFrame(()=>{a=!1,x()}))}).observe(document.body,{childList:!0,subtree:!0})}F();k();
