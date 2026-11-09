#!/usr/bin/env python3
"""
Generates the Car QR Showcase Vehicle Inquiry Sheet as HTML, ready for
HTML -> PDF rendering.

Field inventory is taken verbatim from the admin Edit Car form
(car-qr-showcase/src/App.tsx, `interface CarData` + the Edit Car modal),
so every field on the sheet exists in the form and every dropdown offers
only values the form accepts.

Usage:  python3 build_inquiry_sheet.py > inquiry_sheet.html
"""
import html

# ---------------------------------------------------------------------------
# Option lists - mirrored from the Edit Car form dropdowns in src/App.tsx
# ---------------------------------------------------------------------------
COLOR = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green",
         "Yellow", "Orange", "Brown", "Beige", "Gold", "Other"]
FUEL = ["Gasoline", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid",
        "CNG", "LPG", "Other"]
TRANS = ["Automatic", "Manual", "Semi-Automatic", "CVT", "Other"]
BODY_TYPES = ["Sedan", "SUV", "Crossover", "Coupe", "Hatchback", "Wagon",
              "Station Wagon", "Convertible", "Pickup Truck", "Van",
              "Minivan", "Truck"]
CAR_CONDITIONS = ["New", "Used", "Certified Pre-Owned", "Demonstrator",
                  "Ex-Fleet", "Rebuilt", "Salvage"]
WHEEL_DRIVES = ["FWD", "RWD", "AWD", "4WD"]
TURBO = ["Yes", "No", "Twin-Turbo", "Supercharged"]
CYLINDERS = ["3", "4", "5", "6", "8", "10", "12"]
SEAT_MATERIALS = ["Leather", "Nappa Leather", "Alcantara", "Fabric", "Suede",
                  "Vinyl", "Leather & Fabric", "Other"]
WARRANTY = ["Factory Warranty", "Dealer Warranty", "Under Warranty",
            "Expired", "Not Warrantied", "Extended Warranty"]
CAMERAS = ["Rear Camera", "Front Camera", "360° Camera", "Blind Spot Camera",
           "Dash Cam", "Parking Sensors Front", "Parking Sensors Rear",
           "Underbody Camera", "Surround View Monitor"]
ENGINE_CAPACITIES = ["1.0L", "1.3L", "1.5L", "1.6L", "1.8L", "2.0L", "2.2L",
                     "2.4L", "2.5L", "2.7L", "3.0L", "3.5L", "3.6L", "4.0L",
                     "4.2L", "4.7L", "5.0L", "5.7L", "6.0L", "6.2L", "6.5L",
                     "8.4L", "Electric"]
WHEEL_SIZES = ["14\"", "15\"", "16\"", "17\"", "18\"", "19\"", "20\"",
               "21\"", "22\"", "23\""]
TRIM_LEVELS = ["Base", "Standard", "Sport", "Sport Plus", "Touring",
               "Premium", "Premium Plus", "Luxury", "Limited", "Ultimate",
               "Executive"]
QR_TEMPLATE = [("standard", "Standard"), ("luxury", "Luxury"), ("classic", "Classic"),
               ("bold", "Bold"), ("minimalist", "Minimalist"), ("sports", "Sports"),
               ("eco", "Eco"), ("ev", "EV"), ("hybrid", "Hybrid"),
               ("plugin_hybrid", "Plug-in Hybrid")]
QR_SHAPE = ["square", "rounded_xs", "rounded_sm", "rounded_md", "rounded_lg",
            "rounded_xl", "pill", "circle", "circle_md", "octagon", "hexagon",
            "diamond"]
LOGO_POS = [("none", "No Logo"), ("top", "Top of QR"),
            ("center", "Center of QR (overlay)"), ("bottom", "Bottom of QR")]
