# Car QR Showcase — Infrastructure & Operating Cost Plan

Launch target: 100 vehicles (5 images each = 500 images), multi-tenant for car dealers / showrooms.

All figures below are measured from the live project (`uifcfnkbccluhyryywxe`) or taken from
published vendor pricing pages on 2026-10-29. Measured values are marked **[M]**.

---

## 1. Services you actually need

| Service | Plan | Purpose in this product | Cost |
|---|---|---|---|
| **GitHub** | Free (repo + Pages) | Source control, CI-free deploy, and the **production web host** (Pages serves `main:/docs`) | $0 |
| **Supabase** | **Pro $25/mo** | Postgres database (companies, cars, leads, scan_records, app_settings), PostgREST API, file storage for photos, Auth, backups | $25/mo |
| **MiniMax API** | Pay-as-you-go, prepaid credits | **Optional** AI layer: auto vehicle descriptions, lead auto-replies, TTS walkarounds, marketing images/video | $0–40/mo |
| **Domain** (optional) | ~$10–15/yr | `qrstag.io`-style address; Pages supports custom domains free | ~$1/mo |
| **Payment processor** | Stripe / PayPal | Subscription billing from dealers | 2.9% + $0.30/txn |

**Not required:** no servers, no database server to manage, no container hosting, no CDN purchase
(GitHub Pages + Supabase CDN cover launch), no Actions minutes (Pages builds from the branch).

---

## 2. Measured baseline of the current deployment **[M]**

| Asset | Measured size |
|---|---|
| `app_settings.app_logo` | **1.32 MB** (base64 in the DB, downloaded on *every* page view) |
| `companies.branding_logo` | 286 KB per dealer |
| `cars.images` | 175 KB per vehicle (already client-side compressed) |
| **Payload per customer page view** | **≈ 1.78 MB** (app logo + vehicle images + dealer logo) |
| Static JS shipped to the admin | 1.08 MB + 556 KB |
| Static JS shipped to customers | 65 KB + 32 KB CSS |
| DB rows | 4 companies, 9 cars, 18 leads, 409 scan_records, 1 app_settings |

The single biggest cost driver is **not** the vehicle photos — it is the 1.32 MB `app_logo`
embedded in a database row and re-downloaded on every single page load.

---

## 3. Capacity model — 100 vehicles (500 images)

Assume 175 KB per compressed image (measured), 5 images per vehicle.

| Resource | As-is (base64 in Postgres) | Recommended (Storage + CDN) |
|---|---|---|
| Image bytes | 500 × 175 KB = **87.5 MB** binary → **~120 MB** base64 text | 87.5 MB in a Storage bucket |
| Postgres disk | ~125 MB (of 500 MB free / 8 GB Pro) | ~2 MB |
| Egress per customer view | ~1.78 MB | ~0.25–0.7 MB |
| Egress @ 2,000 views/mo | 3.6 GB | 0.5–1.4 GB |
| Egress @ 10,000 views/mo | 17.8 GB ❌ (breaks 5 GB free) | 2.5–7 GB ✅ |
| DB rows written | 1 `scan_records` row per QR scan + leads | same |
| API requests | ~5 per scan (3 GET + 1 POST + 1 PATCH) | same |

**Storage headroom:** Supabase Free = 1 GB file storage → 1 GB ÷ 85 MB ≈ **11 batches of 100
vehicles ≈ 1,100 vehicles**. Pro = 100 GB → **~115,000 vehicles**. Storage is never the constraint;
**egress and image format are**.

---

## 4. Monthly cost at each stage

