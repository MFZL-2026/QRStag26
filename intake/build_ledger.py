#!/usr/bin/env python3
"""
Builds the Car QR Showcase Vehicle Intake Ledger workbook.

Three jobs in one file:
  1. "Vehicle Intake Ledger"  - one row per vehicle, dropdowns restricted to the
                                 values the Edit Car form accepts, plus formula
                                 helper columns (ready check, comma warning, CSV row).
  2. "Bulk Import CSV"        - the exact 12 headers the admin bulk importer
                                 parses (src/App.tsx parseCSV), populated by
                                 formula from the ledger, ready to Save As CSV.
  3. "Valid Values"           - the reference lists that back every dropdown.
  4. "Instructions"           - how to use it, and the field mapping.

Every derived value is a live Excel formula, so editing a row updates the CSV
export immediately.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.utils import get_column_letter
import re

# ---------------------------------------------------------------------------
# Brand + option lists (mirrored from the Edit Car form in src/App.tsx)
# ---------------------------------------------------------------------------
NAVY = "001D3D"
GOLD = "FFC300"
INK = "000814"
SLATE = "1F4E85"
GREY = "4E6E8E"
LIGHT = "F0F4F8"
BORDER = "C3D3E4"

COLOR = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green",
         "Yellow", "Orange", "Brown", "Beige", "Gold", "Other"]
FUEL = ["Gasoline", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid",
        "CNG", "LPG", "Other"]
TRANS = ["Automatic", "Manual", "Semi-Automatic", "CVT", "Other"]
QR_TEMPLATE = ["standard", "luxury", "classic", "bold", "minimalist", "sports",
               "eco", "ev", "hybrid", "plugin_hybrid"]
QR_SHAPE = ["square", "rounded_xs", "rounded_sm", "rounded_md", "rounded_lg",
            "rounded_xl", "pill", "circle", "circle_md", "octagon", "hexagon",
            "diamond"]
LOGO_POS = ["none", "top", "center", "bottom"]
CO_NAME_POS = ["none", "top", "bottom"]
COMPANIES = ["MKMA (Baghdad)", "Company 2 (Erbil)", "Company 3 (Basra)",
             "Company 4 (Duhok)"]
BODY_TYPES = ["Sedan", "SUV", "Crossover", "Coupe", "Hatchback", "Wagon",
              "Station Wagon", "Convertible", "Pickup Truck", "Van",
              "Minivan", "Truck"]
CAR_CONDITIONS = ["New", "Used", "Certified Pre-Owned", "Demonstrator",
                  "Ex-Fleet", "Rebuilt", "Salvage", "Clean Title", "Painted"]
WHEEL_DRIVES = ["FWD", "RWD", "AWD", "4WD"]
TURBO = ["Yes", "No", "Twin-Turbo", "Supercharged"]
CYLINDERS = ["3", "4", "5", "6", "8", "10", "12"]
SEAT_MATERIALS = ["Leather", "Nappa Leather", "Alcantara", "Fabric", "Suede",
                  "Vinyl", "Leather & Fabric", "Other"]
WARRANTY = ["Factory Warranty", "Dealer Warranty", "Under Warranty",
            "Expired", "Not Warrantied", "Extended Warranty"]
CAMERA_FEATURES = ["Rear Camera", "Front Camera", "360° Camera",
                   "Blind Spot Camera", "Dash Cam", "Parking Sensors Front",
                   "Parking Sensors Rear", "Underbody Camera",
                   "Surround View Monitor"]
ENGINE_CAPACITIES = ["1.0L", "1.3L", "1.5L", "1.6L", "1.8L", "2.0L", "2.2L",
                     "2.4L", "2.5L", "2.7L", "3.0L", "3.5L", "3.6L", "4.0L",
                     "4.2L", "4.7L", "5.0L", "5.7L", "6.0L", "6.2L", "6.5L",
                     "8.4L", "Electric"]
WHEEL_SIZES = ["14\"", "15\"", "16\"", "17\"", "18\"", "19\"", "20\"",
               "21\"", "22\"", "23\""]
TRIM_LEVELS = ["Base", "Standard", "Sport", "Sport Plus", "Touring", "Premium",
               "Premium Plus", "Luxury", "Limited", "Ultimate", "Executive"]

MODELS = {
    "Toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "4Runner",
               "Land Cruiser", "Prius", "Yaris", "Sequoia", "Tundra"],
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "HR-V", "Passport", "Ridgeline"],
    "Ford": ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Bronco", "Ranger",
             "Expedition"],
    "BMW": ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "Z4",
            "M3", "M5"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS",
                      "A-Class", "CLA"],
    "Tesla": ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
    "Chevrolet": ["Silverado", "Malibu", "Equinox", "Tahoe", "Suburban", "Traverse",
                  "Camaro", "Corvette"],
    "Audi": ["A3", "A4", "A6", "Q3", "Q5", "Q7", "e-tron"],
    "Nissan": ["Altima", "Sentra", "Maxima", "Rogue", "Murano", "Pathfinder",
               "Frontier", "Titan"],
    "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona"],
    "Kia": ["Forte", "K5", "Sportage", "Sorento", "Telluride", "Seltos"],
    "Volkswagen": ["Jetta", "Passat", "Tiguan", "Atlas", "Golf", "ID.4"],
    "Porsche": ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
    "Lexus": ["ES", "IS", "GS", "RX", "NX", "GX", "LX"],
    "Mazda": ["Mazda3", "Mazda6", "CX-5", "CX-30", "CX-9", "MX-5 Miata"],
    "Subaru": ["Impreza", "Legacy", "Outback", "Forester", "Crosstrek", "Ascent"],
    "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade",
             "Gladiator"],
    "Land Rover": ["Range Rover", "Range Rover Sport", "Discovery", "Defender",
                   "Evoque"],
    "Volvo": ["S60", "S90", "XC40", "XC60", "XC90"],
}
MAKES = list(MODELS.keys())

# ---------------------------------------------------------------------------
# Ledger columns: (header, width, kind, key)
#   kind: text | int | date | make | model | list:<named range> | calc
# ---------------------------------------------------------------------------
COLS = [
    ("Ref", 7, "text"),
    ("Company (dealer)", 22, "list:CompanyList"),
    ("Make", 14, "list:MakeList"),
    ("Model", 16, "model"),
    ("Year", 8, "int"),
    ("Price", 12, "text"),
    ("Mileage", 14, "text"),
    ("Color", 12, "list:ColorList"),
    ("Fuel Type", 16, "list:FuelList"),
    ("Transmission", 16, "list:TransList"),
    ("Description", 52, "text"),
    ("Location", 18, "text"),
    ("Contact Phone", 16, "text"),
    ("WhatsApp", 16, "text"),
    ("Email", 22, "text"),
    ("Video Link", 22, "text"),
    ("Photos (count)", 9, "int"),
    ("CCR No.", 14, "text"),
    ("Approved On", 13, "date"),
    ("Produced In & After", 13, "text"),
    ("Country of Production", 16, "text"),
    ("Pollutant Limits", 14, "text"),
    ("VIN", 20, "text"),
    ("Label No.", 12, "text"),
    ("Manufacturer", 16, "text"),
    ("Motor Vehicle Class", 14, "text"),
    ("FE (CAFE) Combined", 14, "text"),
    ("Scan Start Date", 13, "date"),
    ("Scan End Date", 13, "date"),
    ("QR Template", 14, "list:QrTemplateList"),
    ("QR Shape", 14, "list:QrShapeList"),
    ("Logo Position", 13, "list:LogoPosList"),
    ("Company Name Position", 14, "list:CoNamePosList"),
    ("Body Type", 16, "list:BodyTypeList"),
    ("Car Condition", 18, "list:CarConditionList"),
    ("Trim Level", 16, "text"),
    ("Engine Capacity", 15, "text"),
    ("Horsepower (HP)", 14, "text"),
    ("Number of Cylinders", 12, "list:CylinderList"),
    ("Wheel Drive System", 14, "list:WheelDriveList"),
    ("Turbo", 13, "list:TurboList"),
    ("Number of Seats", 12, "int"),
    ("Seat Material", 16, "list:SeatMaterialList"),
    ("Wheel Size", 12, "text"),
    ("Warranty Status", 18, "list:WarrantyList"),
    ("Warranty Details", 18, "text"),
    ("Camera Features", 34, "text"),
    ("Ready?", 22, "calc"),
    ("Comma check", 22, "calc"),
    ("CSV row (copy to Bulk Import sheet)", 46, "calc"),
    ("Operator notes", 30, "text"),
]

HDR_ROW = 4
FIRST = 5
NROWS = 30
LAST = FIRST + NROWS - 1

thin = Side(style="thin", color=BORDER)
box = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()


def style_header(ws, row, ncols, start=1):
    for c in range(start, start + ncols):
        cell = ws.cell(row=row, column=c)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor=NAVY)
        cell.alignment = Alignment(horizontal="center", vertical="center",
                                   wrap_text=True)
        cell.border = box
    ws.row_dimensions[row].height = 34


def band(ws, row, text, ncols, start=1):
    ws.cell(row=row, column=start, value=text)
    for c in range(start, start + ncols):
        cell = ws.cell(row=row, column=c)
        cell.fill = PatternFill("solid", fgColor=GOLD)
        cell.font = Font(name="Calibri", size=11, bold=True, color=INK)
    ws.row_dimensions[row].height = 22


def title_block(ws, title, subtitle, ncols):
    ws.cell(row=1, column=1, value=title)
    ws.cell(row=1, column=1).font = Font(name="Calibri", size=16, bold=True,
                                         color=NAVY)
    ws.cell(row=2, column=1, value=subtitle)
    ws.cell(row=2, column=1).font = Font(name="Calibri", size=9.5, italic=True,
                                         color=GREY)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ncols)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ncols)
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 16


# ===========================================================================
# Sheet 3 first (it backs the named ranges used by the others)
# ===========================================================================
vv = wb.active
vv.title = "Valid Values"
vv.sheet_properties.tabColor = GREY

title_block(vv, "Valid Values", "Reference lists. These back every dropdown on the "
                                "Intake Ledger - they are the exact values the Edit Car "
                                "form accepts.", 20)

# Makes across the top, models underneath (for INDIRECT dependent dropdowns)
vv.cell(row=4, column=1, value="Make")
for i, mk in enumerate(MAKES):
    c = 2 + i
    cell = vv.cell(row=4, column=c, value=mk)
    cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor=NAVY)
    cell.alignment = Alignment(horizontal="center", vertical="center",
                                wrap_text=True)
    cell.border = box
    for j, mod in enumerate(MODELS[mk]):
        mc = vv.cell(row=5 + j, column=c, value=mod)
        mc.font = Font(name="Calibri", size=9)
        mc.border = box
    vv.column_dimensions[get_column_letter(c)].width = max(11, len(mk) + 2)
vv.cell(row=4, column=1).font = Font(name="Calibri", size=10, bold=True,
                                     color="FFFFFF")
vv.cell(row=4, column=1).fill = PatternFill("solid", fgColor=NAVY)
vv.cell(row=4, column=1).border = box
vv.column_dimensions["A"].width = 14

# Named ranges for each make's model list
for i, mk in enumerate(MAKES):
    c = 2 + i
    n = len(MODELS[mk])
    safe = re.sub(r"[^A-Za-z0-9_]", "_", mk)
    ref = f"'Valid Values'!${get_column_letter(c)}$5:${get_column_letter(c)}${4 + n}"
    wb.defined_names.add(DefinedName(f"Model_{safe}", attr_text=ref))

# Vertical lists in a block further down
def vlist(row0, label, values, name, width=20):
    vv.cell(row=row0, column=1, value=label).font = Font(name="Calibri", size=10,
                                                         bold=True, color="FFFFFF")
    vv.cell(row=row0, column=1).fill = PatternFill("solid", fgColor=NAVY)
    for i, v in enumerate(values):
        cell = vv.cell(row=row0 + 1 + i, column=1, value=v)
        cell.font = Font(name="Calibri", size=9)
        cell.border = box
    ref = f"'Valid Values'!$A${row0 + 1}:$A${row0 + len(values)}"
    wb.defined_names.add(DefinedName(name, attr_text=ref))


vlist(22, "Color", COLOR, "ColorList")
vlist(38, "Fuel Type", FUEL, "FuelList")
vlist(49, "Transmission", TRANS, "TransList")
vlist(58, "Company (dealer)", COMPANIES, "CompanyList")
vlist(66, "QR Template", QR_TEMPLATE, "QrTemplateList")
vlist(79, "QR Shape", QR_SHAPE, "QrShapeList")
vlist(94, "Logo Position", LOGO_POS, "LogoPosList")
vlist(102, "Company Name Position", CO_NAME_POS, "CoNamePosList")
vlist(112, "Body Type", BODY_TYPES, "BodyTypeList")
vlist(128, "Car Condition", CAR_CONDITIONS, "CarConditionList")
vlist(139, "Wheel Drive System", WHEEL_DRIVES, "WheelDriveList")
vlist(147, "Turbo", TURBO, "TurboList")
vlist(155, "Number of Cylinders", CYLINDERS, "CylinderList")
vlist(166, "Seat Material", SEAT_MATERIALS, "SeatMaterialList")
vlist(178, "Warranty Status", WARRANTY, "WarrantyList")
vlist(188, "Camera Features", CAMERA_FEATURES, "CameraFeatureList")
vlist(201, "Engine Capacity", ENGINE_CAPACITIES, "EngineCapacityList")
vlist(228, "Wheel Size", WHEEL_SIZES, "WheelSizeList")
vlist(242, "Trim Level", TRIM_LEVELS, "TrimLevelList")

# MakeList = the make header row
wb.defined_names.add(DefinedName("MakeList",
                                 attr_text="'Valid Values'!$B$4:$T$4"))

vv.cell(row=256, column=1, value="Note: the model list for each make is the column "
                                  "headed by that make, rows 5-16. The Model dropdown "
                                  "on the Intake Ledger reads it dynamically, so "
                                  "changing a make filters the models automatically.")
vv.cell(row=112, column=1).font = Font(name="Calibri", size=9, italic=True,
                                       color=GREY)
vv.freeze_panes = "B5"

# ===========================================================================
# Sheet 1 - Vehicle Intake Ledger
# ===========================================================================
lg = wb.create_sheet("Vehicle Intake Ledger", 0)
lg.sheet_properties.tabColor = GOLD

NC = len(COLS)
title_block(lg, "Vehicle Intake Ledger", "One row per vehicle. Blue = type it in. "
          "Black = calculated, do not overwrite. Dropdowns only accept values the "
          "Edit Car form accepts.", NC)

band(lg, 3, "Enter one vehicle per row. Columns AH-AJ calculate themselves.", NC)
for i, (h, w, kind) in enumerate(COLS, start=1):
    lg.cell(row=HDR_ROW, column=i, value=h)
    lg.column_dimensions[get_column_letter(i)].width = w
style_header(lg, HDR_ROW, NC)

L = {name: i + 1 for i, (name, _w, _k) in enumerate(COLS)}
cAH, cAI, cAJ = L["Ready?"], L["Comma check"], L["CSV row (copy to Bulk Import sheet)"]

for r in range(FIRST, LAST + 1):
    lg.row_dimensions[r].height = 18
    for i, (h, w, kind) in enumerate(COLS, start=1):
        cell = lg.cell(row=r, column=i)
        cell.border = box
        cell.font = Font(name="Calibri", size=10)
        if kind in ("text", "int", "date"):
            cell.font = Font(name="Calibri", size=10, color="0000FF")
        elif kind in ("make", "model") or kind.startswith("list:"):
            cell.font = Font(name="Calibri", size=10, color="0000FF")
        elif kind == "calc":
            cell.font = Font(name="Calibri", size=10, color="000000")
            cell.fill = PatternFill("solid", fgColor=LIGHT)
    # Ref auto-numbers
    lg.cell(row=r, column=L["Ref"],
            value=f'=IF(C{r}="","",ROW()-{HDR_ROW})').font = Font(
        name="Calibri", size=10, color="000000")
    lg.cell(row=r, column=L["Ref"]).fill = PatternFill("solid", fgColor=LIGHT)

    # Ready?
    lg.cell(row=r, column=cAH,
            value=f'=IF(AND(TRIM(C{r})<>"",TRIM(D{r})<>""),"READY","MISSING MAKE/MODEL")')
    # Comma check - the CSV trap
    lg.cell(row=r, column=cAI,
            value=(f'=IF(AND(K{r}<>"",ISNUMBER(SEARCH(",",K{r}))),'
                   f'"COMMA in Description",IF(AND(L{r}<>"",ISNUMBER(SEARCH(",",L{r}))),'
                   f'"COMMA in Location","ok"))'))
    # CSV row - safe for the bulk importer (commas neutralised, quotes stripped)
    lg.cell(row=r, column=cAJ, value=(
        f'=IF(C{r}="","",'
        f'C{r}&","&D{r}&","&E{r}&","&F{r}&","&G{r}&","&I{r}&","&J{r}&","&H{r}&","&'
        f'SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(K{r},","," ; "),CHAR(34),""),CHAR(34),"")&","&'
        f'SUBSTITUTE(SUBSTITUTE(M{r},","," ; "),CHAR(34),"")&","&'
        f'SUBSTITUTE(SUBSTITUTE(O{r},","," ; "),CHAR(34),"")&","&'
        f'SUBSTITUTE(SUBSTITUTE(L{r},","," ; "),CHAR(34),""))'))

# Data validation
def add_dv(ws, formula, col, r1, r2, title, prompt):
    dv = DataValidation(type="list", formula1=formula, allow_blank=True,
                        showDropDown=False)
    dv.error = "That value is not in the form's list. Pick one of the dropdown values."
    dv.errorTitle = "Invalid value"
    dv.prompt = prompt
    dv.promptTitle = title
    ws.add_data_validation(dv)
    dv.add(f"{col}{r1}:{col}{r2}")


add_dv(lg, "=CompanyList", get_column_letter(L["Company (dealer)"]), FIRST, LAST,
       "Company", "The dealer account this vehicle belongs to.")
add_dv(lg, "=MakeList", get_column_letter(L["Make"]), FIRST, LAST,
       "Make", "If the make is not listed, pick the nearest and note it - the form "
               "has a '+ Other (Enter Manually)' option.")
add_dv(lg, '=INDIRECT("Model_"&SUBSTITUTE($C{r},"-","_"))'.format(r=FIRST),
       get_column_letter(L["Model"]), FIRST, LAST,
       "Model", "Models follow the Make you chose. Set Make first - changing it "
                "clears the Model.")
add_dv(lg, "=ColorList", get_column_letter(L["Color"]), FIRST, LAST,
       "Colour", "One of the form's colour values.")
add_dv(lg, "=FuelList", get_column_letter(L["Fuel Type"]), FIRST, LAST,
       "Fuel type", "One of the form's fuel values.")
add_dv(lg, "=TransList", get_column_letter(L["Transmission"]), FIRST, LAST,
       "Transmission", "One of the form's transmission values.")
add_dv(lg, "=QrTemplateList", get_column_letter(L["QR Template"]), FIRST, LAST,
       "QR template", "Print style for the QR sticker.")
add_dv(lg, "=QrShapeList", get_column_letter(L["QR Shape"]), FIRST, LAST,
       "QR shape", "Shape of the QR code on the sticker.")
add_dv(lg, "=LogoPosList", get_column_letter(L["Logo Position"]), FIRST, LAST,
       "Logo position", "Where the dealer logo sits on the print.")
add_dv(lg, "=CoNamePosList", get_column_letter(L["Company Name Position"]), FIRST, LAST,
       "Company name position", "Where the dealer name sits on the print.")
add_dv(lg, "=BodyTypeList", get_column_letter(L["Body Type"]), FIRST, LAST,
       "Body type", "Sedan / SUV / Coupe / ...")
add_dv(lg, "=CarConditionList", get_column_letter(L["Car Condition"]), FIRST, LAST,
       "Car condition", "New / Used / Certified Pre-Owned / ...")
add_dv(lg, "=CylinderList", get_column_letter(L["Number of Cylinders"]), FIRST, LAST,
       "Cylinders", "One of the form's cylinder counts.")
add_dv(lg, "=WheelDriveList", get_column_letter(L["Wheel Drive System"]), FIRST, LAST,
       "Wheel drive", "FWD / RWD / AWD / 4WD.")
add_dv(lg, "=TurboList", get_column_letter(L["Turbo"]), FIRST, LAST,
       "Turbo", "Yes / No / Twin-Turbo / Supercharged.")
add_dv(lg, "=SeatMaterialList", get_column_letter(L["Seat Material"]), FIRST, LAST,
       "Seat material", "Leather / Fabric / Alcantara / ...")
add_dv(lg, "=WarrantyList", get_column_letter(L["Warranty Status"]), FIRST, LAST,
       "Warranty status", "Factory / Dealer / Under / Expired / ...")

# Photo count 0..10
dv_photos = DataValidation(type="whole", operator="between", formula1=0, formula2=10,
                            allow_blank=True)
dv_photos.error = "The form accepts a maximum of 10 photos."
dv_photos.errorTitle = "Too many photos"
lg.add_data_validation(dv_photos)
dv_photos.add(f"{get_column_letter(L['Photos (count)'])}{FIRST}:"
              f"{get_column_letter(L['Photos (count)'])}{LAST}")

# Number of seats sanity
dv_seats = DataValidation(type="whole", operator="between", formula1=1, formula2=20,
                           allow_blank=True)
dv_seats.error = "A vehicle has between 1 and 20 seats."
dv_seats.errorTitle = "Unrealistic seat count"
lg.add_data_validation(dv_seats)
dv_seats.add(f"{get_column_letter(L['Number of Seats'])}{FIRST}:"
             f"{get_column_letter(L['Number of Seats'])}{LAST}")

# Year sanity
dv_year = DataValidation(type="whole", operator="between", formula1=1950,
                         formula2=2100, allow_blank=True)
dv_year.error = "Year must be between 1950 and 2100."
dv_year.errorTitle = "Unrealistic year"
lg.add_data_validation(dv_year)
dv_year.add(f"{get_column_letter(L['Year'])}{FIRST}:"
             f"{get_column_letter(L['Year'])}{LAST}")

# Date columns
for colname in ("Approved On", "Scan Start Date", "Scan End Date"):
    col = get_column_letter(L[colname])
    dv = DataValidation(type="date", operator="between",
                        formula1="DATE(1950,1,1)", formula2="DATE(2100,12,31)",
                        allow_blank=True)
    dv.error = "Enter a real date (YYYY-MM-DD)."
    dv.errorTitle = "Invalid date"
    lg.add_data_validation(dv)
    dv.add(f"{col}{FIRST}:{col}{LAST}")
    for r in range(FIRST, LAST + 1):
        lg[f"{col}{r}"].number_format = "yyyy-mm-dd"

# Year format as plain text (no thousands separator)
for r in range(FIRST, LAST + 1):
    lg[f"{get_column_letter(L['Year'])}{r}"].number_format = "0"

lg.freeze_panes = f"{get_column_letter(L['Make'])}{FIRST}"
lg.auto_filter.ref = f"A{HDR_ROW}:{get_column_letter(NC)}{LAST}"
lg.page_setup.orientation = "landscape"
lg.page_setup.fitToWidth = 1
lg.page_setup.fitToHeight = 0
lg.sheet_properties.pageSetUpPr.fitToPage = True
lg.print_title_rows = f"{HDR_ROW}:{HDR_ROW}"
lg.page_margins.left = lg.page_margins.right = 0.25

# ===========================================================================
# Sheet 2 - Bulk Import CSV  (must have headers in row 1 - no title rows)
# ===========================================================================
cs = wb.create_sheet("Bulk Import CSV", 1)
cs.sheet_properties.tabColor = SLATE

CSV_HEADERS = ["make", "model", "year", "price", "mileage", "fuelType",
               "transmission", "color", "description", "contactPhone",
               "contactEmail", "location"]
SRC = {"make": "Make", "model": "Model", "year": "Year", "price": "Price",
       "mileage": "Mileage", "fuelType": "Fuel Type",
       "transmission": "Transmission", "color": "Color",
       "description": "Description",
       "contactPhone": "Contact Phone", "contactEmail": "Email",
       "location": "Location"}

for i, h in enumerate(CSV_HEADERS, start=1):
    c = cs.cell(row=1, column=i, value=h)
    c.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(horizontal="center", vertical="center")
    c.border = box
    cs.column_dimensions[get_column_letter(i)].width = (
        46 if h == "description" else 18)

# Text columns that could contain a comma are neutralised on export, so the
# generated CSV can never be corrupted by a comma inside Description/Location.
CSV_SANITISE = {"price", "mileage", "description", "contactPhone",
                "contactEmail", "location"}

for r in range(2, 2 + NROWS):
    src_r = FIRST + (r - 2)
    for i, h in enumerate(CSV_HEADERS, start=1):
        sc = get_column_letter(L[SRC[h]])
        ref = f"'Vehicle Intake Ledger'!${sc}${src_r}"
        if h in CSV_SANITISE:
            expr = f'SUBSTITUTE(SUBSTITUTE({ref},","," ; "),CHAR(34),"")'
        else:
            expr = ref
        cell = cs.cell(row=r, column=i,
                        value=f'=IF({ref}="","",{expr})')
        cell.font = Font(name="Calibri", size=10, color="000000")
        cell.border = box
    cs.row_dimensions[r].height = 16

cs.freeze_panes = "A2"
cs.page_setup.orientation = "landscape"
cs.page_setup.fitToWidth = 1
cs.page_setup.fitToHeight = 0
cs.sheet_properties.pageSetUpPr.fitToPage = True
cs.print_title_rows = "1:1"

# ===========================================================================
# Sheet 4 - Instructions
# ===========================================================================
ins = wb.create_sheet("Instructions", 3)
ins.sheet_properties.tabColor = NAVY
title_block(ins, "How to use the Vehicle Intake Ledger", "Read this before you "
            "enter the first vehicle.", 8)

def h(t, row):
    ins.cell(row=row, column=1, value=t)
    ins.cell(row=row, column=1).font = Font(name="Calibri", size=11, bold=True,
                                             color=NAVY)
    ins.cell(row=row, column=1).fill = PatternFill("solid", fgColor=GOLD)
    for c in range(2, 9):
        ins.cell(row=row, column=c).fill = PatternFill("solid", fgColor=GOLD)
    ins.row_dimensions[row].height = 20


def p(t, row, indent=0):
    ins.cell(row=row, column=1, value=t)
    ins.cell(row=row, column=1).font = Font(name="Calibri", size=10, color=INK)
    ins.cell(row=row, column=1).alignment = Alignment(wrap_text=True, vertical="top",
                                                       indent=indent)
    # size the row to the wrapped text so nothing collides
    chars_per_line = 94
    lines = max(1, -(-len(str(t)) // chars_per_line))
    ins.row_dimensions[row].height = lines * 13.5 + 5


r = 4
h("1. Collect the details", r); r += 1
p("Print the Vehicle Inquiry Sheet (PDF) and hand it to the dealer, or fill it in with "
  "them. One sheet per vehicle. Everything on that sheet maps to a field here.", r); r += 1
p("The paper sheet is the source of truth. This workbook is for entering what the sheet "
  "collected, and for importing in batches.", r); r += 2

h("2. Enter the vehicles", r); r += 1
p("Vehicle Intake Ledger sheet. One row per vehicle, 51 columns. Blue columns are typed "
  "in; black columns calculate themselves and should not be overwritten.", r); r += 1
p("Columns AH-AT are the new vehicle specifications: body type, car condition, trim "
  "level, engine capacity, horsepower, cylinders, wheel drive, turbo, seats, seat "
  "material, wheel size, warranty status and details, and camera features. Every "
  "dropdown only offers values the Edit Car form accepts.", r); r += 1
p("The dropdowns only allow values the Edit Car form accepts, so you cannot save a value "
  "the form will reject. Set Make before Model - the model list follows the make.", r); r += 1
p("Ready? turns to READY once Make and Model are both present. Comma check warns when a "
  "Description or Location contains a comma - see section 4.", r); r += 2

h("3. Enter them one by one (Edit Car form)", r); r += 1
p("Admin panel > Cars > Add Car. Copy each value across. The Inquiry Sheet PDF page 2 "
  "has the field-by-field map, including the exact form field each column lands in.", r); r += 2

h("4. Or import in bulk (CSV)", r); r += 1
p("Bulk Import CSV sheet. It pulls from the Intake Ledger automatically - no retyping. "
  "Its 12 headers are exactly the ones the admin bulk importer reads.", r); r += 1
p("IMPORTANT: the bulk importer only carries those 12 core fields. The vehicle "
  "specifications are NOT part of the CSV - after importing, open each car in the "
  "Edit Car form and fill in the Vehicle Specifications section, or enter the whole "
  "row through the form in the first place.", r); r += 1
p("Before you export: delete the trailing rows you did not use (right-click the row "
  "number > Delete). The importer lists empty rows as validation errors. Then "
  "File > Save As > CSV (Comma delimited).", r); r += 1
p("In the admin panel: Cars > Bulk Import > upload the CSV > pick the company > Import. "
  "One file per dealer - every row in a file is assigned to the company you pick.", r); r += 1
p("One company per file. If the vehicles belong to different dealers, split the file.", r); r += 2

h("5. The comma trap", r); r += 1
p("The bulk importer splits each row on commas. A single comma inside Description or "
  "Location shifts every column after it and corrupts the row.", r); r += 1
p("Fix it by using a hyphen or semicolon instead: \"Excellent condition - sunroof - "
  "leather seats - reverse camera\"", r); r += 1
p("The Comma check column flags this for you. The Edit Car form itself has no such "
  "problem - this only affects CSV import.", r); r += 2

h("6. The one thing not to collect", r); r += 1
p("Engine capacity, horsepower, condition and every other specification now have their "
  "own field in the Edit Car form and are shown to the customer. Two legacy columns "
  "remain unreachable: features and number of owners.", r); r += 1
p("Do not spend dealer time collecting those two separately. Put that information "
  "into Description - that is the text the buyer actually reads.", r); r += 2

h("7. Colour code", r); r += 1
p("Blue text  = type it in (an input).", r); r += 1
p("Black text = a formula - it recalculates, do not overwrite it.", r); r += 1
p("Grey fill  = a helper column, also calculated.", r); r += 2

h("8. Limits", r); r += 1
p("Maximum 10 photos per vehicle (auto-compressed to 100 KB each). The bulk importer "
  "accepts up to 100 rows per file; this workbook holds 30 vehicles - split larger "
  "batches into separate files.", r); r += 1
p("Before the new columns exist in the database, saving a car drops the specification "
  "fields and the admin panel shows 'Some fields were not saved'. Run "
  "add_car_specifications.sql in the Supabase SQL Editor once - it is safe to run "
  "more than once.", r)

ins.column_dimensions["A"].width = 92
for rr in range(4, r + 1):
    ins.cell(row=rr, column=1).alignment = Alignment(wrap_text=True, vertical="top")
ins.page_setup.orientation = "portrait"
ins.page_setup.fitToWidth = 1
ins.page_setup.fitToHeight = 0
ins.sheet_properties.pageSetUpPr.fitToPage = True
ins.print_area = f"A1:H{r}"
ins.page_margins.left = ins.page_margins.right = 0.4

# Put Instructions first for readability
wb.move_sheet("Instructions", offset=-3)

wb.save("/workspace/car-qr-showcase/intake/Vehicle-Intake-Ledger.xlsx")
print("saved workbook")