CO_NAME_POS = [("none", "Hide"), ("top", "Above QR Code"), ("bottom", "Below QR Code")]
REGULATORY = [
    ("CCR No.", "Registration / CCR number"),
    ("Approved On", "Approval date"),
    ("Produced In & After", "e.g. 2024"),
    ("Country of Production", "e.g. Japan"),
    ("Pollutant Limits", "e.g. Euro 6"),
    ("VIN", "Vehicle Identification Number"),
    ("Label No.", "Label number"),
    ("Manufacturer", "Manufacturer name"),
    ("Motor Vehicle Class", "e.g. Class 1"),
    ("FE (CAFE) Combined", "e.g. 45 MPG"),
]
FEATURES = [
    "Air conditioning", "Climate control", "Sunroof", "Leather seats",
    "Heated seats", "Reverse camera", "Parking sensors", "Navigation",
    "Bluetooth", "Apple CarPlay", "Android Auto", "Multimedia screen",
    "LED headlights", "Fog lights", "Alloy wheels", "Power windows",
    "Cruise control", "Adaptive cruise", "Lane keep assist", "Blind spot alert",
    "Keyless entry", "Push start", "Alarm", "Service history",
]
PHOTO_SHOTS = ["Front", "Rear", "Left side", "Right side",
               "Interior", "Dashboard", "Engine bay", "Wheels"]


def esc(s):
    return html.escape(str(s), quote=True)


def field(label, hint="", span=1, required=False, cls=""):
    lab = f'<span class="lab">{esc(label)}'
    if required:
        lab += ' <b class="req">*</b>'
    lab += "</span>"
    if hint:
        lab += f'<span class="hint">{esc(hint)}</span>'
    return (f'<div class="fld {cls}" style="grid-column: span {span}">'
            f'{lab}<div class="rule"></div></div>')


def checks(label, options, cols=5, hint="", cls=""):
    boxes = "".join(f'<span class="ck"><i></i>{esc(o)}</span>' for o in options)
    h = f'<span class="hint">{esc(hint)}</span>' if hint else ""
    return (f'<div class="fld wide {cls}"><span class="lab">{esc(label)}</span>{h}'
            f'<div class="checks c{cols}">{boxes}</div></div>')


def box(label, hint, height=24):
    return (f'<div class="fld wide"><span class="lab">{esc(label)}</span>'
            f'<span class="hint">{esc(hint)}</span>'
            f'<div class="writebox" style="height:{height}mm"></div></div>')


def section(sid, letter, title, note="", body=""):
    n = f'<span class="sec-note">{esc(note)}</span>' if note else ""
    return (f'<section class="sec" id="{sid}">'
            f'<div class="sec-h"><span class="sec-letter">{esc(letter)}</span>'
            f'<h3>{esc(title)}</h3>{n}</div>{body}</section>')


def toc_rows(rows):
    return "".join(
        f'<a class="toc-row" href="#{sid}">{esc(label)} '
        f'<span class="pg">{pg}</span></a>' for sid, label, pg in rows)


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------
INDEX = [
    ("sec-a", "A. Vehicle identity", "1"),
    ("sec-b", "B. Specifications and pricing", "1"),
    ("sec-c", "C. Description and features", "1"),
    ("sec-d", "D. Contact", "1"),
    ("sec-e", "E. Regulatory information", "2"),
    ("sec-f", "F. Photos and media", "2"),
    ("sec-g", "G. Interior and warranty", "2"),
    ("sec-h", "H. Sign-off", "2"),
    ("sec-i", "I. How to use this sheet", "3"),
    ("sec-j", "J. Field mapping to the Edit Car form", "3"),
    ("sec-k", "K. Traps to avoid", "3"),
    ("sec-l", "L. Valid values reference", "4"),
]

sec_a = section(
    "sec-a", "A", "Vehicle identity",
    "Required fields are marked *",
    '<div class="grid g3">'
    + field("Dealer / company", "exact registered name", span=3)
    + field("Make", "choose from list", required=True)
    + field("Model", "depends on make", required=True)
    + field("Year", "e.g. 2024")
    + "</div>"
    '<div class="grid g2">'
    + field("VIN / chassis no.", "17 characters")
    + field("Country of origin", "e.g. Japan")
    + "</div>"
    + checks("Body type (tick one)", BODY_TYPES, cols=6, cls="tight")
    + '<div class="grid g2">'
    + field("Car condition", "New / Used / Certified")
    + field("Trim level", "e.g. Sport")
    + "</div>")

