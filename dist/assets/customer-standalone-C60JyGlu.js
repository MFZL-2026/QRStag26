import"./modulepreload-polyfill-B5Qt9EMX.js";const p="https://uifcfnkbccluhyryywxe.supabase.co",d="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU",g=[{id:"standard",name:"Standard",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#333333"},{id:"luxury",name:"Luxury",fgColor:"#d4af37",bgColor:"#1a1a2e",borderColor:"#d4af37"},{id:"classic",name:"Classic",fgColor:"#1a1a1a",bgColor:"#f5f5dc",borderColor:"#8b7355"},{id:"bold",name:"Bold",fgColor:"#ffffff",bgColor:"#dc2626",borderColor:"#991b1b"},{id:"minimalist",name:"Minimalist",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#e5e7eb"},{id:"sports",name:"Sports",fgColor:"#ffffff",bgColor:"#0f172a",borderColor:"#22c55e"},{id:"eco",name:"Eco",fgColor:"#ffffff",bgColor:"#16a34a",borderColor:"#15803d"},{id:"ev",name:"EV",fgColor:"#ffffff",bgColor:"#2563eb",borderColor:"#1d4ed8"},{id:"hybrid",name:"Hybrid",fgColor:"#ffffff",bgColor:"#22c55e",borderColor:"#16a34a"},{id:"plugin_hybrid",name:"Plug-in Hybrid",fgColor:"#ffffff",bgColor:"#06b6d4",borderColor:"#0891b2"}];let e={loading:!0,error:null,car:null,company:null,images:[],currentImage:0,showLeadForm:!1,leadSaved:!1,appName:"QRSTag",customQrUrl:"https://mfzl-2026.github.io/QRStag26",saving:!1,leadForm:{name:"",phone:"",email:"",interest_level:"normal",notes:""}};function f(){return Math.random().toString(36).substring(2,15)+Date.now().toString(36)}function h(){return new URLSearchParams(window.location.search).get("car")}function y(){const a=localStorage.getItem("appSettings");if(a){const o=JSON.parse(a);o.appName&&(e.appName=o.appName)}}async function _(){try{const a=h();if(!a){e.error="No car ID provided",e.loading=!1,c();return}const o=await fetch(`${p}/rest/v1/cars?id=eq.${a}&select=*`,{headers:{apikey:d,Authorization:`Bearer ${d}`}}),s=await o.json();if(console.log("Fetch response status:",o.status),console.log("Cars data:",s),!s||s.length===0){e.error="Car not found. ID: "+a,e.loading=!1,c();return}const t=s[0];if(console.log("Car data loaded:",t),console.log("Company ID:",t.company_id),t.images)try{e.images=typeof t.images=="string"?JSON.parse(t.images):t.images}catch{e.images=[]}if(e.car=t,e.leadForm.car_id=a,t.company_id){const n=await(await fetch(`${p}/rest/v1/companies?id=eq.${t.company_id}&select=*`,{headers:{apikey:d,Authorization:`Bearer ${d}`}})).json();n&&n.length>0&&(e.company=n[0])}try{const n=await(await fetch(`${p}/rest/v1/app_settings?id=eq.app_settings&select=app_name,custom_qr_url`,{headers:{apikey:d,Authorization:`Bearer ${d}`}})).json();console.log("App settings loaded:",n),n&&n.length>0&&(n[0].app_name&&(e.appName=n[0].app_name,console.log("App name set to:",e.appName)),n[0].custom_qr_url&&(e.customQrUrl=n[0].custom_qr_url))}catch{console.log("Using default app settings")}const r=`scanned_${a}`;if(!sessionStorage.getItem(r)){sessionStorage.setItem(r,"true");const l=(t.scan_count||0)+1,n=f(),u=new Date().toISOString();fetch(`${p}/rest/v1/scan_records`,{method:"POST",headers:{apikey:d,Authorization:`Bearer ${d}`,"Content-Type":"application/json",Prefer:"return=minimal",Upsert:"true"},body:JSON.stringify({id:n,car_id:a,scanned_at:u})}).then(async i=>{if(i.ok||i.status===201||i.status===200)console.log("✓ Scan recorded successfully:",n,"for car:",a);else{const v=await i.text();console.error("✗ Failed to record scan:",i.status,v)}}).catch(i=>{console.error("✗ Scan record error:",i)}),fetch(`${p}/rest/v1/cars?id=eq.${a}`,{method:"PATCH",headers:{apikey:d,Authorization:`Bearer ${d}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({scan_count:l,last_scanned_at:u})}).then(i=>{i.ok?console.log("✓ Scan count updated to:",l):console.error("✗ Scan count update failed:",i.status)}).catch(i=>{console.error("✗ Scan count update error:",i)})}}catch(a){console.error("Error:",a),e.error="Failed to load car data"}finally{e.loading=!1,c(),e.car&&F()}}function b(){var s;const a=((s=e.car)==null?void 0:s.qr_template)||"standard",o=g.find(t=>t.id===a)||g[0];return{fg:o.fgColor||"#000000",bg:o.bgColor||"#ffffff",border:o.borderColor||"#333333"}}const $={square:"0px",rounded_xs:"4px",rounded_sm:"8px",rounded_md:"16px",rounded_lg:"24px",rounded_xl:"32px",pill:"64px",circle:"50%",circle_md:"40%",octagon:"10px",hexagon:"12px",diamond:"4px"};function w(){var o;const a=((o=e.car)==null?void 0:o.qr_shape)||"square";return $[a]||"0px"}function C(){var o;const a=((o=e.car)==null?void 0:o.qr_shape)||"square";return["circle","pill","rounded_xl"].includes(a)}function I(){if(!e.car||e.car.is_active===!1)return!1;const a=new Date,o=e.car.scan_start_date?new Date(e.car.scan_start_date):null,s=e.car.scan_end_date?new Date(e.car.scan_end_date):null;return!(o&&a<o||s&&a>s)}function S(){if(!e.car)return"";const a=new Date,o=e.car.scan_start_date?new Date(e.car.scan_start_date):null,s=e.car.scan_end_date?new Date(e.car.scan_end_date):null;return!o&&!s?"Active":o&&a<o?`Starts ${e.car.scan_start_date}`:s&&a>s?"Expired":"Active"}function F(){const a=document.getElementById("qr-code");if(!a||!e.car)return;const o=b(),s=w(),t=C();let r;e.customQrUrl?r=e.customQrUrl.endsWith("/")?e.customQrUrl:e.customQrUrl+"/":r=window.location.origin+window.location.pathname.replace("index.html","").replace("customer-standalone.html","");const l=`${r}customer-standalone.html?car=${e.car.id}`;a.innerHTML="";const n=t?QRCode.CorrectLevel.M:QRCode.CorrectLevel.L;QRCode.toCanvas(l,{width:200,margin:2,errorCorrectionLevel:n,color:{dark:o.fg,light:o.bg}},(u,i)=>{u?console.error(u):(i.style.borderRadius=s,i.style.overflow="hidden",a.appendChild(i),a.style.border=`2px solid ${o.border}`,a.style.borderRadius=s,a.style.padding="8px",a.style.backgroundColor=o.bg,a.style.display="inline-block")})}async function k(){if(!e.leadForm.name.trim()){alert("Please enter your name");return}e.saving=!0,c();try{const a=await fetch(`${p}/rest/v1/leads`,{method:"POST",headers:{apikey:d,Authorization:`Bearer ${d}`,"Content-Type":"application/json"},body:JSON.stringify({id:f(),car_id:e.car.id,name:e.leadForm.name,phone:e.leadForm.phone||null,email:e.leadForm.email||null,interest_level:e.leadForm.interest_level,notes:e.leadForm.notes||null})});if(!a.ok){const o=await a.text();throw new Error(o||"Failed to save")}e.leadSaved=!0,setTimeout(()=>{e.showLeadForm=!1,e.leadSaved=!1,e.leadForm={name:"",phone:"",email:"",interest_level:"normal",notes:""},c()},3e3)}catch(a){console.error("Error saving lead:",a),alert("Failed to submit. Please try again.")}finally{e.saving=!1,c()}}function c(){const a=document.getElementById("app"),o=b(),s=I();if(document.body.style.background="#f3f4f6",e.loading){a.innerHTML=`
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
        `;return}const t=e.car,r=e.company;a.innerHTML=`
        <!-- Header -->
        ${r?`
          <div class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
              ${r.branding_logo&&t.logo_position==="top"?`<img src="${r.branding_logo}" alt="Logo" class="w-10 h-10 object-contain">`:""}
              <h1 class="text-lg font-semibold text-gray-800">${r.name}</h1>
            </div>
          </div>
        `:""}

        <div class="max-w-2xl mx-auto p-4">
          <!-- QR Not Active Warning -->
          ${s?"":`
            <div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
              <div class="text-5xl mb-3">⚠️</div>
              <h2 class="text-xl font-bold text-red-600 mb-2">QR Code Not Active</h2>
              <p class="text-gray-600">Status: ${S()}</p>
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
                  ${e.images.map((l,n)=>`
                    <img src="${l}" alt="Thumbnail ${n+1}" onclick="setImage(${n})" class="w-16 h-16 object-cover rounded-lg cursor-pointer ${e.currentImage===n?"ring-2 ring-blue-500":"opacity-70"} flex-shrink-0">
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
            <button onclick="${s?"toggleLeadForm()":""}" class="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${s?"bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90":"bg-gray-300 text-gray-500 cursor-not-allowed"}">
              <span class="text-xl">✨</span> I'm Interested - Contact Me
            </button>
          </div>

          <!-- QR Code Card - WITH TEMPLATE COLORS (No QR Code, Just Branding) -->
          <div class="rounded-2xl shadow-lg p-6 mb-6" style="background: ${o.bg}; border: 4px solid ${o.border}">
            <div class="text-center">
              ${r!=null&&r.branding_logo?`
                <img src="${r.branding_logo}" alt="Company Logo" class="w-32 h-32 object-contain mx-auto mb-4">
              `:""}
              <h2 class="text-2xl font-bold" style="color: ${o.fg}">${(r==null?void 0:r.name)||"Dealership"}</h2>
            </div>
          </div>

          <!-- Footer -->
          ${t.company_name_position==="bottom"&&r?`
            <div class="flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg p-6 mb-6">
              ${r.branding_logo&&t.logo_position==="bottom"?`<img src="${r.branding_logo}" alt="Logo" class="w-12 h-12 object-contain">`:""}
              <p class="text-lg font-semibold text-gray-700">${r.name}</p>
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
      `}window.toggleLeadForm=()=>{e.showLeadForm=!e.showLeadForm,c()};window.updateLeadForm=(a,o)=>{e.leadForm[a]=o};window.setInterestLevel=a=>{e.leadForm.interest_level=a,c()};window.setImage=a=>{e.currentImage=a,c()};window.prevImage=()=>{e.currentImage=e.currentImage===0?e.images.length-1:e.currentImage-1,c()};window.nextImage=()=>{e.currentImage=e.currentImage===e.images.length-1?0:e.currentImage+1,c()};window.saveLead=k;function m(){const o=document.body.lastElementChild;o&&o.id!=="app"&&o.tagName!=="SCRIPT"&&(o.style.cssText="display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important;",o.removeAttribute("class")),document.querySelectorAll("*").forEach(r=>{if(r.id!=="app"){const l=r.textContent||"";(l.includes("MiniMax")||l.includes("mcode")||l.includes("Created by"))&&(r.style.cssText="display: none !important; visibility: hidden !important;")}}),document.querySelectorAll('[style*="position: fixed"], [style*="position:absolute"]').forEach(r=>{if(r.id!=="app"){const l=r.textContent||"";(l.includes("MiniMax")||l.includes("mcode"))&&(r.style.cssText="display: none !important;")}})}m();setTimeout(m,50);setTimeout(m,100);setTimeout(m,200);setTimeout(m,500);setTimeout(m,1e3);setTimeout(m,2e3);typeof MutationObserver<"u"&&new MutationObserver(()=>{m()}).observe(document.body,{childList:!0,subtree:!0,attributes:!0});function x(){m(),requestAnimationFrame(x)}requestAnimationFrame(x);y();_();