| | 100 vehicles | 500 vehicles | 1,000 vehicles | 5,000 vehicles |
|---|---|---|---|---|
| Vehicles | 100 | 500 | 1,000 | 5,000 |
| Images | 500 (85 MB) | 2,500 (425 MB) | 5,000 (850 MB) | 25,000 (4.3 GB) |
| Customer views / mo | 200 | 3,750 | 7,500 | 30,000 |
| Egress (optimized) | 0.1 GB | 0.9 GB | 1.9 GB | 7.5 GB |
| Postgres disk (optimized) | 2 MB | 5 MB | 10 MB | 25 MB |
| **GitHub Pages** | **$0** | **$0** | **$0** | **$0** |
| **Supabase Pro** | **$25** | **$25** | **$25** | **$25** (add Team $599 for org-wide controls/SLA) |
| Storage overage | $0 | $0 | $0 | $0 (4.3 GB ≪ 100 GB) |
| Egress overage | $0 | $0 | $0 | $0 (7.5 GB ≪ 250 GB) |
| **MiniMax AI** (optional) | $0–5 | $5–15 | $15–40 | $40–120 |
| Domain | ~$1 | ~$1 | ~$1 | ~$1 |
| **Total infra / mo** | **≈ $26–31** | **≈ $31–41** | **≈ $41–66** | **≈ $66–146** |
| Payment processing | 2.9% + $0.30 per dealer invoice | same | same | same |

**Reality check:** at 5,000 vehicles your infrastructure bill is still under $150/month while
handling ~25,000 images and 30,000 monthly scans. The business cost will be *acquisition and
support*, never infrastructure.

---

## 5. Recommended tiers for the launch phase

| Service | Recommendation | Why |
|---|---|---|
| **GitHub** | Free | Pages is free for commercial use, 100 GB/mo soft bandwidth, 1 GB repo. Keep images out of the repo (they live in Supabase Storage). |
| **Supabase** | **Pro $25/mo from day 1** | Two reasons: (a) Free projects are **paused after ~1 week of inactivity** — fatal for a production SaaS; (b) Pro gives daily backups (7-day retention), 8 GB disk, 250 GB egress, 100k MAU, no pausing. |
| **MiniMax** | Prepaid credits, cap at $25 | Do not add AI to the customer-page hot path until it is a paid differentiator. |
| **Domain** | Buy one | Professional invoices + future-proofing against GitHub Pages limits. |
| **Auth** | Supabase Auth (included in Pro) | Required before charging money — see §7. |

**Minimum viable budget to go live and onboard the first 100 vehicles: ~$30/month**
(Supabase Pro $25 + domain amortised $1 + $5 MiniMax credits) → **≈ $90 for the first 90 days**,
plus Stripe fees on collected subscriptions. Add a $50–100 float for overage/AI spikes.

---

## 6. MiniMax cost model (optional revenue features)

| Feature | Unit price | 100 vehicles | 1,000 vehicles/mo |
|---|---|---|---|
| AI vehicle description (M3: $0.30/M in, $1.20/M out) | ≈ $0.0005 per car | $0.05 | $0.50 |
| Lead auto-reply / AI chat on customer page | ≈ $0.0008 per turn | — | $4–8 (1,000 convos × 5 turns) |
| TTS vehicle walkaround ($0.38/h; $100/M chars HD, $60/M Turbo) | ≈ $0.06–0.09 per 60 s | $6–9 | — |
| Marketing image (image-01) | ≈ $0.0035 per image | $0.35 | $3.50 |
| Marketing video (H3: $0.08/s 768p, $0.13/s 2K) | ≈ $0.48–0.78 per 6 s clip | $50–78 | — |

**Sell AI as an add-on**, e.g. "$29 per 6-second cinematic clip" against a $0.48–0.78 cost = ~40x
margin. Never let AI run unmetered on the public customer page.

---

## 7. Cost optimization checklist (highest impact first)

1. **Move vehicle photos out of Postgres into Supabase Storage.** Store URLs, not base64.
   Cuts DB size ~40x, query payload ~15x, and lets the CDN cache images.
2. **Generate two derivatives on upload**: 1600px WebP hero (~120 KB) and 400px thumb (~15 KB).
   Never ship the original to the customer page.
3. **Shrink `app_logo` from 1.32 MB to <100 KB** and serve it from Storage. This alone removes
   ~94% of the traffic on every page view.
4. **Cache `app_settings` + company branding** client-side (localStorage, 60 s TTL) instead of
   re-fetching on every page load.