sec_b = section(
    "sec-b", "B", "Specifications and pricing",
    "The buyer sees all of this",
    '<div class="grid g3">'
    + field("Price", "e.g. $25,000")
    + field("Mileage", "e.g. 50,000 KM")
    + field("Location", "city, showroom")
    + "</div>"
    + checks("Colour (tick one)", COLOR, cols=7, cls="tight")
    + checks("Fuel type (tick one)", FUEL, cols=4, cls="tight")
    + checks("Transmission (tick one)", TRANS, cols=5, cls="tight")
    + '<div class="grid g3">'
    + field("Engine capacity", "e.g. 2.0L")
    + field("Horsepower (HP)", "e.g. 203")
    + field("Number of cylinders", "e.g. 4")
    + "</div>"
    + '<div class="grid g2">'
    + field("Wheel drive system", "FWD / RWD / AWD / 4WD")
    + field("Turbo", "Yes / No")
    + "</div>"
    + '<p class="note">Number of owners has no dedicated field in the Edit Car form. '
      'If you fill it in here, type it into the Description box (section C) so the '
      'buyer still sees it.</p>')

sec_c = section(
    "sec-c", "C", "Description and features",
    "This is the text the buyer reads on the QR page",
    '<div class="fld wide"><span class="lab">Standard features (tick what applies)</span>'
    f'<div class="checks c4 feat">{("".join(f"<span class=ck><i></i>{esc(x)}</span>" for x in FEATURES))}</div></div>'
    + box("Description",
          "Condition - engine - interior - safety - exterior - service history - reason for sale. "
          "Write like a salesperson, not a mechanic.", height=24)
    + '<p class="note warn"><b>Do not use commas</b> if you plan to add this vehicle by CSV bulk '
      'import - the importer splits rows on commas and shifts the columns. Use " - " or " ; " '
      'instead. Example: "Excellent condition - sunroof - leather seats - reverse camera - '
      '1 owner - full service history."</p>')

sec_d = section(
    "sec-d", "D", "Contact",
    "How the buyer reaches the showroom",
    '<div class="grid g4">'
    + field("Phone", "e.g. 0770 123 4567")
    + field("WhatsApp", "e.g. 009647701234567")
    + field("Email", "e.g. sales@showroom.com")
    + field("Video link", "optional")
    + "</div>"
    + '<p class="note">The form automatically strips a leading <b>00</b> from the WhatsApp '
      'number so the wa.me link works. Enter it in international format and let the form '
      'handle the rest.</p>')

photo_boxes = "".join(f'<span class="ck"><i></i>{i}</span>' for i in range(1, 11))
shot_boxes = "".join(f'<span class="ck"><i></i>{esc(s)}</span>' for s in PHOTO_SHOTS)
sec_f = section(
    "sec-f", "F", "Photos and media",
    "Up to 10 photos, auto-compressed to 100 KB each",
    '<div class="fld wide"><span class="lab">Photos supplied (tick how many)</span>'
    f'<div class="checks c10">{photo_boxes}</div></div>'
    + '<div class="fld wide"><span class="lab">Shots to capture (tick as done)</span>'
    f'<div class="checks c4 feat">{shot_boxes}</div></div>'
    + '<p class="note"><b>Six good photos outperform ten weak ones.</b> Front, rear, both sides, '
      'interior and dashboard is the practical minimum for a dealer listing.</p>')

camera_boxes = "".join(f'<span class="ck"><i></i>{esc(c)}</span>' for c in CAMERAS)
sec_g = section(
    "sec-g", "G", "Interior and warranty",
    "What the buyer sits in, and what is covered",
    '<div class="grid g3">'
    + field("Number of seats", "e.g. 5")
    + field("Seat material", "Leather / Fabric / ...")
    + field("Wheel size", 'e.g. 18"')
    + "</div>"
    + '<div class="grid g2">'
    + field("Warranty status", "Factory / Dealer / Expired")
    + field("Warranty details", "e.g. 2 years / 40,000 km")
    + "</div>"
    + '<div class="fld wide"><span class="lab">Camera features (tick all that apply)</span>'
    f'<div class="checks c3 feat">{camera_boxes}</div></div>')

reg_fields = "".join(field(lbl, hint) for lbl, hint in REGULATORY)
sec_e = section(
    "sec-e", "E", "Regulatory information",
    "Optional - leave blank if the documents are not to hand",
    f'<div class="grid g5">{reg_fields}</div>')

sec_h = section(
    "sec-h", "H", "Sign-off",
    "Confirms the details above are accurate",
    '<div class="grid g4">'
    + field("Completed by (name)")
    + field("Role")
    + field("Date")
    + field("Dealer reference / stock no.")
    + "</div>"
    + '<div class="sigrow">'
      '<div class="sig"><span class="lab">Dealer signature</span><div class="rule"></div></div>'
      '<div class="sig"><span class="lab">Car QR Showcase use only - vehicle ID</span>'
      '<div class="rule"></div></div>'
      "</div>")

