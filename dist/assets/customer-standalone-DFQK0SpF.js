import"./modulepreload-polyfill-B5Qt9EMX.js";import{b as I}from"./browser-CBSq_7R1.js";const g=window.__APP_CONFIG__&&window.__APP_CONFIG__.supabaseUrl||"https://uifcfnkbccluhyryywxe.supabase.co",m=window.__APP_CONFIG__&&window.__APP_CONFIG__.supabaseAnonKey||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU",_=[{id:"standard",name:"Standard",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#333333"},{id:"luxury",name:"Luxury",fgColor:"#d4af37",bgColor:"#1a1a2e",borderColor:"#d4af37"},{id:"classic",name:"Classic",fgColor:"#1a1a1a",bgColor:"#f5f5dc",borderColor:"#8b7355"},{id:"bold",name:"Bold",fgColor:"#ffffff",bgColor:"#dc2626",borderColor:"#991b1b"},{id:"minimalist",name:"Minimalist",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#e5e7eb"},{id:"sports",name:"Sports",fgColor:"#ffffff",bgColor:"#0f172a",borderColor:"#22c55e"},{id:"eco",name:"Eco",fgColor:"#ffffff",bgColor:"#16a34a",borderColor:"#15803d"},{id:"ev",name:"EV",fgColor:"#ffffff",bgColor:"#2563eb",borderColor:"#1d4ed8"},{id:"hybrid",name:"Hybrid",fgColor:"#ffffff",bgColor:"#22c55e",borderColor:"#16a34a"},{id:"plugin_hybrid",name:"Plug-in Hybrid",fgColor:"#ffffff",bgColor:"#06b6d4",borderColor:"#0891b2"}];let t={loading:!0,error:null,car:null,company:null,images:[],currentImage:0,showLeadForm:!1,leadSaved:!1,appName:"QRSTag",customQrUrl:"",saving:!1,leadForm:{name:"",phone:"",email:"",interest_level:"normal",notes:""}};function $(){return Math.random().toString(36).substring(2,15)+Date.now().toString(36)}function S(){return new URLSearchParams(window.location.search).get("car")}function F(){const a=localStorage.getItem("appSettings");if(a){const o=JSON.parse(a);o.appName&&(t.appName=o.appName)}}async function k(){try{const a=S();if(!a){t.error="No car ID provided",t.loading=!1,c();return}const o=new AbortController,n=setTimeout(()=>o.abort(),15e3);let e;try{e=await fetch(`${g}/rest/v1/cars?id=eq.${a}&select=*`,{headers:{apikey:m,Authorization:`Bearer ${m}`},signal:o.signal})}catch(d){clearTimeout(n);const r=d&&d.name==="AbortError";t.error=r?"The database did not respond in time. Please try again.":"Cannot reach the database. Please check your internet connection.",t.loading=!1,c();return}if(clearTimeout(n),!e.ok){t.error="Database error ("+e.status+"). Please try again later.",t.loading=!1,c();return}const s=await e.json();if(console.log("Fetch response status:",e.status),console.log("Cars data:",s),!s||s.length===0){t.error="Car not found. ID: "+a,t.loading=!1,c();return}const i=s[0];if(console.log("Car data loaded:",i),console.log("Company ID:",i.company_id),i.images)try{t.images=typeof i.images=="string"?JSON.parse(i.images):i.images}catch{t.images=[]}if(t.car=i,t.leadForm.car_id=a,i.company_id){const r=await(await fetch(`${g}/rest/v1/companies?id=eq.${i.company_id}&select=*`,{headers:{apikey:m,Authorization:`Bearer ${m}`}})).json();r&&r.length>0&&(t.company=r[0])}try{const r=await(await fetch(`${g}/rest/v1/app_settings?id=eq.app_settings&select=app_name,custom_qr_url`,{headers:{apikey:m,Authorization:`Bearer ${m}`}})).json();console.log("App settings loaded:",r),r&&r.length>0&&(r[0].app_name&&(t.appName=r[0].app_name,console.log("App name set to:",t.appName)),r[0].custom_qr_url&&(t.customQrUrl=r[0].custom_qr_url))}catch{console.log("Using default app settings")}const l=`scanned_${a}`;if(!sessionStorage.getItem(l)){sessionStorage.setItem(l,"true");const d=(i.scan_count||0)+1,r=$(),u=new Date().toISOString();fetch(`${g}/rest/v1/scan_records`,{method:"POST",headers:{apikey:m,Authorization:`Bearer ${m}`,"Content-Type":"application/json",Prefer:"return=minimal",Upsert:"true"},body:JSON.stringify({id:r,car_id:a,scanned_at:u})}).then(async p=>{if(p.ok||p.status===201||p.status===200)console.log("✓ Scan recorded successfully:",r,"for car:",a);else{const f=await p.text();console.error("✗ Failed to record scan:",p.status,f)}}).catch(p=>{console.error("✗ Scan record error:",p)}),(async p=>{let f={...p};for(let v=0;v<4;v++){const x=await fetch(`${g}/rest/v1/cars?id=eq.${a}`,{method:"PATCH",headers:{apikey:m,Authorization:`Bearer ${m}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(f)});if(x.ok)return console.log("✓ Scan count updated to:",d),!0;const y=await x.text(),b=y.match(/Could not find the '([^']+)' column/);if(b&&b[1]in f){console.warn(`⚠ Database has no "${b[1]}" column — skipping scan counter update`),delete f[b[1]];continue}return console.error("✗ Scan count update failed:",x.status,y),!1}return!1})({scan_count:d,last_scanned_at:u}).catch(p=>{console.error("✗ Scan count update error:",p)})}}catch(a){console.error("Error:",a),t.error="Failed to load car data"}finally{t.loading=!1,c(),t.car&&E()}}function C(){var n;const a=((n=t.car)==null?void 0:n.qr_template)||"standard",o=_.find(e=>e.id===a)||_[0];return{fg:o.fgColor||"#000000",bg:o.bgColor||"#ffffff",border:o.borderColor||"#333333"}}const T={square:"0px",rounded_xs:"4px",rounded_sm:"8px",rounded_md:"16px",rounded_lg:"24px",rounded_xl:"32px",pill:"64px",circle:"50%",circle_md:"40%",octagon:"10px",hexagon:"12px",diamond:"4px"};function L(){var o;const a=((o=t.car)==null?void 0:o.qr_shape)||"square";return T[a]||"0px"}function A(){var o;const a=((o=t.car)==null?void 0:o.qr_shape)||"square";return["circle","pill","rounded_xl"].includes(a)}function N(){if(!t.car||t.car.is_active===!1)return!1;const a=new Date,o=t.car.scan_start_date?new Date(t.car.scan_start_date):null,n=t.car.scan_end_date?new Date(t.car.scan_end_date):null;return!(o&&a<o||n&&a>n)}function P(){if(!t.car)return"";const a=new Date,o=t.car.scan_start_date?new Date(t.car.scan_start_date):null,n=t.car.scan_end_date?new Date(t.car.scan_end_date):null;return!o&&!n?"Active":o&&a<o?`Starts ${t.car.scan_start_date}`:n&&a>n?"Expired":"Active"}function E(){const a=document.getElementById("qr-code");if(!a||!t.car)return;const o=C(),n=L(),e=A();let s;t.customQrUrl?s=t.customQrUrl.endsWith("/")?t.customQrUrl:t.customQrUrl+"/":s=window.location.origin+window.location.pathname.replace("index.html","").replace("customer-standalone.html","");const i=`${s}customer-standalone.html?car=${t.car.id}`;a.innerHTML="";const l=e?"M":"L";I.toCanvas(i,{width:200,margin:2,errorCorrectionLevel:l,color:{dark:o.fg,light:o.bg}},(d,r)=>{d?console.error(d):(r.style.borderRadius=n,r.style.overflow="hidden",a.appendChild(r),a.style.border=`2px solid ${o.border}`,a.style.borderRadius=n,a.style.padding="8px",a.style.backgroundColor=o.bg,a.style.display="inline-block")})}async function R(){if(!t.leadForm.name.trim()){alert("Please enter your name");return}t.saving=!0,c();try{const a=await fetch(`${g}/rest/v1/leads`,{method:"POST",headers:{apikey:m,Authorization:`Bearer ${m}`,"Content-Type":"application/json"},body:JSON.stringify({id:$(),car_id:t.car.id,name:t.leadForm.name,phone:t.leadForm.phone||null,email:t.leadForm.email||null,interest_level:t.leadForm.interest_level,notes:t.leadForm.notes||null})});if(!a.ok){const o=await a.text();throw new Error(o||"Failed to save")}t.leadSaved=!0,setTimeout(()=>{t.showLeadForm=!1,t.leadSaved=!1,t.leadForm={name:"",phone:"",email:"",interest_level:"normal",notes:""},c()},3e3)}catch(a){console.error("Error saving lead:",a),alert("Failed to submit. Please try again.")}finally{t.saving=!1,c()}}function c(){const a=document.getElementById("app"),o=C(),n=N();if(document.body.style.background="#f3f4f6",t.loading){a.innerHTML=`
          <div class="min-h-screen flex items-center justify-center bg-gray-100">
            <div class="text-center bg-white rounded-2xl shadow-lg p-12">
              <div class="spinner mx-auto mb-4"></div>
              <p class="text-gray-600">Loading car details...</p>
            </div>
          </div>
        `;return}if(t.error||!t.car){a.innerHTML=`
          <div class="min-h-screen flex items-center justify-center p-4 bg-gray-100">
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
              <div class="text-6xl mb-4">🔍</div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Car Not Found</h2>
              <p class="text-gray-600">${t.error||"This QR code is invalid or has been removed."}</p>
            </div>
          </div>
        `;return}const e=t.car,s=t.company;a.innerHTML=`
        <!-- Header -->
        ${s?`
          <div class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
              ${s.branding_logo&&e.logo_position==="top"?`<img src="${s.branding_logo}" alt="Logo" class="w-10 h-10 object-contain">`:""}
              <h1 class="text-lg font-semibold text-gray-800">${s.name}</h1>
            </div>
          </div>
        `:""}

        <div class="max-w-2xl mx-auto p-4">
          <!-- QR Not Active Warning -->
          ${n?"":`
            <div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
              <div class="text-5xl mb-3">⚠️</div>
              <h2 class="text-xl font-bold text-red-600 mb-2">QR Code Not Active</h2>
              <p class="text-gray-600">Status: ${P()}</p>
            </div>
          `}

          <!-- Car Details Card -->
          <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <!-- Image Gallery -->
            ${t.images.length>0?`
              <div class="mb-6">
                <div class="relative rounded-xl overflow-hidden mb-2 bg-gray-100">
                  <img src="${t.images[t.currentImage]}" alt="${e.make} ${e.model}" class="w-full h-64 object-cover">
                  ${t.images.length>1?`
                    <button onclick="prevImage()" class="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">◀</button>
                    <button onclick="nextImage()" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">▶</button>
                  `:""}
                </div>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  ${t.images.map((i,l)=>`
                    <img src="${i}" alt="Thumbnail ${l+1}" onclick="setImage(${l})" class="w-16 h-16 object-cover rounded-lg cursor-pointer ${t.currentImage===l?"ring-2 ring-blue-500":"opacity-70"} flex-shrink-0">
                  `).join("")}
                </div>
              </div>
            `:""}

            <!-- Car Title and Price -->
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">${e.year} ${e.make} ${e.model}</h1>
              ${e.price?`<p class="text-3xl font-bold text-blue-600">${e.price}</p>`:""}
            </div>

            <!-- Car Specs Grid -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              ${e.mileage?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Mileage</p><p class="font-semibold">${e.mileage}</p></div>`:""}
              ${e.color?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Color</p><p class="font-semibold">${e.color}</p></div>`:""}
              ${e.fuelType?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Fuel Type</p><p class="font-semibold">${e.fuelType}</p></div>`:""}
              ${e.transmission?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Transmission</p><p class="font-semibold">${e.transmission}</p></div>`:""}
            </div>

            <!-- Vehicle Specifications -->
            ${(()=>{const i=[],l=(r,u)=>{u==null||u===""||i.push({label:r,value:String(u)})};l("Body Type",e.body_type),l("Condition",e.car_condition),l("Trim",e.trim_level),l("Engine Capacity",e.engine),l("Horsepower",e.horsepower?e.horsepower+" HP":""),l("Cylinders",e.cylinders),l("Wheel Drive",e.wheel_drive),l("Turbo",e.turbo),l("Seats",e.number_of_seats),l("Seat Material",e.seat_material),l("Wheel Size",e.wheel_size),l("Warranty",e.warranty_status),l("Warranty Details",e.warranty_details);const d=Array.isArray(e.camera_features)?e.camera_features:[];return d.length&&i.push({label:"Camera Features",value:d.join(", ")}),i.length?`
                <div class="mb-6">
                  <h3 class="font-semibold text-gray-800 mb-3">Specifications</h3>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    ${i.map(r=>`<div class="bg-gray-50 rounded-xl p-3"><p class="text-gray-500 text-xs mb-1">${r.label}</p><p class="font-semibold text-sm text-gray-800">${r.value}</p></div>`).join("")}
                  </div>
                </div>`:""})()}

            <!-- Description -->
            ${e.description?`
              <div class="mb-6">
                <h3 class="font-semibold text-gray-800 mb-2">Description</h3>
                <p class="text-gray-600 leading-relaxed">${e.description}</p>
              </div>
            `:""}

            <!-- Vehicle Regulatory Information -->
            ${e.ccr_no||e.vin||e.approved_on||e.produced_in_and_after||e.country_of_production||e.pollutant_limits||e.label_no||e.manufacturer||e.motor_vehicle_class||e.fe_cafe_combined?`
              <div class="mb-6 bg-blue-50 rounded-xl p-4">
                <h3 class="font-semibold text-blue-800 mb-3">Vehicle Regulatory Information</h3>
                <div class="grid grid-cols-2 gap-3">
                  ${e.ccr_no?`<div><p class="text-xs text-blue-500 mb-1">CCR No</p><p class="font-medium text-sm">${e.ccr_no}</p></div>`:""}
                  ${e.approved_on?`<div><p class="text-xs text-blue-500 mb-1">Approved On</p><p class="font-medium text-sm">${e.approved_on}</p></div>`:""}
                  ${e.produced_in_and_after?`<div><p class="text-xs text-blue-500 mb-1">Produced In & After</p><p class="font-medium text-sm">${e.produced_in_and_after}</p></div>`:""}
                  ${e.country_of_production?`<div><p class="text-xs text-blue-500 mb-1">Country of Production</p><p class="font-medium text-sm">${e.country_of_production}</p></div>`:""}
                  ${e.pollutant_limits?`<div><p class="text-xs text-blue-500 mb-1">Pollutant Limits</p><p class="font-medium text-sm">${e.pollutant_limits}</p></div>`:""}
                  ${e.vin?`<div><p class="text-xs text-blue-500 mb-1">VIN</p><p class="font-medium text-sm">${e.vin}</p></div>`:""}
                  ${e.label_no?`<div><p class="text-xs text-blue-500 mb-1">Label No</p><p class="font-medium text-sm">${e.label_no}</p></div>`:""}
                  ${e.manufacturer?`<div><p class="text-xs text-blue-500 mb-1">Manufacturer</p><p class="font-medium text-sm">${e.manufacturer}</p></div>`:""}
                  ${e.motor_vehicle_class?`<div><p class="text-xs text-blue-500 mb-1">Motor Vehicle Class</p><p class="font-medium text-sm">${e.motor_vehicle_class}</p></div>`:""}
                  ${e.fe_cafe_combined?`<div><p class="text-xs text-blue-500 mb-1">FE (CAFE) Combined</p><p class="font-medium text-sm">${e.fe_cafe_combined}</p></div>`:""}
                </div>
              </div>
            `:""}

            <!-- Contact Buttons -->
            <div class="grid grid-cols-3 gap-3 mb-4">
              ${e.contactPhone?`<a href="tel:${e.contactPhone}" class="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition"><span class="text-blue-600 text-xl">📞</span><span class="font-medium text-blue-700 text-sm">Call</span></a>`:""}
              ${e.contact_whatsapp?`<a href="https://wa.me/${e.contact_whatsapp.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Hi, I'm interested in your ${e.year} ${e.make} ${e.model}`)}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition"><span class="text-green-600 text-xl">💬</span><span class="font-medium text-green-700 text-sm">WhatsApp</span></a>`:""}
              ${e.contactEmail?`<a href="mailto:${e.contactEmail}?subject=Inquiry about ${e.year} ${e.make} ${e.model}" class="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition"><span class="text-gray-600 text-xl">✉️</span><span class="font-medium text-gray-700 text-sm">Email</span></a>`:""}
            </div>

            <!-- Interested Button -->
            <button onclick="${n?"toggleLeadForm()":""}" class="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${n?"bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90":"bg-gray-300 text-gray-500 cursor-not-allowed"}">
              <span class="text-xl">✨</span> I'm Interested - Contact Me
            </button>
          </div>

          <!-- QR Code Card - WITH TEMPLATE COLORS (branding + the actual QR image) -->
          <div class="rounded-2xl shadow-lg p-6 mb-6" style="background: ${o.bg}; border: 4px solid ${o.border}">
            <div class="text-center">
              ${s!=null&&s.branding_logo?`
                <img src="${s.branding_logo}" alt="Company Logo" class="w-32 h-32 object-contain mx-auto mb-4">
              `:""}
              <h2 class="text-2xl font-bold" style="color: ${o.fg}">${(s==null?void 0:s.name)||"Dealership"}</h2>

              <!-- The QR image itself. initQRCode() fills this container with a
                   canvas; without this element the QR was never rendered. -->
              ${n?`
                <div class="mt-4 flex justify-center">
                  <div id="qr-code"></div>
                </div>
                <p class="text-xs mt-2" style="color: ${o.fg}; opacity: 0.7">Scan to view full vehicle details</p>
              `:""}
            </div>
          </div>

          <!-- Footer -->
          ${e.company_name_position==="bottom"&&s?`
            <div class="flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg p-6 mb-6">
              ${s.branding_logo&&e.logo_position==="bottom"?`<img src="${s.branding_logo}" alt="Logo" class="w-12 h-12 object-contain">`:""}
              <p class="text-lg font-semibold text-gray-700">${s.name}</p>
            </div>
          `:""}

          <!-- Powered by footer -->
          <footer class="text-center py-6 text-gray-500 text-sm">
            <p>Powered by QRSTag</p>
          </footer>
        </div>

        <!-- Lead Form Modal -->
        ${t.showLeadForm?`
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              ${t.leadSaved?`
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
                    <input type="text" value="${t.leadForm.name}" onchange="updateLeadForm('name', this.value)" class="w-full p-3 border rounded-lg" placeholder="John Doe">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Phone</label>
                    <input type="tel" value="${t.leadForm.phone}" onchange="updateLeadForm('phone', this.value)" class="w-full p-3 border rounded-lg" placeholder="+1 555-123-4567">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value="${t.leadForm.email}" onchange="updateLeadForm('email', this.value)" class="w-full p-3 border rounded-lg" placeholder="john@example.com">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Interest Level</label>
                    <div class="flex gap-2">
                      <button onclick="setInterestLevel('urgent')" class="flex-1 py-3 rounded-lg capitalize font-medium ${t.leadForm.interest_level==="urgent"?"bg-red-500 text-white":"bg-gray-100"}">Urgent</button>
                      <button onclick="setInterestLevel('normal')" class="flex-1 py-3 rounded-lg capitalize font-medium ${t.leadForm.interest_level==="normal"?"bg-blue-500 text-white":"bg-gray-100"}">Normal</button>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Notes</label>
                    <textarea onchange="updateLeadForm('notes', this.value)" class="w-full p-3 border rounded-lg h-20 resize-none" placeholder="Any questions or notes...">${t.leadForm.notes}</textarea>
                  </div>
                  <button onclick="saveLead()" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition">
                    ${t.saving?'<div class="spinner-small"></div> Submitting...':"✨ Submit Interest"}
                  </button>
                </div>
              `}
            </div>
          </div>
        `:""}
      `}window.toggleLeadForm=()=>{t.showLeadForm=!t.showLeadForm,c()};window.updateLeadForm=(a,o)=>{t.leadForm[a]=o};window.setInterestLevel=a=>{t.leadForm.interest_level=a,c()};window.setImage=a=>{t.currentImage=a,c()};window.prevImage=()=>{t.currentImage=t.currentImage===0?t.images.length-1:t.currentImage-1,c()};window.nextImage=()=>{t.currentImage=t.currentImage===t.images.length-1?0:t.currentImage+1,c()};window.saveLead=R;const j="display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important;";function w(a,o){!a||a.id==="app"||a.getAttribute("data-platform-hidden")!==o&&(a.setAttribute("data-platform-hidden",o),a.style.cssText=o)}function h(){const a=document.body.lastElementChild;a&&a.id!=="app"&&a.tagName!=="SCRIPT"&&w(a,j),document.querySelectorAll("*").forEach(o=>{if(o.id==="app"||o.tagName==="SCRIPT"||o.tagName==="STYLE")return;const n=o.textContent||"";(n.includes("MiniMax")||n.includes("mcode")||n.includes("Created by"))&&w(o,"display: none !important; visibility: hidden !important;")})}h();[50,100,200,500,1e3,2e3].forEach(a=>{setTimeout(h,a)});if(typeof MutationObserver<"u"){let a=!1;new MutationObserver(()=>{a||(a=!0,requestAnimationFrame(()=>{a=!1,h()}))}).observe(document.body,{childList:!0,subtree:!0})}F();k();
