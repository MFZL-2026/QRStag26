import"./modulepreload-polyfill-B5Qt9EMX.js";const p="https://uifcfnkbccluhyryywxe.supabase.co",c="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmNmbmtiY2NsdWh5cnl5d3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4ODMsImV4cCI6MjA5Mjg4NTg4M30.c0jZTMmLCW5kNqyWyufHMzObs1pUYskSw1w4VrWTVdU",g=[{id:"standard",name:"Standard",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#333333"},{id:"luxury",name:"Luxury",fgColor:"#d4af37",bgColor:"#1a1a2e",borderColor:"#d4af37"},{id:"classic",name:"Classic",fgColor:"#1a1a1a",bgColor:"#f5f5dc",borderColor:"#8b7355"},{id:"bold",name:"Bold",fgColor:"#ffffff",bgColor:"#dc2626",borderColor:"#991b1b"},{id:"minimalist",name:"Minimalist",fgColor:"#000000",bgColor:"#ffffff",borderColor:"#e5e7eb"},{id:"sports",name:"Sports",fgColor:"#ffffff",bgColor:"#0f172a",borderColor:"#22c55e"},{id:"eco",name:"Eco",fgColor:"#ffffff",bgColor:"#16a34a",borderColor:"#15803d"}];let e={loading:!0,error:null,car:null,company:null,images:[],currentImage:0,showLeadForm:!1,leadSaved:!1,appName:"QRSTag",customQrUrl:"https://mfzl-2026.github.io/QRStag26",saving:!1,leadForm:{name:"",phone:"",email:"",interest_level:"normal",notes:""}};function f(){return Math.random().toString(36).substring(2,15)+Date.now().toString(36)}function v(){return new URLSearchParams(window.location.search).get("car")}function y(){const t=localStorage.getItem("appSettings");if(t){const o=JSON.parse(t);o.appName&&(e.appName=o.appName)}}async function w(){try{const t=v();if(!t){e.error="No car ID provided",e.loading=!1,d();return}const o=await fetch(`${p}/rest/v1/cars?id=eq.${t}&select=*`,{headers:{apikey:c,Authorization:`Bearer ${c}`}}),n=await o.json();if(console.log("Fetch response status:",o.status),console.log("Cars data:",n),!n||n.length===0){e.error="Car not found. ID: "+t,e.loading=!1,d();return}const a=n[0];if(console.log("Car data loaded:",a),console.log("Company ID:",a.company_id),a.images)try{e.images=typeof a.images=="string"?JSON.parse(a.images):a.images}catch{e.images=[]}if(e.car=a,e.leadForm.car_id=t,a.company_id){const s=await(await fetch(`${p}/rest/v1/companies?id=eq.${a.company_id}&select=*`,{headers:{apikey:c,Authorization:`Bearer ${c}`}})).json();s&&s.length>0&&(e.company=s[0])}try{const s=await(await fetch(`${p}/rest/v1/app_settings?id=eq.app_settings&select=app_name,custom_qr_url`,{headers:{apikey:c,Authorization:`Bearer ${c}`}})).json();console.log("App settings loaded:",s),s&&s.length>0&&(s[0].app_name&&(e.appName=s[0].app_name,console.log("App name set to:",e.appName)),s[0].custom_qr_url&&(e.customQrUrl=s[0].custom_qr_url))}catch{console.log("Using default app settings")}const r=`scanned_${t}`;if(!sessionStorage.getItem(r)){sessionStorage.setItem(r,"true");const l=(a.scan_count||0)+1,s=f(),u=new Date().toISOString();fetch(`${p}/rest/v1/scan_records`,{method:"POST",headers:{apikey:c,Authorization:`Bearer ${c}`,"Content-Type":"application/json",Prefer:"return=minimal",Upsert:"true"},body:JSON.stringify({id:s,car_id:t,scanned_at:u})}).then(async i=>{if(i.ok||i.status===201||i.status===200)console.log("✓ Scan recorded successfully:",s,"for car:",t);else{const h=await i.text();console.error("✗ Failed to record scan:",i.status,h)}}).catch(i=>{console.error("✗ Scan record error:",i)}),fetch(`${p}/rest/v1/cars?id=eq.${t}`,{method:"PATCH",headers:{apikey:c,Authorization:`Bearer ${c}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({scan_count:l,last_scanned_at:u})}).then(i=>{i.ok?console.log("✓ Scan count updated to:",l):console.error("✗ Scan count update failed:",i.status)}).catch(i=>{console.error("✗ Scan count update error:",i)})}}catch(t){console.error("Error:",t),e.error="Failed to load car data"}finally{e.loading=!1,d(),e.car&&F()}}function b(){var n;const t=((n=e.car)==null?void 0:n.qr_template)||"standard",o=g.find(a=>a.id===t)||g[0];return{fg:o.fgColor||"#000000",bg:o.bgColor||"#ffffff",border:o.borderColor||"#333333"}}const $={square:"0px",rounded_xs:"4px",rounded_sm:"8px",rounded_md:"16px",rounded_lg:"24px",rounded_xl:"32px",pill:"64px",circle:"50%",circle_md:"40%",octagon:"10px",hexagon:"12px",diamond:"4px"};function C(){var o;const t=((o=e.car)==null?void 0:o.qr_shape)||"square";return $[t]||"0px"}function _(){var o;const t=((o=e.car)==null?void 0:o.qr_shape)||"square";return["circle","pill","rounded_xl"].includes(t)}function I(){if(!e.car||e.car.is_active===!1)return!1;const t=new Date,o=e.car.scan_start_date?new Date(e.car.scan_start_date):null,n=e.car.scan_end_date?new Date(e.car.scan_end_date):null;return!(o&&t<o||n&&t>n)}function S(){if(!e.car)return"";const t=new Date,o=e.car.scan_start_date?new Date(e.car.scan_start_date):null,n=e.car.scan_end_date?new Date(e.car.scan_end_date):null;return!o&&!n?"Active":o&&t<o?`Starts ${e.car.scan_start_date}`:n&&t>n?"Expired":"Active"}function F(){const t=document.getElementById("qr-code");if(!t||!e.car)return;const o=b(),n=C(),a=_();let r;e.customQrUrl?r=e.customQrUrl.endsWith("/")?e.customQrUrl:e.customQrUrl+"/":r=window.location.origin+window.location.pathname.replace("index.html","").replace("customer-standalone.html","");const l=`${r}customer-standalone.html?car=${e.car.id}`;t.innerHTML="";const s=a?QRCode.CorrectLevel.M:QRCode.CorrectLevel.L;QRCode.toCanvas(l,{width:200,margin:2,errorCorrectionLevel:s,color:{dark:o.fg,light:o.bg}},(u,i)=>{u?console.error(u):(i.style.borderRadius=n,i.style.overflow="hidden",t.appendChild(i),t.style.border=`2px solid ${o.border}`,t.style.borderRadius=n,t.style.padding="8px",t.style.backgroundColor=o.bg,t.style.display="inline-block")})}async function k(){if(!e.leadForm.name.trim()){alert("Please enter your name");return}e.saving=!0,d();try{const t=await fetch(`${p}/rest/v1/leads`,{method:"POST",headers:{apikey:c,Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({id:f(),car_id:e.car.id,name:e.leadForm.name,phone:e.leadForm.phone||null,email:e.leadForm.email||null,interest_level:e.leadForm.interest_level,notes:e.leadForm.notes||null})});if(!t.ok){const o=await t.text();throw new Error(o||"Failed to save")}e.leadSaved=!0,setTimeout(()=>{e.showLeadForm=!1,e.leadSaved=!1,e.leadForm={name:"",phone:"",email:"",interest_level:"normal",notes:""},d()},3e3)}catch(t){console.error("Error saving lead:",t),alert("Failed to submit. Please try again.")}finally{e.saving=!1,d()}}function d(){const t=document.getElementById("app"),o=b(),n=I();if(document.body.style.background="#f3f4f6",e.loading){t.innerHTML=`
          <div class="min-h-screen flex items-center justify-center bg-gray-100">
            <div class="text-center bg-white rounded-2xl shadow-lg p-12">
              <div class="spinner mx-auto mb-4"></div>
              <p class="text-gray-600">Loading car details...</p>
            </div>
          </div>
        `;return}if(e.error||!e.car){t.innerHTML=`
          <div class="min-h-screen flex items-center justify-center p-4 bg-gray-100">
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
              <div class="text-6xl mb-4">🔍</div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Car Not Found</h2>
              <p class="text-gray-600">${e.error||"This QR code is invalid or has been removed."}</p>
            </div>
          </div>
        `;return}const a=e.car,r=e.company;t.innerHTML=`
        <!-- Header -->
        ${r?`
          <div class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
              ${r.branding_logo&&a.logo_position==="top"?`<img src="${r.branding_logo}" alt="Logo" class="w-10 h-10 object-contain">`:""}
              <h1 class="text-lg font-semibold text-gray-800">${r.name}</h1>
            </div>
          </div>
        `:""}

        <div class="max-w-2xl mx-auto p-4">
          <!-- QR Not Active Warning -->
          ${n?"":`
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
                  <img src="${e.images[e.currentImage]}" alt="${a.make} ${a.model}" class="w-full h-64 object-cover">
                  ${e.images.length>1?`
                    <button onclick="prevImage()" class="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">◀</button>
                    <button onclick="nextImage()" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">▶</button>
                  `:""}
                </div>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  ${e.images.map((l,s)=>`
                    <img src="${l}" alt="Thumbnail ${s+1}" onclick="setImage(${s})" class="w-16 h-16 object-cover rounded-lg cursor-pointer ${e.currentImage===s?"ring-2 ring-blue-500":"opacity-70"} flex-shrink-0">
                  `).join("")}
                </div>
              </div>
            `:""}

            <!-- Car Title and Price -->
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">${a.year} ${a.make} ${a.model}</h1>
              ${a.price?`<p class="text-3xl font-bold text-blue-600">${a.price}</p>`:""}
            </div>

            <!-- Car Specs Grid -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              ${a.mileage?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Mileage</p><p class="font-semibold">${a.mileage}</p></div>`:""}
              ${a.color?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Color</p><p class="font-semibold">${a.color}</p></div>`:""}
              ${a.fuelType?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Fuel Type</p><p class="font-semibold">${a.fuelType}</p></div>`:""}
              ${a.transmission?`<div class="bg-gray-50 rounded-xl p-4"><p class="text-gray-500 text-sm mb-1">Transmission</p><p class="font-semibold">${a.transmission}</p></div>`:""}
            </div>

            <!-- Description -->
            ${a.description?`
              <div class="mb-6">
                <h3 class="font-semibold text-gray-800 mb-2">Description</h3>
                <p class="text-gray-600 leading-relaxed">${a.description}</p>
              </div>
            `:""}

            <!-- Contact Buttons -->
            <div class="grid grid-cols-3 gap-3 mb-4">
              ${a.contactPhone?`<a href="tel:${a.contactPhone}" class="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition"><span class="text-blue-600 text-xl">📞</span><span class="font-medium text-blue-700 text-sm">Call</span></a>`:""}
              ${a.contact_whatsapp?`<a href="https://wa.me/${a.contact_whatsapp.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Hi, I'm interested in your ${a.year} ${a.make} ${a.model}`)}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition"><span class="text-green-600 text-xl">💬</span><span class="font-medium text-green-700 text-sm">WhatsApp</span></a>`:""}
              ${a.contactEmail?`<a href="mailto:${a.contactEmail}?subject=Inquiry about ${a.year} ${a.make} ${a.model}" class="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition"><span class="text-gray-600 text-xl">✉️</span><span class="font-medium text-gray-700 text-sm">Email</span></a>`:""}
            </div>

            <!-- Interested Button -->
            <button onclick="${n?"toggleLeadForm()":""}" class="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${n?"bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90":"bg-gray-300 text-gray-500 cursor-not-allowed"}">
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
          ${a.company_name_position==="bottom"&&r?`
            <div class="flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg p-6 mb-6">
              ${r.branding_logo&&a.logo_position==="bottom"?`<img src="${r.branding_logo}" alt="Logo" class="w-12 h-12 object-contain">`:""}
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
      `}window.toggleLeadForm=()=>{e.showLeadForm=!e.showLeadForm,d()};window.updateLeadForm=(t,o)=>{e.leadForm[t]=o};window.setInterestLevel=t=>{e.leadForm.interest_level=t,d()};window.setImage=t=>{e.currentImage=t,d()};window.prevImage=()=>{e.currentImage=e.currentImage===0?e.images.length-1:e.currentImage-1,d()};window.nextImage=()=>{e.currentImage=e.currentImage===e.images.length-1?0:e.currentImage+1,d()};window.saveLead=k;function m(){const o=document.body.lastElementChild;o&&o.id!=="app"&&o.tagName!=="SCRIPT"&&(o.style.cssText="display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important;",o.removeAttribute("class")),document.querySelectorAll("*").forEach(r=>{if(r.id!=="app"){const l=r.textContent||"";(l.includes("MiniMax")||l.includes("mcode")||l.includes("Created by"))&&(r.style.cssText="display: none !important; visibility: hidden !important;")}}),document.querySelectorAll('[style*="position: fixed"], [style*="position:absolute"]').forEach(r=>{if(r.id!=="app"){const l=r.textContent||"";(l.includes("MiniMax")||l.includes("mcode"))&&(r.style.cssText="display: none !important;")}})}m();setTimeout(m,50);setTimeout(m,100);setTimeout(m,200);setTimeout(m,500);setTimeout(m,1e3);setTimeout(m,2e3);typeof MutationObserver<"u"&&new MutationObserver(()=>{m()}).observe(document.body,{childList:!0,subtree:!0,attributes:!0});function x(){m(),requestAnimationFrame(x)}requestAnimationFrame(x);y();w();
