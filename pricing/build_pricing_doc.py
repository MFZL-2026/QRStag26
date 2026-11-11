#!/usr/bin/env python3
"""
Builds the Car QR Showcase pricing strategy document as HTML for HTML->PDF.

All numbers come from pricing_model.py so the document and the spreadsheet
model can never drift apart.

Run:  python3 build_pricing_doc.py > pricing_doc.html
"""
import pricing_model as M

# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
def cost_buildup_rows():
    cols = [("A5", "regional", 25), ("A5", "factory", 500),
            ("A4", "regional", 25), ("A4", "factory", 500)]
    data = [M.landed_cost(sz, q, rt) for sz, rt, q in cols]
    lines = [("Print + material + trim + variable data", "print"),
             ("Outdoor overlaminate (polymeric)", "laminate"),
             ("Packaging", "packaging"),
             ("Freight, door to door (DDP)", "freight"),
             (f"Duty + tax buffer ({M.DUTY_BUFFER:.0%})", "duty"),
             (f"Wastage and rejects ({M.WASTAGE:.0%})", "wastage"),
             ("Print-job setup (amortised)", "setup_unit")]
    rows = ""
    for label, key in lines:
        cells = "".join(f'<td class="num">{d[key]:.3f}</td>' for d in data)
        rows += f'<tr><td>{esc(label)}</td>{cells}</tr>'
    tot = "".join(f'<td class="num">{d["landed"] + d["setup_unit"]:.3f}</td>' for d in data)
    rows += f'<tr class="tot"><td>Landed cost per unit</td>{tot}</tr>'
    return rows


def cost_head_cells():
    out = ""
    for sz, rt, q in (("A5", "regional", 25), ("A5", "factory", 500),
                       ("A4", "regional", 25), ("A4", "factory", 500)):
        lbl = "Regional" if rt == "regional" else "Factory"
        out += f'<th class="num" style="text-align:right">{sz}<br>{lbl} @ {q}</th>'
    return out


def cliff_rows():
    rows = ""
    for qty in (25, 100, 249, 250, 500, 1000, 5000):
        r5 = M.landed_cost("A5", qty, "regional")
        f5 = M.landed_cost("A5", qty, "factory")
        r4 = M.landed_cost("A4", qty, "regional")
        f4 = M.landed_cost("A4", qty, "factory")
        b5 = "factory" if (qty >= M.FACTORY_MOQ and f5["landed"] < r5["landed"]) else "regional"
        b4 = "factory" if (qty >= M.FACTORY_MOQ and f4["landed"] < r4["landed"]) else "regional"
        best5 = min(r5["landed"], f5["landed"]) if qty >= M.FACTORY_MOQ else r5["landed"]
        best4 = min(r4["landed"], f4["landed"]) if qty >= M.FACTORY_MOQ else r4["landed"]
        rows += (f'<tr><td class="num">{qty:,}</td>'
                 f'<td class="num">{r5["landed"]:.3f}</td><td class="num">{f5["landed"]:.3f}</td>'
                 f'<td class="num">{best5:.3f}</td>'
                 f'<td class="num">{r4["landed"]:.3f}</td><td class="num">{f4["landed"]:.3f}</td>'
                 f'<td class="num">{best4:.3f}</td>'
                 f'<td class="tag">{b5}</td></tr>')
    return rows


def price_rows():
    rows = ""
    for name, minq, a5p, a4p, kit in M.CHANNELS:
        c5 = M.best_route("A5", minq)
        c4 = M.best_route("A4", minq)
        g5 = (a5p - c5["landed"]) / a5p
        g4 = (a4p - c4["landed"]) / a4p
        gk = (kit - c5["landed"] - c4["landed"]) / kit
        disc = (1 - a5p / M.LIST["A5"]) * 100
        rows += (f'<tr><td class="b">{esc(name)}</td>'
                 f'<td class="num">{minq:,}{"+" if name != "Individual" else ""}</td>'
                 f'<td class="num price">${a5p:.2f}</td>'
                 f'<td class="num">{c5["landed"]:.2f}</td><td class="num gm">{g5:.0%}</td>'
                 f'<td class="num price">${a4p:.2f}</td>'
                 f'<td class="num">{c4["landed"]:.2f}</td><td class="num gm">{g4:.0%}</td>'
                 f'<td class="num price">${kit:.2f}</td><td class="num gm">{gk:.0%}</td>'
                 f'<td class="num">{disc:.0f}%</td></tr>')
    return rows


def stress_rows():
    rows = ""
    for name, minq, a5p, a4p, kit in M.CHANNELS:
        m5 = (a5p - M.best_route("A5", minq, "MID")["landed"]) / a5p
        h5 = (a5p - M.best_route("A5", minq, "HIGH")["landed"]) / a5p
        m4 = (a4p - M.best_route("A4", minq, "MID")["landed"]) / a4p
        h4 = (a4p - M.best_route("A4", minq, "HIGH")["landed"]) / a4p
        n5 = m5 - M.PAYMENT_FEE - M.FX_BUFFER
        n4 = m4 - M.PAYMENT_FEE - M.FX_BUFFER
        rows += (f'<tr><td class="b">{esc(name)}</td>'
                 f'<td class="num gm">{m5:.0%}</td><td class="num">{h5:.0%}</td>'
                 f'<td class="num gm">{m4:.0%}</td><td class="num">{h4:.0%}</td>'
                 f'<td class="num net">{n5:.0%}</td><td class="num net">{n4:.0%}</td></tr>')
    return rows


def dealer_rows():
    rows = ""
    for veh in (20, 40, 80, 150, 300):
        tier = max((c for c in M.CHANNELS if veh >= c[1]), key=lambda c: c[1])
        name, minq, a5p, a4p, kit = tier
        rev = veh * a5p
        cost = veh * M.best_route("A5", veh)["landed"]
        plat = M.PLATFORM_FEE[name]
        total = rev + plat
        rows += (f'<tr><td class="num">{veh}</td><td class="b">{esc(name)}</td>'
                 f'<td class="num price">${a5p:.2f}</td>'
                 f'<td class="num">${rev:,.0f}</td><td class="num">${cost:,.0f}</td>'
                 f'<td class="num">${plat:,.0f}</td><td class="num price">${total:,.0f}</td>'
                 f'<td class="num gm">{(total - cost) / total:.0%}</td></tr>')
    return rows