5. **Lazy-load the gallery** (`loading="lazy"` + `srcset`), show 1 image first.
6. **Prefer cached egress** — Supabase CDN cached egress is $0.03/GB vs $0.09/GB uncached.
7. **Split the admin bundle** (1.08 MB + 556 KB). Lazy-load admin panels; admins are a handful
   of users but the bundle is downloaded by every one of them.
8. **Sample scan tracking** if volume grows (log 1 in N scans) — `scan_records` grows 1 row per
   scan and is the fastest-growing table.
9. **Watch GitHub Pages' 100 GB/mo soft cap** and the 1 GB repo limit — never commit images.
10. **Move to a custom domain + Cloudflare proxy** when traffic grows; Cloudflare R2 ($0.015/GB,
    zero egress) is cheaper than Supabase Storage if you exceed 100 GB of photos.

---

## 8. Scaling triggers (know when to spend)

| Trigger | Signal | Action |
|---|---|---|
| Photos > 1 GB | 1 GB storage | Free → still free, but plan the Storage-only pipeline now |
| DB > 4 GB | base64 images still in Postgres | **Mandatory**: migrate images to Storage (Pro disk = 8 GB/project) |
| Egress > 100 GB/mo | dashboard usage | Enable CDN caching, downscale images, add Cloudflare R2 |
| Scans > 100k/mo | `scan_records` growth | Batch/sampling, archive old rows to cold storage |
| Dealers > 5 seats | team needs | Supabase Team $599/mo, or per-dealer projects on the $25 plan |
| Auth MAU > 100k | dashboard | Upgrade (Pro 100k, then usage-based) |
| GitHub Pages traffic > 50 GB/mo | soft limit warning | Mirror to Cloudflare Pages (free) / Netlify (free) |

---

## 9. Commercial launch checklist (technical blockers first)

**Before accepting the first paying dealer:**

- [ ] **Tenant isolation.** Today the admin app reads `companies` / `cars` / `leads` with no
      `company_id` filter and there is **no Supabase Auth** — login is a `localStorage` flag
      (`src/App.tsx:746-899`). One logged-in user can see every dealer's data. Add Supabase Auth
      + RLS policies keyed on `company_id` before selling access.
- [ ] **The anon key currently has write access.** Verified: the anon role can `PATCH cars`,
      `DELETE scan_records` and `INSERT`. Enable RLS and expose only what the public customer
      page needs (read car/company/settings, insert lead + scan_record).
- [ ] Move vehicle images to Storage + CDN.
- [ ] Shrink `app_logo`; cache settings client-side.
- [ ] Stripe subscription billing + webhook that writes `companies.plan` (column already exists).
- [ ] Custom domain + HTTPS (Pages provides Let's Encrypt automatically).
- [ ] Terms of service, privacy policy, and per-dealer data-processing terms.
- [ ] Nightly `pg_dump` to an external bucket (Pro's 7-day retention is not a backup strategy).
- [ ] Usage metering per company (vehicles, scans) so limits and billing are auditable.
- [ ] QR code pack generator (printable PDF sheet) — dealers cannot use the product without it.
- [ ] Lead delivery channel (email / WhatsApp Business API) so a scan becomes a reachable lead.

**First 30 days:** onboard 3–5 dealers free (or at a founding price), collect real usage data,
then convert to paid with the numbers in hand.

---

## 10. Unit economics to aim for

- One qualified vehicle lead is worth **$300–$1,500** to a dealer.
- A dealer with 30 vehicles doing 5 scans each/month = 150 scans = ~$0.15 of infrastructure.
- ⇒ Price the dealer plan at **$29–49/month (25 vehicles)** and **$99/month (100 vehicles +
  white-label branding + lead alerts)**. Ten dealers at $79 = **$790/mo revenue against ~$30 of
  infrastructure (>96% gross margin)**.
- Add-ons that cost almost nothing to serve but price well: AI marketing clip per vehicle
  ($0.48 cost → $29), extra QR/sticker packs, priority lead alerts, multi-branch dealership plans.