# ---------------------------------------------------------------------------
# Page 3 - operator reference
# ---------------------------------------------------------------------------
MAPPING = [
    ("A", "Dealer / company", "Company", "Select the dealer account the vehicle belongs to."),
    ("A", "Make *", "Make *", "Dropdown, or '+ Other (Enter Manually)' for an unlisted make."),
    ("A", "Model *", "Model *", "List depends on Make. Changing Make clears Model - set Make first."),
    ("A", "Year", "Year", "Numeric."),
    ("A", "VIN / chassis no.", "VIN (regulatory)", "The VIN input lives in the regulatory block."),
    ("A", "Body type", "Body Type", "Dropdown."),
    ("A", "Car condition", "Car Condition", "Dropdown. New / Used / Certified Pre-Owned / ..."),
    ("A", "Trim level", "Trim Level", "Free text with suggestions."),
    ("B", "Price", "Price", "Free text. Keep the currency symbol."),
    ("B", "Mileage", "Mileage", "Free text. Keep the unit (KM or miles)."),
    ("B", "Location", "Location", "Shown on the customer page."),
    ("B", "Colour", "Color", "Dropdown - tick one on the sheet."),
    ("B", "Fuel type", "Fuel Type", "Dropdown."),
    ("B", "Transmission", "Transmission", "Dropdown."),
    ("B", "Engine capacity", "Engine Capacity", "Free text with suggestions (e.g. 2.0L)."),
    ("B", "Horsepower (HP)", "Horsepower (HP)", "Numeric."),
    ("B", "Number of cylinders", "Number of Cylinders", "Dropdown."),
    ("B", "Wheel drive system", "Wheel Drive System", "Dropdown: FWD / RWD / AWD / 4WD."),
    ("B", "Turbo", "Turbo", "Dropdown: Yes / No / Twin-Turbo / Supercharged."),
    ("B", "Number of owners", "Description", "No dedicated field - type it into Description."),
    ("C", "Standard features + description", "Description", "The main body of text the buyer reads."),
    ("D", "Phone / WhatsApp / Email", "Phone, WhatsApp, Email",
     "WhatsApp strips a leading 00 automatically."),
    ("D", "Video link", "Video Link", "URL."),
    ("E", "Photos supplied", "Car Photos (up to 10)", "Max 10. Auto-compressed to 100 KB."),
    ("F", "Number of seats", "Number of Seats", "Numeric."),
    ("F", "Seat material", "Seat Material", "Dropdown."),
    ("F", "Wheel size", "Wheel Size", "Free text with suggestions."),
    ("F", "Warranty status / details", "Warranty Status / Details", "Dropdown + free text."),
    ("F", "Camera features", "Camera Features", "Tick all that apply."),
    ("G", "Regulatory block (10 fields)", "Vehicle Regulatory Information", "All map 1:1."),
    ("-", "Scan start / end date", "QR Scan Timeframe",
     "Optional. Blank means the QR is always live."),
    ("-", "QR template / frame / shape / logo / name position", "QR print settings",
     "Operator picks. Defaults: standard, square, no logo, company name on top."),
]


def mapping_table():
    rows = ""
    for sec, sheet_f, form_f, note in MAPPING:
        rows += (f'<tr><td class="c-sec">{esc(sec)}</td><td><b>{esc(sheet_f)}</b></td>'
                 f'<td class="c-form">{esc(form_f)}</td><td class="c-note">{esc(note)}</td></tr>')
    return ('<table class="map"><thead><tr><th>Sec</th><th>Field on this sheet</th>'
            '<th>Edit Car form field</th><th>Notes</th></tr></thead>'
            f'<tbody>{rows}</tbody></table>')