def per_vehicle_rows():
    rows = ""
    for name, minq, a5p, a4p, kit in M.CHANNELS:
        rows += (f'<tr><td class="b">{esc(name)}</td>'
                 f'<td class="num price">${kit:.2f}</td>'
                 f'<td class="num">${M.PLATFORM_FEE[name]:,.0f}</td>'
                 f'<td class="num">${a5p + (M.PLATFORM_FEE[name] * 12 / max(minq, 1)):.2f}</td>'
                 f'<td class="num">${kit + (M.PLATFORM_FEE[name] * 12 / max(minq, 1)):.2f}</td></tr>')
    return rows


def esc(s):
    import html
    return html.escape(str(s), quote=True)


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------
TOC = [
    ("s1", "1. Executive summary", 1),
    ("s2", "2. Where the business stands today", 1),
    ("s3", "3. The strategic shift", 2),
    ("s4", "4. The product", 2),
    ("s5", "5. The cost model", 3),
    ("s6", "6. The route cliff", 3),
    ("s7", "7. The price architecture", 4),
    ("s8", "8. Channel definitions", 4),
    ("s9", "9. The subscription, and the pricing conflict", 5),
    ("s10", "10. Dealer unit economics", 5),
    ("s11", "11. Collecting the money in Iraq", 6),
    ("s12", "12. Guardrails", 6),
    ("s13", "13. Risks and mitigations", 7),
    ("s14", "14. Rollout plan", 7),
    ("s15", "15. Open decisions", 8),
    ("s16", "16. Sources", 8),
]

import json as _json, os as _os
_PAGES = {}
if _os.path.exists("toc_pages.json"):
    try:
        _PAGES = _json.load(open("toc_pages.json"))
    except Exception:
        _PAGES = {}

toc_html = "".join(
    f'<a class="toc-row" href="#{sid}"><span>{lbl}</span>'
    f'<span class="pg">{_PAGES.get(sid, pg)}</span></a>'
    for sid, lbl, pg in TOC)


def page(pid, head_left, head_right, body):
    """A flowing block. Content paginates naturally; the footer is rendered
    by the PDF engine so it repeats on every page."""
    return f"""<section class="flow">
  <div class="eyebrow"><span>{head_left}</span><span>{head_right}</span></div>
  {body}
</section>"""


HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Car QR Showcase - Pricing Strategy</title>
<style>
@page {{ size: A4 portrait; margin: 12mm; }}
* {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html, body {{ margin: 0; padding: 0; }}
body {{ font-family: "Trebuchet MS", "Calibri", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 9.2pt; line-height: 1.45; color: #000814; -webkit-font-smoothing: antialiased; }}
.flow {{ margin-bottom: 6mm; }}
.eyebrow {{ display: flex; justify-content: space-between; font-size: 7.2pt; color: #1F4E85;
  border-bottom: .6pt solid #9FB3C8; padding-bottom: 1mm; margin-bottom: 4mm;
  text-transform: uppercase; letter-spacing: .5pt; }}
.eyebrow span:last-child {{ color: #4E6E8E; }}
h2 {{ break-before: auto; break-after: avoid; }}
.avoid-break {{ break-inside: avoid; page-break-inside: avoid; }}
.callout, .sk-c, .kpi, .masthead, .toc {{ break-inside: avoid; page-break-inside: avoid; }}

.masthead {{ background: #001D3D; color: #fff; padding: 4mm 5mm; border-left: 3.4mm solid #FFC300;
  display: flex; align-items: flex-end; justify-content: space-between; }}
.masthead h1 {{ margin: 0; font-size: 16pt; letter-spacing: .2pt; line-height: 1.1; }}
.masthead h1 span {{ color: #FFC300; }}
.masthead .sub {{ margin-top: 1mm; font-size: 8.4pt; color: #C3D3E4; }}
.masthead .meta {{ text-align: right; font-size: 7.6pt; color: #C3D3E4; line-height: 1.5; }}
.masthead .meta b {{ color: #FFC300; display: block; font-size: 9pt; letter-spacing: .4pt; }}

h2 {{ font-size: 12pt; color: #001D3D; margin: 5mm 0 2mm; padding-bottom: 1.2mm;
  border-bottom: 1.2pt solid #001D3D; page-break-after: avoid; }}
h2:first-child {{ margin-top: 0; }}
h3 {{ font-size: 9.6pt; color: #1F4E85; margin: 3.2mm 0 1.2mm; page-break-after: avoid; }}
p {{ margin: 0 0 1.6mm; }}
ul, ol {{ margin: 0 0 1.8mm; padding-left: 4.6mm; }}
li {{ margin-bottom: .8mm; }}
b, strong {{ color: #001D3D; }}

.callout {{ border-left: 2.4mm solid #FFC300; background: #FFF8E1; padding: 2mm 3mm; margin: 2mm 0; font-size: 8.6pt; }}
.callout.blue {{ border-left-color: #1F4E85; background: #EFF4FA; }}
.callout.red {{ border-left-color: #C62828; background: #FDECEA; }}
.callout .h {{ font-weight: bold; color: #001D3D; display: block; margin-bottom: .8mm; }}

table {{ width: 100%; border-collapse: collapse; font-size: 8.1pt; margin: 1.5mm 0 2.5mm; }}
#risks-table, #rollout-table {{ font-size: 7.4pt; }}
#risks-table td, #rollout-table td {{ padding: .7mm 1.3mm; }}
#risks-table th, #rollout-table th {{ padding: .9mm 1.3mm; font-size: 6.9pt; }}
th {{ background: #001D3D; color: #fff; text-align: left; padding: 1.3mm 1.6mm;
  font-size: 7.4pt; text-transform: uppercase; letter-spacing: .35pt; }}
td {{ padding: 1.05mm 1.6mm; border-bottom: .3pt solid #C3D3E4; vertical-align: top; }}
tbody tr:nth-child(even) {{ background: #F7F9FB; }}
td.num {{ text-align: right; white-space: nowrap; }}
td.price {{ font-weight: bold; color: #001D3D; }}
td.gm {{ color: #2E7D32; font-weight: bold; }}
td.net {{ color: #1F4E85; font-weight: bold; }}
td.ind {{ padding-left: 5mm; color: #16324F; }}
tr.grp td {{ background: #EFF4FA !important; font-weight: bold; color: #1F4E85; font-size: 7.6pt;
  text-transform: uppercase; letter-spacing: .4pt; padding: 1.1mm 1.6mm; }}
tr.tot td {{ background: #F0F4F8 !important; font-weight: bold; border-top: .8pt solid #1F4E85; }}
td.b {{ font-weight: bold; color: #001D3D; }}
.tag {{ font-size: 7.2pt; color: #1F4E85; text-transform: uppercase; letter-spacing: .3pt; }}

.toc {{ margin: 3mm 0 0; border: .6pt solid #C3D3E4; background: #F7F9FB; padding: 2.4mm 3mm; }}
.toc-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 5mm; }}
.toc-row {{ display: flex; justify-content: space-between; font-size: 8pt; color: #16324F;
  text-decoration: none; padding: .5mm 0; border-bottom: .3pt dotted #C3D3E4; }}
.toc-row .pg {{ color: #B8860B; font-weight: bold; }}

.kpi {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.6mm; margin: 2mm 0; }}
.kpi-c {{ background: #F0F4F8; border-top: 1.6mm solid #FFC300; padding: 1.8mm 2.4mm; }}
.kpi-c .v {{ font-size: 14pt; font-weight: bold; color: #001D3D; line-height: 1.1; }}
.kpi-c .l {{ font-size: 7pt; color: #4E6E8E; text-transform: uppercase; letter-spacing: .4pt; margin-top: .8mm; }}

.cols2 {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 5mm; }}
.sk {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 2mm 0; }}
.sk-c {{ border: .6pt solid #C3D3E4; border-top: 1.6mm solid #1F4E85; padding: 2.2mm 2.6mm; }}
.sk-c .nm {{ font-weight: bold; color: #001D3D; font-size: 9.4pt; }}
.sk-c .dim {{ font-size: 7.6pt; color: #4E6E8E; margin: .6mm 0 1.2mm; }}
.sk-c .pr {{ font-size: 8.4pt; color: #16324F; }}
.sk-c .pr b {{ color: #001D3D; }}
.src {{ font-size: 7.4pt; color: #4E6E8E; line-height: 1.45; }}
.src li {{ margin-bottom: 1mm; }}
.avoid-break {{ page-break-inside: avoid; }}

/* Screen emulation: the printed content area is 210-24 = 186mm wide and
   297-26 = 271mm tall. Mirror that exactly, or the browser preview lies
   about what fits on the page. */
@media screen {{
  html {{ background: #d0d0d0; }}
  body {{ margin: 0; padding: 20px 0; }}
  body > section.flow {{ width: 186mm; margin: 0 auto 24px; background: #fff;
    box-shadow: 0 4px 24px rgba(0,0,0,.18); box-sizing: border-box; padding: 10mm 12mm; }}
}}
</style>
</head>
<body>

{page("Page 1 of 8", "CAR QR SHOWCASE", "Pricing strategy", f'''
<div class="masthead">
  <div>
    <h1>Pricing <span>Strategy</span></h1>
    <div class="sub">Showrooms, dealers and individual customers &middot; premium full-colour A5 and A4 stickers</div>
  </div>
  <div class="meta">
    <b>2026-11-11</b>
    <div style="margin-top:1mm">Version 1.0 &middot; draft for decision</div>
    <div>All prices USD, ex-VAT, DDP Iraq</div>
  </div>
</div>

<nav class="toc" aria-label="Contents">
  <div class="toc-h" style="font-size:7pt;text-transform:uppercase;letter-spacing:.7pt;color:#1F4E85;font-weight:bold;margin-bottom:1.2mm">Contents</div>
  <div class="toc-grid">{toc_html}</div>
</nav>

<h2 id="s1">1. Executive summary</h2>
<p>This document redesigns the Car QR Showcase pricing model around a product you do not sell yet:
a <b>premium, full-colour printed sticker</b> that you produce and ship, rather than a PNG the
dealer prints on their own office printer. The cost of producing that sticker is real, and it
changes the shape of the business.</p>

<div class="kpi">
  <div class="kpi-c"><div class="v">$0.61</div><div class="l">A5 landed cost @ 250+ units</div></div>
  <div class="kpi-c"><div class="v">6&times;</div><div class="l">Cost gap: factory vs regional</div></div>
  <div class="kpi-c"><div class="v">56&ndash;87%</div><div class="l">Gross margin across the ladder</div></div>
  <div class="kpi-c"><div class="v">43%+</div><div class="l">Margin even in the high-cost case</div></div>
</div>

<div class="callout">
  <span class="h">The five findings that shape this strategy</span>
  <ol style="margin-bottom:0">
    <li><b>There is no payment integration in the product.</b> The plan and price fields are labels
    on a card &mdash; nothing charges anyone. A monthly subscription is hard to collect in Iraq; a
    prepaid physical product is not.</li>
    <li><b>Your cost base swings 6&times; on sourcing, not on volume.</b> A factory run is one-sixth
    the unit cost of a regional shop &mdash; worth more than every discount you could give.</li>
    <li><b>There is a cliff at 250 units</b> where factory economics begin: a 3&ndash;4&times; margin
    step. Every price below is built around it.</li>
    <li><b>Nobody is paying you yet.</b> All four live accounts are on the free plan, so the structure
    can change with zero churn risk.</li>
    <li><b>Your deck and your app disagree.</b> Professional is $79 in the deck, $99 in the app;
    Enterprise $149 versus $299. Pick one source of truth before invoicing anyone.</li>
  </ol>
</div>

<p>The recommendation in one line: <b>make the sticker the product and the dashboard the service.</b>
Prepaid sticker orders carry the revenue and the cash; the subscription carries the relationship
and the renewal.</p>

<h2 id="s2">2. Where the business stands today</h2>
<div class="cols2">
<div>
<h3>What you sell now</h3>
<p>Three plans in the pitch deck (Starter $29, Professional $79, Enterprise $149) and a different set
in the admin panel (Free $0, $29, $99, $299). The QR code is a <b>PNG</b> the dealer prints
themselves, and the operating cost plan calls sticker packs an add-on that "costs almost nothing to
serve".</p>
<h3>Live accounts</h3>
<p>Four dealer accounts &mdash; MKMA (Baghdad), Company 2 (Erbil), Company 3 (Basra), Company 4
(Duhok) &mdash; all four on the <b>free</b> plan. MKMA carries a custom price of $300 while sitting
on free, so its card reads "$300/mo" next to a "Free" badge.</p>
</div>
<div>
<h3>Three problems with that</h3>
<ul>
<li><b>Nothing charges money.</b> There is no checkout, no invoice, no gateway anywhere in the code.
Collection is manual and undocumented.</li>
<li><b>A recurring subscription is the hardest thing to sell here.</b> Iraqi card penetration is low,
Stripe and PayPal are not officially available in Iraq, and the local alternatives are
wallet-based. The dominant pattern is cash on delivery or bank transfer.</li>
<li><b>The two revenue artefacts contradict each other.</b> A dealer shown the deck and a dealer
shown the admin panel are being quoted different numbers for the same tier.</li>
</ul>
</div>
</div>
''')}

{page("Page 2 of 8", "CAR QR SHOWCASE", "The strategic shift", f'''
<h2 id="s3">3. The strategic shift</h2>
<p>Adding a physical product changes the business in a way that is easy to miss, because the
<b>pricing</b> is only part of it. The bigger change is to <b>how the money arrives</b>.</p>

<table class="avoid-break">
<thead><tr><th style="width:31%">&nbsp;</th><th style="width:34.5%">Software subscription only</th><th style="width:34.5%">Software + printed sticker</th></tr></thead>
<tbody>
<tr><td class="b">What the customer buys</td><td>Recurring access to a dashboard</td><td>A physical product, once</td></tr>
<tr><td class="b">How it is paid</td><td>Every month, automatically</td><td>Once, upfront</td></tr>
<tr><td class="b">Payment risk in Iraq</td><td>High &mdash; recurring card billing is weak here</td><td>Low &mdash; one transfer, or COD</td></tr>
<tr><td class="b">If they stop paying</td><td>Churn, and a dunning process</td><td>Nothing &mdash; the sticker is on the car</td></tr>
<tr><td class="b">Cash timing</td><td>Spread thin, forever</td><td>Front-loaded, in one shot</td></tr>
<tr><td class="b">Gross margin</td><td>&gt;96% (the cost plan&rsquo;s own figure)</td><td>56&ndash;87% on goods</td></tr>
<tr><td class="b">What it proves</td><td>Nothing physical</td><td>A QR code on a real windshield</td></tr>
</tbody>
</table>

<div class="callout blue">
<span class="h">The strategic consequence</span>
<p style="margin-bottom:0">A subscription in this market is a promise to charge a customer every month
through infrastructure that does not reliably exist. A sticker order is a product someone already
wants to put on their car, paid for once, by a method that works here. <b>Lead with the physical
product; let the subscription be the renewal, not the entry point.</b> A dealer who buys stickers
has already paid; the dashboard is what keeps them.</p>
</div>

<h2 id="s4">4. The product</h2>
<p>Three physical SKUs, plus the digital-only option that keeps the zero-cost channel alive.</p>

<div class="sk">
<div class="sk-c">
  <div class="nm">A5 &middot; Windshield QR Sticker</div>
  <div class="dim">148 &times; 210 mm &middot; laminated vinyl &middot; die-cut or trimmed</div>
  <div class="pr">QR code, dealer branding, vehicle headline, price. The thing that goes on
  the glass &mdash; and the thing a passer-by can actually scan.</div>
</div>
<div class="sk-c">
  <div class="nm">A4 &middot; Vehicle Spec Card</div>
  <div class="dim">210 &times; 297 mm &middot; laminated vinyl or 300 gsm card</div>
  <div class="pr">The full specification sheet &mdash; all fourteen new fields, photos, QR code.
  This is the reason the spec fields exist, and it is the natural upsell.</div>
</div>
</div>
<div class="sk">
<div class="sk-c">
  <div class="nm">Display Kit</div>
  <div class="dim">One A5 + one A4, matched artwork</div>
  <div class="pr">The default SKU. The windshield sticker brings the scan, the spec card answers
  the question the scan raises. Priced below the sum of the two parts.</div>
</div>
<div class="sk-c">
  <div class="nm">Digital only &middot; QR artwork PNG</div>
  <div class="dim">What you produce today &middot; no fulfilment cost</div>
  <div class="pr">Keeps the free and trial tiers honest, and gives an in-house printer something to
  do. <b>$2.00 per vehicle standalone, free on any subscription.</b></div>
</div>
</div>

<div class="callout">
<span class="h">The A4 spec card is the product that makes your new fields pay</span>
<p style="margin-bottom:0">An A4 card can only be produced if the vehicle&rsquo;s specifications are
complete. That means every spec field you just added becomes <b>raw material for a paid product</b>,
not just a nicer profile page. It gives you a concrete, non-technical reason to push dealers to
fill the form &mdash; and it justifies a materially higher price for the A4 than the A5.</p>
</div>
''')}

{page("Page 3 of 8", "CAR QR SHOWCASE", "The cost model", f'''
<h2 id="s5">5. The cost model</h2>
<p>Per unit, USD, mid scenario. The full build-up &mdash; material, printing, finishing, packaging,
freight, duty and waste &mdash; for both sourcing routes, side by side.</p>

<table class="avoid-break">
<thead><tr><th style="width:34%">Cost line</th>{cost_head_cells()}</tr></thead>
<tbody>{cost_buildup_rows()}</tbody>
</table>

<p class="src"><b>Sources.</b> Factory unit prices: e-print wholesale colour sticker price list
(HK$, converted at 7.8), which include material, full-colour print, kiss-cut and trimming.
Regional print: Premium Prints UAE die-cut A4 vinyl sheet with gloss laminate
(AED 12&ndash;22/sheet) and Branding Blitz UAE vinyl sticker tiers; A5 modelled as a trimmed
half-sheet. Lamination: Wielka Reklama, polymeric laminate &asymp; EUR 8 net/m&sup2; at 1.09
USD/EUR. Freight: 2026 China&rarr;Iraq rate guides (air freight $3&ndash;8/kg, express courier
$5.50&ndash;15/kg, sea LCL $100&ndash;200/CBM). Duty: Iraq&rsquo;s 2026 ASYCUDA tariff,
0.5&ndash;30% by category plus VAT, plus a 3% advance tax deposit now paid before funds leave the
bank. <b>Duty and tax are modelled at 10% and must be confirmed against the actual HS code.</b></p>

<h2 id="s6">6. The route cliff &mdash; the most important number in this document</h2>
<table class="avoid-break">
<thead><tr>
<th rowspan="2">Order qty</th><th colspan="3">A5 Windshield Sticker</th><th colspan="3">A4 Spec Card</th><th rowspan="2">Best route</th>
</tr><tr><th>Regional</th><th>Factory</th><th>Best</th><th>Regional</th><th>Factory</th><th>Best</th></tr></thead>
<tbody>{cliff_rows()}</tbody>
</table>

<div class="callout red">
<span class="h">Two conclusions from the cliff</span>
<ol style="margin-bottom:0">
<li><b>Volume alone is not the lever &mdash; sourcing is.</b> Going from 100 to 1,000 units at a
regional printer moves your A5 cost from $2.00 to $1.53, a 24% saving. Switching the same 250 units
to a factory takes it to $0.61, a 70% saving. <b>Never negotiate the unit price at a regional shop
past 250 units.</b></li>
<li><b>The cliff at 250 is a production batch, not a dealer order.</b> Each sticker carries a
unique QR code, so you cannot print 250 of the same artwork twice &mdash; unless the printer
supports <b>variable data</b>, where one run produces 250 different QR codes on the same dealer
design. Every factory quote in this document assumes that is available.</li>
</ol>
</div>

<div class="callout">
<span class="h">Action: confirm variable-data printing before committing to any price</span>
<p style="margin-bottom:0">Variable-data printing (VDP) is standard for serialised product
labelling and is modelled here at a +10% premium regionally and +15% from the factory.
<b>If your printer cannot do VDP, the 250-unit cliff applies to each dealer individually</b>, and
the Showroom and Dealer bands in section 7 must be re-costed against regional pricing only.
Get this confirmed in week one &mdash; it changes which tiers are viable.</p>
</div>
''')}

{page("Page 4 of 8", "CAR QR SHOWCASE", "The price architecture", f'''
<h2 id="s7">7. The price architecture</h2>
<p>Two independent ladders, deliberately not merged.</p>

<div class="cols2">
<div>
<h3>The physical ladder &mdash; driven by order size</h3>
<p>Discounts come from <b>how many stickers are in one order</b>, not from which plan the dealer
is on. A Starter dealer ordering 250 gets the 250 price. This keeps the physical business
profitable no matter how the subscription is structured, and it gives a sales rep a single number
to quote.</p>
</div>
<div>
<h3>The subscription ladder &mdash; driven by company size</h3>
<p>Platform access, branding, lead alerts, analytics and support, priced on the dealer&rsquo;s
fleet and how much of the product they use. It stays a software price and is never bundled into a
per-sticker price, so neither line is hidden.</p>
</div>
</div>

<table class="avoid-break">
<thead><tr>
<th rowspan="2">Band</th><th rowspan="2">Units per order</th>
<th colspan="3">A5 Sticker</th><th colspan="3">A4 Spec Card</th><th colspan="2">Display Kit</th><th rowspan="2">Disc.</th>
</tr><tr><th>Price</th><th>Cost</th><th>GM</th><th>Price</th><th>Cost</th><th>GM</th><th>Price</th><th>GM</th></tr></thead>
<tbody>{price_rows()}</tbody>
</table>

<p class="src"><b>How the discounts are funded.</b> Look at the cost column as you move down the
ladder: the A5 landed cost falls from $2.31 to $0.61 and the A4 from $4.63 to $1.11. The discount
is <b>paid for by cost deflation, not by margin sacrifice</b> &mdash; gross margin actually rises
from 74% to 87% on A5 as the customer&rsquo;s order grows. That is the difference between a
scalable pricing structure and a race to the bottom.</p>

<h2 id="s8">8. Channel definitions</h2>
<table class="avoid-break">
<thead><tr><th style="width:13%">Band</th><th style="width:13%">Who it is</th><th style="width:38%">What they get</th><th>Commitment</th></tr></thead>
<tbody>
<tr><td class="b">Individual</td><td>Private seller, or a dealer with one car</td>
<td>One sticker or one spec card, posted to them. A hosted landing page for 12 months so the QR
still works &mdash; but no dashboard, no analytics, no lead routing.</td><td>Pay per order, no minimum</td></tr>
<tr><td class="b">Showroom</td><td>Independent dealer, 25&ndash;99 cars</td>
<td>The same product at a volume price, plus the Starter subscription: dashboard, 1,000 scans a
month, basic analytics.</td><td>Pay per order, or a prepaid block</td></tr>
<tr><td class="b">Dealer</td><td>Established dealer, 100&ndash;249 cars</td>
<td>Volume pricing, white-label branding, real-time lead alerts, unlimited scans.</td>
<td>Prepaid sticker block, drawn down monthly</td></tr>
<tr><td class="b">Dealer+</td><td>Multi-branch, 250&ndash;499 cars</td>
<td>The volume price that factory economics unlock, plus multi-branch and priority fulfilment.</td>
<td>Prepaid block of at least 250 units</td></tr>
<tr><td class="b">Partner</td><td>Large group or franchise, 500+ cars</td>
<td>Lowest price, dedicated support, API access, named production slots so a large order never
waits for a batch.</td><td>Annual commitment</td></tr>
</tbody>
</table>

<div class="callout blue">
<span class="h">Why prepaid blocks beat monthly subscriptions here</span>
<p style="margin-bottom:0">A block of 250 A5 stickers at the Dealer+ price costs the dealer $1,188
and costs you about $153 to make and ship. They get a 4&ndash;6 week lead time and a locked price;
you get the cash before you spend it, and a renewal conversation already scheduled. <b>Prepaid
blocks also give you the working capital to buy factory runs in the first place</b> &mdash; which
is how the 6&times; cost gap gets captured instead of paid away.</p>
</div>
''')}

{page("Page 5 of 8", "CAR QR SHOWCASE", "Subscription and economics", f'''
<h2 id="s9">9. The subscription, and the pricing conflict</h2>
<p>Your deck and your admin panel currently disagree. Resolve this before anything is invoiced.</p>

<table class="avoid-break">
<thead><tr><th style="width:18%">Tier</th><th style="width:13%">Deck says</th><th style="width:13%">App says</th><th style="width:18%">Gap per month</th><th>Recommendation</th></tr></thead>
<tbody>
<tr><td class="b">Free</td><td class="num">&mdash;</td><td class="num">$0</td><td class="num">&mdash;</td><td>Keep. Trial tier, digital only, 1 company, 5 vehicles.</td></tr>
<tr><td class="b">Starter</td><td class="num">$29</td><td class="num">$29</td><td class="num">$0</td><td>Keep $29. 1 company, 25 vehicles, 1,000 scans, digital QR.</td></tr>
<tr><td class="b">Professional</td><td class="num">$79</td><td class="num">$99</td><td class="num">$20</td><td>Keep <b>$99</b> in the app and fix the deck. Up to 100 vehicles, white-label, lead alerts, unlimited scans.</td></tr>
<tr><td class="b">Enterprise</td><td class="num">$149</td><td class="num">$299</td><td class="num">$150</td><td>Keep <b>$249</b> &mdash; set one number and use it everywhere. Unlimited vehicles, multi-branch, API, dedicated support.</td></tr>
</tbody>
</table>

<div class="callout red">
<span class="h">Two operational bugs to fix alongside the pricing</span>
<ul style="margin-bottom:0">
<li><b>One source of truth.</b> The plan prices should live in one place in the code and the deck
should be generated from it, or at minimum version-checked against it. At $299 vs $149 you cannot
afford to quote from two documents.</li>
<li><b>MKMA shows "$300/mo" on a Free plan.</b> The admin renders
<code>custom_price ?? PLANS[plan].price</code>, so a custom price on a free-plan account overrides
the plan badge. Either the custom price is meant to be the source of truth &mdash; in which case
the badge is wrong &mdash; or it is a leftover that should be cleared. Right now it displays a
number nobody agreed to.</li>
</ul>
</div>

<p>Because <b>all four live accounts are on the free plan</b>, there is no legacy pricing to
grandfather, no customer to upset, and no migration. This is the cheapest possible moment to
restructure the whole pricing model. It will not get cheaper later.</p>

<h2 id="s10">10. Dealer unit economics</h2>
<p>One dealer, one year, A5 stickers only, at their band&rsquo;s price.</p>
<table class="avoid-break">
<thead><tr><th>Vehicles</th><th>Band</th><th>Price / sticker</th><th>Goods revenue</th>
<th>Goods cost</th><th>Platform</th><th>Total revenue</th><th>Total GM</th></tr></thead>
<tbody>{dealer_rows()}</tbody>
</table>

<h3>What a dealer actually pays per vehicle, per year</h3>
<p>This is the number that decides whether a dealer signs. Subscription amortised over the band&rsquo;s
minimum fleet size, added to the Display Kit.</p>
<table class="avoid-break">
<thead><tr><th>Band</th><th>Display Kit</th><th>Platform / month</th>
<th>Platform per vehicle per year</th><th>All-in per vehicle per year</th></tr></thead>
<tbody>{per_vehicle_rows()}</tbody>
</table>

<div class="callout">
<span class="h">The number to quote in a sales conversation</span>
<p style="margin-bottom:0">A 40-car showroom pays about <b>$40 per car per year</b> for a full
Display Kit plus the dashboard. A dealer who moves one extra car per quarter covers it many times
over &mdash; and your own cost plan already values one qualified lead at $300&ndash;$1,500.
<b>Frame it as a cost of sale, not a cost of software.</b></p>
</div>
''')}

{page("Page 6 of 8", "CAR QR SHOWCASE", "Collection and guardrails", f'''
<h2 id="s11">11. Collecting the money in Iraq</h2>
<p>This is where most import-based SaaS in this market quietly stalls. The physical product solves
most of it, but you still need a way to take money.</p>

<table class="avoid-break">
<thead><tr><th style="width:20%">Method</th><th style="width:14%">Typical cost</th><th style="width:20%">Best for</th><th>Notes</th></tr></thead>
<tbody>
<tr><td class="b">Bank transfer (IBFT) / FIB</td><td class="num">1&ndash;5%</td><td>Dealers, larger orders</td>
<td>Most reliable for business accounts. FIB is regulated by the Central Bank of Iraq.</td></tr>
<tr><td class="b">AsiaHawala</td><td class="num">low</td><td>Individual sellers</td>
<td>Widespread across all Iraqi provinces &mdash; the natural choice for a private seller.</td></tr>
<tr><td class="b">ZainCash</td><td class="num">1% + $0.15</td><td>Individual sellers</td>
<td>Iraq&rsquo;s most used mobile wallet. Only works for Zain subscribers, which is most of the market.</td></tr>
<tr><td class="b">QiCard</td><td class="num">1&ndash;7%</td><td>Business accounts</td>
<td>Government and salary payment network, now expanding into commerce.</td></tr>
<tr><td class="b">Visa / Mastercard</td><td class="num">2&ndash;3%</td><td>International buyers</td>
<td>Card penetration in Iraq is low. Mastercard entered a strategic partnership with the Central
Bank of Iraq in 2026 &mdash; this is improving, and international buyers are the natural fit here.</td></tr>
<tr><td class="b">Cash on delivery</td><td class="num">highest</td><td>Individual, first orders</td>
<td>The local default. Raises working capital and failure risk &mdash; price it in, or restrict it to
low-value orders.</td></tr>
</tbody>
</table>

<p><b>Model 3% blended payment cost</b> and add a 2% FX buffer; the margin tables in section 7 are
already net of both. For cash on delivery, add the cost of handling failed delivery &mdash; a
returned A4 spec card is a physical object you cannot re-charge.</p>

<h2 id="s12">12. Guardrails</h2>
<div class="cols2">
<div>
<h3>Price integrity</h3>
<ul>
<li><b>One price per band, published.</b> The same band must cost the same whether it comes from
the deck, the site or a sales rep. Discounts are earned by volume, not by negotiation.</li>
<li><b>Never mix bands in one order.</b> A 300-unit order is 300 units at the Dealer+ price. Do not
price it as 100 at Dealer and 200 at Partner.</li>
<li><b>The digital-only price is the anchor.</b> $2.00 standalone keeps the physical price honest
&mdash; people can compare, and the gap becomes the value of the finished product.</li>
</ul>
</div>
<div>
<h3>Channel conflict</h3>
<ul>
<li><b>Customers buy, dealers do not resell.</b> Put the dealer&rsquo;s name and logo on the
sticker &mdash; that is what stops a dealer selling your product to another dealer. The Individual
band carries no dealer branding and no dashboard, so it is not a resale route.</li>
<li><b>Protect the dealer&rsquo;s price.</b> If a dealer sees an individual buying for less than
the dealer pays, the fix is the brand, not the price.</li>
<li><b>Artwork and QR belong to the customer.</b> The customer owns the design; you own the QR
resolution and the landing page.</li>
</ul>
</div>
</div>

<div class="callout blue">
<span class="h">The pricing rule that protects the whole structure</span>
<p style="margin-bottom:0"><b>Physical price follows order size. Subscription follows company
size. The two ladders never reference each other.</b> As soon as you let a dealer&rsquo;s plan
discount their sticker price, or let a large one-off order buy subscription tiers, you have two
coupons where you designed one &mdash; and one of them will be used against the other.</p>
</div>
''')}

{page("Page 7 of 8", "CAR QR SHOWCASE", "Risks and mitigations", f'''<h2 id="s13">13. Risks and mitigations</h2>
<table class="avoid-break" id="risks-table">
<thead><tr><th style="width:22%">Risk</th><th style="width:11%">Severity</th><th style="width:35%">Why it matters</th><th>Mitigation</th></tr></thead>
<tbody>
<tr><td class="b">No variable-data printing</td><td class="tag" style="color:#C62828">HIGH</td>
<td>Each sticker has a unique QR. Without VDP every dealer needs 250+ units before a factory run
is economic &mdash; which excludes most of your market.</td>
<td><b>Confirm in week one.</b> If unavailable, price the Showroom and Dealer bands on regional
costs only and reconsider the volume ladder.</td></tr>
<tr><td class="b">Import licence for advertising stickers</td><td class="tag" style="color:#C62828">HIGH</td>
<td>Iraq requires an import licence from the Ministry of Financial and Commercial Control for
advertising stickers. Without it the shipment is held and storage charges accrue from day four.</td>
<td>Apply for the licence before the first factory run. Until then, print regionally.</td></tr>
<tr><td class="b">Duty paid before you can ship</td><td class="tag" style="color:#E65100">HIGH</td>
<td>Since October 2025 Iraq requires estimated duties and tax deposits to be paid <b>before</b>
funds leave the bank. That is cash out of your pocket before you have sold anything.</td>
<td>Prepaid blocks from customers fund it. Model 10% and confirm the HS code; treat the first
factory run as working capital, not profit.</td></tr>
<tr><td class="b">Cash locked in a factory run</td><td class="tag" style="color:#E65100">MEDIUM</td>
<td>250 stickers that no one ordered is $153 of landed cost and no revenue.</td>
<td>Only print against received, prepaid orders. Aggregate across dealers to clear the MOQ.
Never hold generic stock &mdash; every sticker is unique.</td></tr>
<tr><td class="b">Freight and lead time</td><td class="tag" style="color:#E65100">MEDIUM</td>
<td>Air freight to Iraq is $3&ndash;8/kg and express $5.50&ndash;15/kg; a factory run is 2&ndash;6
weeks door to door, longer by sea.</td>
<td>Publish a lead time and batch cadence. Urgent local orders use regional print &mdash; that is
what it is for.</td></tr>
<tr><td class="b">Price anchored too low</td><td class="tag" style="color:#E65100">MEDIUM</td>
<td>Once dealers know the A5 is $4 at 500 units, $9 for a single unit feels arbitrary unless you
explain the difference: one is a factory batch, the other is a rush single.</td>
<td>Publish the volume breaks openly and tie the price to the service level &mdash; batch lead time
versus regional print in 48 hours.</td></tr>
<tr><td class="b">Currency and fee erosion</td><td class="tag">MEDIUM</td>
<td>IQD movement, gateway fees and COD handling all eat the same margin.</td>
<td>Price in USD, take a 2% FX buffer, and restrict COD to orders under $50.</td></tr>
<tr><td class="b">Someone buys 249 units to hit 250</td><td class="tag">LOW</td>
<td>The cliff invites gaming.</td>
<td>Publish the bands as a price list. The discount at 250 is already lower than the margin
difference, so there is nothing to arbitrage.</td></tr>
</tbody>
</table>
<h2 id="s14">14. Rollout plan</h2>
<table class="avoid-break" id="rollout-table">
<thead><tr><th style="width:13%">When</th><th style="width:30%">Do this</th><th>Why it is first</th></tr></thead>
<tbody>
<tr><td class="b">Week 1</td><td>Three written quotes: one regional printer for A5 and A4 trimmed and
laminated, one factory for the same with VDP, one freight forwarder for DDP to Baghdad and
Erbil.</td><td>Everything in section 5 rests on these three numbers. Replace the
mid-scenario assumptions with real quotes before you publish a price.</td></tr>
<tr><td class="b">Week 2</td><td>Resolve the deck/app conflict. Pick one price list, update the
app, update the deck, and clear MKMA&rsquo;s stray custom price.</td><td>You cannot sell from two
documents.</td></tr>
<tr><td class="b">Week 3</td><td>Order 25 A5 and 5 A4 as a paid pilot. Print them, laminate them,
fit one to a real car, and photograph the result.</td><td>Proof beats a price list. One real sticker on a real windshield is the
sales pitch.</td></tr>
<tr><td class="b">Week 4</td><td>Start the import licence application and open a prepaid-block
offer to the three dealers who already have vehicles.</td><td>Prepaid blocks are the working
capital for the first factory run, and they commit customers before the licence clears.</td></tr>
<tr><td class="b">Month 2&ndash;3</td><td>Run the first factory batch of 250 once 250 units are prepaid across
dealers. Publish the volume breaks and set each dealer&rsquo;s subscription to match their
physical band.</td><td>This is where the 6&times; cost gap starts paying you.</td></tr>
</tbody>
</table>
''')}



{page("Page 8 of 8", "CAR QR SHOWCASE", "Decisions, rollout and sources", f'''<h2 id="s15">15. Open decisions &mdash; what I need from you</h2>
<table class="avoid-break">
<thead><tr><th style="width:5%">#</th><th style="width:47%">Decision</th><th>Default if you say nothing</th></tr></thead>
<tbody>
<tr><td class="b">1</td><td><b>Are you willing to produce and ship physical stickers at all?</b>
Everything else in this document assumes yes. If the answer is no, the current subscription model
stands and this becomes a packaging job, not a pricing one.</td><td>Assumed yes</td></tr>
<tr><td class="b">2</td><td><b>Can your printer do variable data?</b> If not, the volume ladder
changes shape.</td><td>Assumed yes, +15% premium</td></tr>
<tr><td class="b">3</td><td><b>Which is the single source of truth for plan prices &mdash; the app
or the deck?</b></td><td>The app, updated to $29 / $99 / $249</td></tr>
<tr><td class="b">4</td><td><b>Is the A4 spec card a premium item or a standard one?</b> At $15
for a single sheet it is a serious purchase; at $11.50 it is an obvious add-on.</td>
<td>Premium &mdash; $15 standalone</td></tr>
<tr><td class="b">5</td><td><b>Do you want COD at all in the launch window?</b> It is the local
default but the worst margin and the worst failure rate.</td><td>Yes, under $50 only</td></tr>
<tr><td class="b">6</td><td><b>What is the actual duty rate on your HS code?</b> Modelled at 10%
here; the real band is 0.5&ndash;30%.</td><td>10% buffer until confirmed</td></tr>
</tbody>
</table>

<h2 id="s16">16. Sources</h2>
<div class="cols2">
<div>
<ul class="src">
<li><b>Factory sticker pricing</b> &mdash; e-print colour sticker and label price list (A6/A5/A4/A3,
100&ndash;100,000 pcs, incl. kiss-cut and trimming), HK$ converted at 7.8.
<a href="https://www.e-print.com.hk/en_products_sticker_label_printing">e-print.com.hk</a></li>
<li><b>Printed vinyl &amp; lamination rates</b> &mdash; Wielka Reklama: white monomeric EUR 6&ndash;12/m&sup2;,
polymeric EUR 9&ndash;16/m&sup2;, cast EUR 19&ndash;29/m&sup2;, laminate EUR 5&ndash;8/m&sup2;,
cutting EUR 1.20&ndash;2 per linear metre.
<a href="https://www.wielkareklama.eu/en/products/die-cut-stickers">wielkareklama.eu</a></li>
<li><b>Regional print prices</b> &mdash; Premium Prints UAE (die-cut A4 vinyl + gloss lam,
AED 12&ndash;22/sheet); Branding Blitz UAE (vinyl tiers AED 0.66/0.50/0.37/0.25); printonline.ae
(large-format vinyl AED 110/m&sup2;); MaxPrint UAE (bulk from 10 fils).</li>
<li><b>Raw material</b> &mdash; self-adhesive PP/BOPP and inkjet vinyl rolls US$0.20&ndash;0.88/m&sup2;
laminating film US$0.25&ndash;0.65/m&sup2;.</li>
</ul>
</div>
<div>
<ul class="src">
<li><b>Freight to Iraq, 2026</b> &mdash; air freight $3&ndash;8/kg; express courier $5.50&ndash;15/kg;
air DDP $4&ndash;12/kg; sea LCL $0.30&ndash;0.95/kg equivalent and $100&ndash;200/CBM; 20ft
container $1,500&ndash;3,300. Volumetric weight = cm/6000.
<a href="https://www.hanooot.com/en/blog/sea-freight-vs-air-freight-to-iraq-2026">hanooot.com</a>,
<a href="https://allbestshipping.com/blogs/how-much-does-it-cost-to-ship-from-china-to-iraq/">allbestshipping.com</a></li>
<li><b>Iraq customs 2026</b> &mdash; ASYCUDA live from 1 Jan 2026; Cabinet Decision 957/2025;
tariff 0.5&ndash;30% by category, VAT ~5%, advance duty deposit before funds transfer.
<a href="https://www.iraq-businessnews.com/wp-content/uploads/2026/03/Iraq_2026_Custom-2.pdf">iraq-businessnews.com</a>,
<a href="https://shafaq.com/en/Economy/Iraq-s-new-customs-system-puts-import-fees-upfront">shafaq.com</a></li>
<li><b>Advertising sticker import licence</b> &mdash; Ministry of Financial and Commercial Control
requirement; storage charges accrue from day four.
<a href="https://www.verykship.com/ups-import/IQ/PorhibitedAndRestrictedItems">verykship.com</a></li>
<li><b>Payments in Iraq</b> &mdash; FIB 1&ndash;5%, ZainCash 1% + $0.15, AsiaPay 1&ndash;7%, QiCard;
low card penetration; Mastercard&ndash;Central Bank of Iraq MoU 2026.
<a href="https://www.osoustech.com/ecommerce-payment-gateways-iraq/">osoustech.com</a>,
<a href="https://cosmopolitantdaily.com/blogs/top-payment-gateways-in-iraq/">cosmopolitantdaily.com</a></li>
</ul>
</div>
</div>

<div class="callout">
<span class="h">Figures labelled as assumptions</span>
<p style="margin-bottom:0">Duty and tax buffer (10%), wastage (3%), payment fee (3%), FX buffer (2%),
variable-data premium (+10% regional / +15% factory), print-job setup ($45) and the regional
trimmed-sheet prices are modelling assumptions, not quotes. They are isolated in
<code>pricing_model.py</code> and in the "Assumptions" sheet of the spreadsheet model, so replacing
any of them with a real number re-costs the whole price list immediately.</p>
</div>
''')}

</body>
</html>
"""

if __name__ == "__main__":
    print(HTML)