TRAPS = [
    ("Make and Model are the only hard blocks",
     "The form refuses to save without both. Everything else can be empty and added later."),
    ("Set Make before Model",
     "Changing the Make clears the Model. Enter them in the wrong order and you lose the model."),
    ("There is no separate features field",
     "The customer page renders Description, fuel type, colour, mileage, price, photos, the "
     "specifications and the contact details. Features written anywhere else are invisible - "
     "put them in Description (section C)."),
    ("Number of owners is the only leftover in Description",
     "Engine, horsepower and condition now have their own fields. Owners does not - put it "
     "in Description."),
    ("Do not use commas in Description or Location",
     "The CSV bulk importer splits rows on commas, so one comma shifts every column after it. "
     "Use ' - ' or ' ; '. The Edit Car form is not affected."),
    ("One company per bulk import",
     "The importer assigns every row to the company chosen in step 2. Split the file if the "
     "vehicles belong to different dealers."),
    ("WhatsApp formatting",
     "The form strips a leading 00 and a single leading 0 on long numbers. Enter 009647701234567 "
     "and it is stored correctly."),
    ("Photos are the product",
     "A vehicle with no photos still scans, but it will not sell. Six good photos is the "
     "practical minimum for a dealer listing."),
]
trap_html = '<div class="traps">' + "".join(
    f'<div class="trap"><div class="trap-h">{esc(h)}</div><div class="trap-b">{esc(b)}</div></div>'
    for h, b in TRAPS) + '</div>'


def pills(items, mono=False):
    cls = "pill mono" if mono else "pill"
    return "".join(f'<span class="{cls}">{esc(x)}</span>' for x in items)


vr_blocks = [
    ("Colour", pills(COLOR)),
    ("Fuel type", pills(FUEL)),
    ("Transmission", pills(TRANS)),
    ("Body type", pills(BODY_TYPES)),
    ("Car condition", pills(CAR_CONDITIONS)),
    ("Wheel drive", pills(WHEEL_DRIVES)),
    ("Turbo", pills(TURBO)),
    ("Cylinders", pills(CYLINDERS)),
    ("Seat material", pills(SEAT_MATERIALS)),
    ("Warranty status", pills(WARRANTY)),
    ("Camera features", pills(CAMERAS)),
    ("QR template", pills([n for _k, n in QR_TEMPLATE])),
    ("QR shape", pills(QR_SHAPE, mono=True)),
    ("Logo position", pills([n for _k, n in LOGO_POS])),
    ("Company name position", pills([n for _k, n in CO_NAME_POS])),
    ("Engine capacity", pills(ENGINE_CAPACITIES)),
    ("Wheel size", pills(WHEEL_SIZES)),
    ("Trim level", pills(TRIM_LEVELS)),
]
vr_html = "".join(
    f'<div class="vr-b"><div class="vr-h">{esc(h)}</div><div class="pills">{v}</div></div>'
    for h, v in vr_blocks)

sec_i = section(
    "sec-i", "I", "How to use this sheet",
    "The operator's side",
    '<ol class="steps">'
    '<li><b>Collect.</b> Hand this sheet to the dealer - or fill it in with them - for every '
    'vehicle that is getting a QR code. One sheet per vehicle.</li>'
    '<li><b>Check.</b> Make and Model are filled in, the Description box actually lists the '
    'features, and photos are supplied.</li>'
    '<li><b>Enter.</b> Admin panel - Cars - Add Car - paste each value into the matching field '
    'in the Edit Car form. Section J is the field-by-field map.</li>'
    '<li><b>Print the QR.</b> In the same form pick the QR template, frame and shape, then print '
    'the sticker and fix it to the windshield.</li>'
    '<li><b>Batch alternative.</b> Fill the Intake Ledger spreadsheet instead, then use '
    'Cars - Bulk Import and upload it as a CSV. One file per dealer.</li>'
    '</ol>')

sec_j = section("sec-j", "J", "Field mapping to the Edit Car form",
                 "Every field on this sheet, and where it goes",
                 mapping_table())

sec_l = section(
    "sec-l", "L", "Valid values reference",
    "Only these values are accepted by the form dropdowns",
    f'<div class="vr">{vr_html}</div>'
    '<p class="note">Makes: 19 fixed options (Toyota, Honda, Ford, Chevrolet, BMW, Mercedes-Benz, '
    'Audi, Nissan, Hyundai, Kia, Volkswagen, Tesla, Porsche, Lexus, Mazda, Subaru, Jeep, Land Rover, '
    'Volvo) plus manual entry for anything else. Models are per-make - full list in the Intake '
    'Ledger spreadsheet, sheet "Valid Values".</p>')

sec_k = section("sec-k", "K", "Traps to avoid",
                 "Check these before you save",
                 trap_html)

# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------
MASTHEAD_SHEET = """<div class="masthead">
    <div>
      <h1>Vehicle <span>Inquiry Sheet</span></h1>
      <div class="sub">Car QR Showcase &mdash; details for the QR vehicle profile and dealer dashboard</div>
    </div>
    <div class="meta">
      <b>DEALER</b>
      <div style="margin-top:1mm">Sheet ref: ________________</div>
      <div>Date: ____ / ____ / ________</div>
    </div>
  </div>"""

MASTHEAD_REF = """<div class="masthead">
    <div>
      <h1>Operator <span>Reference</span></h1>
      <div class="sub">How to move a completed sheet into the Edit Car form without losing anything</div>
    </div>
    <div class="meta">
      <b>FOR THE OPERATOR</b>
      <div style="margin-top:1mm">Not for the dealer</div>
      <div>Matches the live admin form</div>
    </div>
  </div>"""


def nav(label):
    return (f'<nav class="toc" aria-label="Sheet index">'
            f'<div class="toc-h">{esc(label)}</div>'
            f'<div class="toc-grid">{toc_rows(INDEX)}</div></nav>')


HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Car QR Showcase - Vehicle Inquiry Sheet</title>
<style>
@page {{ size: A4 portrait; margin: 12mm; }}
* {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html, body {{ margin: 0; padding: 0; }}
body {{
  font-family: "Trebuchet MS", "Calibri", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 9pt; line-height: 1.4; color: #000814;
  -webkit-font-smoothing: antialiased;
}}
.page {{ position: relative; box-sizing: border-box; min-height: 273mm;
  padding-top: 7mm; padding-bottom: 6mm; }}
.page + .page {{ break-before: page; }}

.run-head {{
  position: absolute; top: 0; left: 0; right: 0; height: 7mm;
  border-bottom: 0.6pt solid #9FB3C8; font-size: 7.4pt; color: #1F4E85; line-height: 7mm;
}}
.run-head .l {{ float: left; font-weight: bold; letter-spacing: .3pt; }}
.run-head .r {{ float: right; }}
.run-foot {{
  position: absolute; bottom: 0; left: 0; right: 0; height: 7mm;
  border-top: 0.6pt solid #9FB3C8; font-size: 7pt; color: #4E6E8E; line-height: 7mm;
}}
.run-foot .l {{ float: left; }}
.run-foot .r {{ float: right; }}

.masthead {{
  background: #001D3D; color: #fff; padding: 2.2mm 4.2mm; border-left: 3mm solid #FFC300;
  display: flex; align-items: flex-end; justify-content: space-between;
}}
.masthead h1 {{ margin: 0; font-size: 12.8pt; letter-spacing: .2pt; line-height: 1.12; }}
.masthead h1 span {{ color: #FFC300; }}
.masthead .sub {{ margin-top: .6mm; font-size: 7.6pt; color: #C3D3E4; }}
.masthead .meta {{ text-align: right; font-size: 7.4pt; color: #C3D3E4; line-height: 1.45; }}
.masthead .meta b {{ color: #FFC300; display: block; font-size: 8.6pt; letter-spacing: .4pt; }}

.toc {{ margin: 2mm 0 1.6mm; border: 0.6pt solid #C3D3E4; background: #F7F9FB; padding: 1.2mm 2.2mm; }}
.toc-h {{ font-size: 7pt; text-transform: uppercase; letter-spacing: .7pt;
  color: #1F4E85; font-weight: bold; margin-bottom: 1mm; }}
.toc-grid {{ display: flex; flex-wrap: wrap; column-gap: 3.2mm; row-gap: .6mm; }}
.toc-row {{ font-size: 6.6pt; color: #16324F; text-decoration: none;
  padding: .2mm 1.2mm; background: #fff; border: .3pt solid #C3D3E4; white-space: nowrap; }}
.toc-row .pg {{ color: #B8860B; font-weight: bold; }}

.cols {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 5mm; align-items: start; }}

.sec {{ margin-bottom: 1.8mm; }}
.sec-h {{ display: flex; align-items: baseline; gap: 1.8mm; border-bottom: 1pt solid #001D3D;
  padding-bottom: .6mm; margin-bottom: 1.3mm; page-break-after: avoid; }}
.sec-letter {{ background: #FFC300; color: #000814; font-weight: bold; font-size: 8.2pt;
  padding: .2mm 1.5mm; }}
.sec-h h3 {{ margin: 0; font-size: 9.2pt; letter-spacing: .1pt; }}
.sec-note {{ font-size: 7pt; color: #4E6E8E; margin-left: auto; font-style: italic; }}

.grid {{ display: grid; column-gap: 3.4mm; row-gap: 1.2mm; }}
.g2 {{ grid-template-columns: repeat(2, 1fr); }}
.g3 {{ grid-template-columns: repeat(3, 1fr); }}
.g4 {{ grid-template-columns: repeat(4, 1fr); }}
.g5 {{ grid-template-columns: repeat(5, 1fr); }}
.fld {{ display: block; }}
.fld.wide {{ grid-column: 1 / -1; }}
.lab {{ display: block; font-size: 6.9pt; text-transform: uppercase; letter-spacing: .5pt;
  color: #1F4E85; font-weight: bold; }}
.req {{ color: #C62828; }}
.hint {{ display: block; font-size: 6.6pt; color: #4E6E8E; font-style: italic; font-weight: normal;
  text-transform: none; letter-spacing: 0; margin-left: 0; margin-top: .3mm; }}
.rule {{ display: block; border-bottom: 0.6pt solid #000814; height: 8mm; margin-top: .4mm; }}
.writebox {{ display: block; border: 0.6pt solid #9FB3C8; margin-top: .8mm; background:
  repeating-linear-gradient(to bottom, transparent 0, transparent 5.2mm, #D9E2EC 5.2mm, #D9E2EC 5.3mm); }}

.checks {{ display: grid; column-gap: 2mm; row-gap: .4mm; margin-top: .7mm; }}
.c3 {{ grid-template-columns: repeat(3, 1fr); }}
.c4 {{ grid-template-columns: repeat(4, 1fr); }}
.c5 {{ grid-template-columns: repeat(5, 1fr); }}
.c6 {{ grid-template-columns: repeat(6, 1fr); }}
.c7 {{ grid-template-columns: repeat(7, 1fr); }}
.c10 {{ grid-template-columns: repeat(10, 1fr); }}
.ck {{ font-size: 7.2pt; color: #16324F; display: flex; align-items: center; gap: .9mm;
  white-space: nowrap; }}
.ck i {{ width: 3.3mm; height: 3.3mm; border: 0.6pt solid #000814; display: inline-block;
  flex: 0 0 auto; }}
.checks.feat .ck i {{ width: 3.2mm; height: 3.2mm; }}
.checks.feat {{ row-gap: .8mm; }}
.checks.tight {{ margin-bottom: 1.2mm; }}

.nextbox {{ margin-top: 1.6mm; border: 0.6pt solid #C3D3E4; background: #F7F9FB; padding: 2mm 3mm; }}
.next-h {{ font-size: 7.4pt; text-transform: uppercase; letter-spacing: .6pt; color: #1F4E85;
  font-weight: bold; margin-bottom: 1.2mm; }}
.nextbox p {{ font-size: 7.4pt; color: #16324F; line-height: 1.55; margin: 0; }}
.note {{ font-size: 7pt; color: #16324F; margin: 1mm 0 0; line-height: 1.38; }}
.note.warn {{ background: #FFF8E1; border-left: 1.3mm solid #FFC300; padding: 1.2mm 1.8mm;
  color: #4A3800; }}
.sigrow {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 5mm; margin-top: 1.4mm; }}
.sig .rule {{ height: 9.5mm; }}

.steps {{ margin: 0; padding-left: 4.2mm; font-size: 7.2pt; line-height: 1.36; }}
.steps li {{ margin-bottom: 1mm; }}
table.map {{ width: 100%; border-collapse: collapse; font-size: 6.2pt; }}
table.map th {{ background: #001D3D; color: #fff; text-align: left; padding: .9mm 1.1mm;
  font-size: 6.4pt; text-transform: uppercase; letter-spacing: .3pt; }}
table.map td {{ padding: .18mm 1.1mm; border-bottom: .3pt solid #C3D3E4; vertical-align: top;
  line-height: 1.25; }}
table.map tbody tr:nth-child(even) {{ background: #F7F9FB; }}
.c-sec {{ width: 6mm; color: #4E6E8E; font-weight: bold; text-align: center; }}
.c-form {{ color: #1F4E85; font-weight: bold; }}
.c-note {{ color: #4E6E8E; }}
.vr {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 4mm; row-gap: 1.4mm; }}
.vr-b {{ break-inside: avoid; }}
.vr-h {{ font-size: 6.9pt; text-transform: uppercase; letter-spacing: .45pt; color: #1F4E85;
  font-weight: bold; margin-bottom: .6mm; }}
.pills {{ display: flex; flex-wrap: wrap; gap: .8mm; }}
.pill {{ font-size: 6.8pt; background: #F0F4F8; border: .3pt solid #C3D3E4; color: #16324F;
  padding: .35mm 1.2mm; }}
.pill.mono {{ font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 6.6pt; }}
.traps {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 4mm; row-gap: .9mm; }}
.trap {{ break-inside: avoid; }}
.trap-h {{ font-size: 7.3pt; font-weight: bold; color: #000814; border-left: 1.3mm solid #FFC300;
  padding-left: 1.6mm; margin-bottom: .5mm; }}
.trap-b {{ font-size: 7pt; color: #16324F; line-height: 1.32; }}

@media screen {{
  html {{ background: #d0d0d0; }}
  body {{ margin: 0; padding: 20px 0; }}
  body > section.page {{
    width: 210mm; min-height: 297mm; margin: 0 auto 20px; background: #fff;
    box-shadow: 0 4px 24px rgba(0,0,0,.18); box-sizing: border-box; overflow: hidden;
  }}
}}
</style>
</head>
<body>

<section class="page" id="page-1">
  <div class="run-head">
    <span class="l">CAR QR SHOWCASE &mdash; VEHICLE INQUIRY SHEET</span>
    <span class="r">One sheet per vehicle &middot; Page 1 of 4</span>
  </div>
  {MASTHEAD_SHEET}
  {nav("Index - pages 1-2 are the sheet, pages 3-4 are the operator reference")}
  <div class="cols">
    <div>
      {sec_a}
      {sec_b}
    </div>
    <div>
      {sec_c}
      {sec_d}
    </div>
  </div>
  <div class="run-foot">
    <span class="l">Car QR Showcase &middot; Vehicle Inquiry Sheet</span>
    <span class="r">Page 1 of 4</span>
  </div>
</section>

<section class="page" id="page-2">
  <div class="run-head">
    <span class="l">CAR QR SHOWCASE &mdash; VEHICLE INQUIRY SHEET</span>
    <span class="r">One sheet per vehicle &middot; Page 2 of 4</span>
  </div>
  {MASTHEAD_SHEET}
  {sec_e}
  {sec_f}
  {sec_g}
  {sec_h}
  <div class="nextbox">
    <div class="next-h">What happens after you submit this sheet</div>
    <p>1. Car QR Showcase enters the details into the Edit Car form and generates the QR code.<br/>
    2. You approve the QR preview, print the sticker and fix it to the windshield.<br/>
    3. The dealer watches scans and enquiries arrive on the dashboard.<br/>
    4. The QR URL can be changed at any time from one settings field - every sticker already printed keeps working.</p>
  </div>
  <div class="run-foot">
    <span class="l">Car QR Showcase &middot; Vehicle Inquiry Sheet</span>
    <span class="r">Page 2 of 4</span>
  </div>
</section>

<section class="page" id="page-3">
  <div class="run-head">
    <span class="l">CAR QR SHOWCASE &mdash; OPERATOR REFERENCE</span>
    <span class="r">Page 3 of 4 &middot; keep with the sheet</span>
  </div>
  {MASTHEAD_REF}
  {sec_i}
  {sec_j}
  {sec_k}
  <div class="run-foot">
    <span class="l">Car QR Showcase &middot; Vehicle Inquiry Sheet</span>
    <span class="r">Page 3 of 4</span>
  </div>
</section>

<section class="page" id="page-4">
  <div class="run-head">
    <span class="l">CAR QR SHOWCASE &mdash; OPERATOR REFERENCE</span>
    <span class="r">Page 4 of 4 &middot; valid values</span>
  </div>
  {MASTHEAD_REF}
  {sec_l}
  <div class="run-foot">
    <span class="l">Car QR Showcase &middot; Vehicle Inquiry Sheet</span>
    <span class="r">Page 4 of 4</span>
  </div>
</section>

</body>
</html>
"""

if __name__ == "__main__":
    print(HTML)
