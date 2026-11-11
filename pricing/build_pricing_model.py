#!/usr/bin/env python3
"""
Builds the Car QR Showcase Vehicle Pricing Model workbook.

Formula-first: every derived value is a live Excel formula, so changing a cost
driver re-costs the whole price list immediately. Blue = an input you type,
black = calculated.

Structure note: the Cost Model sheet breaks the landed-cost build-up into one
short formula per row (unit -> print -> laminate -> goods -> duty -> landed ->
landed+setup) rather than one giant expression. Short formulas are auditable
and they recalculate reliably.

Run:  python3 build_pricing_model.py
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName

NAVY, GOLD, INK = "001D3D", "FFC300", "000814"
SLATE, GREY, LIGHT, BORD = "1F4E85", "4E6E8E", "F0F4F8", "C3D3E4"
BLUE, BLACK = "0000FF", "000000"

thin = Side(style="thin", color=BORD)
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
F = Font(name="Calibri", size=10)
F_B = Font(name="Calibri", size=10, bold=True)
F_IN = Font(name="Calibri", size=10, color=BLUE)
F_CALC = Font(name="Calibri", size=10, color=BLACK)
F_HDR = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
F_TITLE = Font(name="Calibri", size=15, bold=True, color=NAVY)
F_NOTE = Font(name="Calibri", size=9, italic=True, color=GREY)
FILL_HDR = PatternFill("solid", fgColor=NAVY)
FILL_ACC = PatternFill("solid", fgColor=GOLD)
FILL_LT = PatternFill("solid", fgColor=LIGHT)

# ---------------------------------------------------------------------------
# Sourced data - see pricing_model.py for full source notes
# ---------------------------------------------------------------------------
CURVES = {
    "A5_reg": ([25, 100, 250, 500, 1000], [1.55, 1.30, 1.12, 1.00, 0.92]),
    "A5_fac": ([100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000],
                [2.090/7.8, 1.505/7.8, 1.503/7.8, 1.200/7.8, 0.932/7.8,
                 0.815/7.8, 0.697/7.8, 0.603/7.8, 0.510/7.8]),
    "A4_reg": ([25, 100, 250, 500, 1000], [3.10, 2.60, 2.25, 2.00, 1.85]),
    "A4_fac": ([100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000],
                [3.010/7.8, 2.330/7.8, 2.330/7.8, 2.240/7.8, 1.630/7.8,
                 1.270/7.8, 1.052/7.8, 1.020/7.8, 0.997/7.8]),
}
QUANTITIES = [1, 25, 50, 100, 250, 500, 1000, 5000]

# (key, label, value, unit, note)
SCALARS = [
    ("Laminate", "Laminate", 8.72, "$/m2",
     "Polymeric outdoor overlaminate. Source: Wielka Reklama ~EUR 8 net/m2 at 1.09 USD/EUR."),
    ("AreaA5", "Area A5", 0.03108, "m2", "148 x 210 mm"),
    ("AreaA4", "Area A4", 0.06237, "m2", "210 x 297 mm"),
    ("PackA5", "Pack A5", 0.03, "$", "Per unit"),
    ("PackA4", "Pack A4", 0.08, "$", "Per unit"),
    ("FreightRegional", "Freight regional", 8.00, "$/kg",
     "DDP air, small parcel. 2026 China-Iraq express courier $5.50-15/kg."),
    ("FreightFactory", "Freight factory", 4.00, "$/kg",
     "DDP air, bulk break. 2026 China-Iraq air freight $3-8/kg."),
    ("WeightA5", "Weight A5", 0.005, "kg", "One printed + laminated sheet"),
    ("WeightA4", "Weight A4", 0.008, "kg", "One printed + laminated sheet"),
    ("Duty", "Duty + tax buffer", 0.10, "",
     "Iraq 2026 ASYCUDA tariff 0.5-30% + VAT ~5%. CONFIRM THE HS CODE."),
    ("Wastage", "Wastage", 0.03, "", "Spoilage, misprints, trim waste, spares"),
    ("PaymentFee", "Payment fee", 0.03, "",
     "Blended card/wallet/transfer. FIB 1-5%, ZainCash 1%+$0.15, COD higher."),
    ("FX", "FX buffer", 0.02, "", "IQD/USD and supplier currency movement"),
    ("VDPRegional", "VDP premium regional", 0.10, "",
     "Variable-data printing uplift (unique QR per sticker)."),
    ("VDPFactory", "VDP premium factory", 0.15, "",
     "Variable-data printing uplift."),
    ("Setup", "Print job setup", 45.00, "$", "Prepress + plates/DRS + proofing, per job."),
    ("FactoryMOQ", "Factory MOQ (units)", 250, "units",
     "Below this a factory run is not economic - the regional route is used instead."),
]

BANDS = [
    ("Individual", 1,   9.00, 15.00, 22.00),
    ("Showroom",   25,   7.00, 11.50, 17.00),
    ("Dealer",     100,  5.75,  9.25, 13.75),
    ("Dealer+",    250,  4.75,  7.50, 11.50),
    ("Partner",    500,  4.00,  6.50,  9.75),
]
PLATFORM_FEE = {"Individual": 0, "Showroom": 29, "Dealer": 99, "Dealer+": 149,
                "Partner": 299}

wb = Workbook()


def title_block(ws, title, subtitle, ncols):
    ws["A1"] = title
    ws["A1"].font = F_TITLE
    ws["A2"] = subtitle
    ws["A2"].font = F_NOTE
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ncols)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ncols)
    ws.row_dimensions[1].height = 22
    ws.row_dimensions[2].height = 15


def hdr(ws, row, labels, widths=None, start=1, height=28):
    for i, l in enumerate(labels):
        c = ws.cell(row=row, column=start + i, value=l)
        c.font = F_HDR
        c.fill = FILL_HDR
        c.alignment = Alignment(horizontal="center", vertical="center",
                                wrap_text=True)
        c.border = BOX
    ws.row_dimensions[row].height = height
    if widths:
        for i, w in enumerate(widths):
            ws.column_dimensions[get_column_letter(start + i)].width = w


# ===========================================================================
# Assumptions
# ===========================================================================
asm = wb.active
asm.title = "Assumptions"
asm.sheet_properties.tabColor = GREY
title_block(asm, "Assumptions & source data",
            "Blue cells are inputs - change one and the whole model re-costs. "
            "Black cells are formulas or sourced figures.", 16)

SCALAR_ROW0 = 6
r = 5
asm.cell(row=r, column=1, value="Cost drivers").font = F_B
hdr(asm, r + 1, ["Driver", "Value", "Unit", "Note"], [26, 12, 10, 78])
for i, (key, label, value, unit, note) in enumerate(SCALARS):
    rr = SCALAR_ROW0 + i
    asm.cell(row=rr, column=1, value=label).font = F
    c = asm.cell(row=rr, column=2, value=value)
    c.font = F_IN
    c.fill = FILL_LT
    c.border = BOX
    c.alignment = Alignment(horizontal="right")
    c.number_format = ('"$"#,##0.00' if unit in ("$", "$/m2")
                        else "0.00000" if unit == "m2"
                        else "0.000" if unit == "kg"
                        else ("0.0%" if value < 1 else "0.00"))
    asm.cell(row=rr, column=3, value=unit).font = F_NOTE
    n = asm.cell(row=rr, column=4, value=note)
    n.font = F_NOTE
    n.alignment = Alignment(wrap_text=True, vertical="top")
    asm.row_dimensions[rr].height = 14

SC = {}
for i, (key, label, value, unit, note) in enumerate(SCALARS):
    name = "s_" + key
    SC[name] = f"Assumptions!$B${SCALAR_ROW0 + i}"
    wb.defined_names.add(DefinedName(name, attr_text=SC[name]))

r = SCALAR_ROW0 + len(SCALARS) + 1
asm.cell(row=r, column=1,
         value="Unit price curves (material + print + trim, before VDP)").font = F_B
r += 1
CURVE_REF = {}
for name, (xs, ys) in CURVES.items():
    asm.cell(row=r, column=1, value=name).font = F_B
    hdr(asm, r + 1, ["Qty", "$/unit"], None, start=2, height=18)
    for j, (x, y) in enumerate(zip(xs, ys)):
        rr = r + 2 + j
        cx = asm.cell(row=rr, column=2, value=x)
        cx.font = F_IN
        cx.border = BOX
        cx.number_format = "#,##0"
        cy = asm.cell(row=rr, column=3, value=round(y, 4))
        cy.font = F_IN
        cy.border = BOX
        cy.number_format = '"$"0.0000'
    last = r + 1 + len(xs)
    CURVE_REF[name] = (f"Assumptions!$B${r + 2}:$B${last}",
                       f"Assumptions!$C${r + 2}:$C${last}")
    r = last + 2
asm.freeze_panes = "A5"


def interp(name, qref):
    """Piecewise-linear unit price over a sourced curve, flat at both ends."""
    xr, yr = CURVE_REF[name]
    m = f"MATCH({qref},{xr},1)"
    return (f"IF({qref}<=INDEX({xr},1),INDEX({yr},1),"
            f"IF({qref}>=INDEX({xr},COUNT({xr})),INDEX({yr},COUNT({yr})),"
            f"INDEX({yr},{m})+({qref}-INDEX({xr},{m}))*"
            f"(INDEX({yr},{m}+1)-INDEX({yr},{m}))/"
            f"(INDEX({xr},{m}+1)-INDEX({xr},{m}))))")


# ===========================================================================
# Cost Model - one short formula per build-up row
# ===========================================================================
cm = wb.create_sheet("Cost Model")
cm.sheet_properties.tabColor = SLATE
title_block(cm, "Landed cost model",
            "Per-unit USD. One short formula per row - change a driver on the "
            "Assumptions sheet and every number here moves.", 12)

NQC = len(QUANTITIES)
LASTQ = get_column_letter(1 + NQC)          # last quantity column
r = 4
hdr(cm, r, ["SKU / route / step"] + [""] * NQC + ["", "Notes"],
    [30] + [11] * NQC + [2, 54])
for j, q in enumerate(QUANTITIES):
    hc = cm.cell(row=r, column=2 + j, value=q)
    hc.number_format = "#,##0"

# row registry: (sku, route, step) -> row
ROWS = {}
row = r + 1
for sku in ("A5", "A4"):
    area = SC["s_AreaA5"] if sku == "A5" else SC["s_AreaA4"]
    wt = SC["s_WeightA5"] if sku == "A5" else SC["s_WeightA4"]
    pack = SC["s_PackA5"] if sku == "A5" else SC["s_PackA4"]
    for route, fr, vdp, curve in (
            ("Regional", SC["s_FreightRegional"], SC["s_VDPRegional"],
             f"{sku}_reg"),
            ("Factory", SC["s_FreightFactory"], SC["s_VDPFactory"],
             f"{sku}_fac")):
        r_unit = row
        r_print = row + 1
        r_lam = row + 2
        r_goods = row + 3
        r_duty = row + 4
        r_sub = row + 5
        r_waste = row + 6
        r_landed = row + 7
        r_final = row + 8

        for j in range(NQC):
            c = get_column_letter(2 + j)
            q = f"{c}${r}"
            u = f"{c}{r_unit}"
            p = f"{c}{r_print}"
            l = f"{c}{r_lam}"
            g = f"{c}{r_goods}"
            du = f"{c}{r_duty}"
            la = f"{c}{r_sub}"
            wa = f"{c}{r_waste}"
            lb = f"{c}{r_landed}"
            vals = {
                r_unit: f"={interp(curve, q)}",
                r_print: f"={u}*(1+{vdp})",
                r_lam: f"={SC['s_Laminate']}*{area}",
                r_goods: f"={p}+{l}",
                r_duty: f"={g}*{SC['s_Duty']}",
                r_sub: f"={g}+{pack}+{fr}*{wt}+{du}",
                r_waste: f"={la}*{SC['s_Wastage']}",
                r_landed: f"={la}+{wa}",
                r_final: f"={lb}+{SC['s_Setup']}/{q}",
            }
            for rr, formula in vals.items():
                cell = cm.cell(row=rr, column=2 + j, value=formula)
                cell.font = F_CALC
                cell.border = BOX
                cell.number_format = '"$"0.000'
                if rr == r_final:
                    cell.fill = FILL_LT
                    cell.font = F_B

        labels = ["unit print", "print + VDP", "laminate", "goods", "duty",
                  "subtotal", "wastage", "LANDED", "LANDED + setup"]
        for k, rr in enumerate((r_unit, r_print, r_lam, r_goods, r_duty, r_sub,
                                r_waste, r_landed, r_final)):
            cm.cell(row=rr, column=1, value=f"{sku} · {route} · {labels[k]}").font = F_B
            cm.cell(row=rr, column=1).border = BOX
            if rr == r_final:
                cm.cell(row=rr, column=1).fill = FILL_LT
        ROWS[(sku, route, "final")] = r_final
        ROWS[(sku, route, "unit")] = r_unit
        ROWS[(sku, route, "print")] = r_print
        ROWS[(sku, route, "lam")] = r_lam
        ROWS[(sku, route, "goods")] = r_goods
        ROWS[(sku, route, "duty")] = r_duty
        ROWS[(sku, route, "landed")] = r_landed
        ROWS[(sku, route, "subtotal")] = r_sub
        ROWS[(sku, route, "waste")] = r_waste
        row += 9

# best route per SKU - two bases: landed (before setup) and fully loaded
BEST, BEST_FULL = {}, {}
for sku in ("A5", "A4"):
    for tag, step, label, fill in (
            ("", "landed", f"{sku} · BEST ROUTE (landed)", FILL_LT),
            ("_FULL", "final", f"{sku} · BEST ROUTE (landed + setup)", FILL_ACC)):
        cm.cell(row=row, column=1, value=label).font = F_B
        cm.cell(row=row, column=1).fill = fill
        cm.cell(row=row, column=1).border = BOX
        for j in range(NQC):
            c = get_column_letter(2 + j)
            reg = ROWS[(sku, "Regional", step)]
            fac = ROWS[(sku, "Factory", step)]
            cell = cm.cell(row=row, column=2 + j,
                            value=f"=IF({c}$4>={SC['s_FactoryMOQ']},"
                                  f"MIN({c}{reg},{c}{fac}),{c}{reg})")
            cell.font = F_B
            cell.border = BOX
            cell.number_format = '"$"0.000'
            cell.fill = fill
        if tag:
            BEST_FULL[sku] = row
        else:
            BEST[sku] = row
        row += 1

cm.freeze_panes = "B5"

# ===========================================================================
# Price List
# ===========================================================================
pl = wb.create_sheet("Price List")
pl.sheet_properties.tabColor = GOLD
title_block(pl, "Price list",
            "Physical: discount follows ORDER SIZE. Subscription: follows COMPANY "
            "SIZE. The two ladders never reference each other.", 12)

r = 4
hdr(pl, r, ["Band", "Units/order", "A5 price", "A5 landed", "A5 GM",
            "A4 price", "A4 landed", "A4 GM", "Kit price", "Kit GM",
            "Subscription", "Platform per vehicle / yr"],
    [13, 12, 11, 11, 9, 11, 11, 9, 11, 9, 13, 15])
r += 1
BAND_ROW0 = r
for name, minq, a5p, a4p, kitp in BANDS:
    pl.cell(row=r, column=1, value=name).font = F_B
    pl.cell(row=r, column=2, value=minq).font = F_IN
    pl.cell(row=r, column=3, value=a5p).font = F_IN
    pl.cell(row=r, column=6, value=a4p).font = F_IN
    pl.cell(row=r, column=9, value=kitp).font = F_IN
    pl.cell(row=r, column=11, value=PLATFORM_FEE[name]).font = F_IN
    qcol = get_column_letter(2 + QUANTITIES.index(minq))
    pl.cell(row=r, column=4, value=f"='Cost Model'!{qcol}{BEST['A5']}").font = F_CALC
    pl.cell(row=r, column=5, value=f"=(C{r}-D{r})/C{r}").font = F_CALC
    pl.cell(row=r, column=7, value=f"='Cost Model'!{qcol}{BEST['A4']}").font = F_CALC
    pl.cell(row=r, column=8, value=f"=(F{r}-G{r})/F{r}").font = F_CALC
    pl.cell(row=r, column=10, value=f"=(I{r}-D{r}-G{r})/I{r}").font = F_CALC
    pl.cell(row=r, column=12, value=f"=IF(B{r}=0,0,K{r}*12/B{r})").font = F_CALC
    for c in range(1, 13):
        cell = pl.cell(row=r, column=c)
        cell.border = BOX
        if c in (3, 4, 6, 7, 9, 11, 12):
            cell.number_format = '"$"#,##0.00'
        elif c in (5, 8, 10):
            cell.number_format = "0.0%"
        elif c == 2:
            cell.number_format = "#,##0"
    r += 1

r += 1
pl.cell(row=r, column=1,
        value="Net margin after payment fee and FX buffer").font = F_B
pl.cell(row=r, column=1).fill = FILL_ACC
r += 1
hdr(pl, r, ["Band", "A5 net GM", "A4 net GM", "Kit net GM"], [13, 12, 12, 12])
r += 1
for i in range(len(BANDS)):
    src = BAND_ROW0 + i
    pl.cell(row=r, column=1, value=f"=A{src}").font = F_CALC
    pl.cell(row=r, column=2,
            value=f"=E{src}-{SC['s_PaymentFee']}-{SC['s_FX']}").font = F_CALC
    pl.cell(row=r, column=3,
            value=f"=H{src}-{SC['s_PaymentFee']}-{SC['s_FX']}").font = F_CALC
    pl.cell(row=r, column=4,
            value=f"=J{src}-{SC['s_PaymentFee']}-{SC['s_FX']}").font = F_CALC
    for c in range(1, 5):
        pl.cell(row=r, column=c).border = BOX
        if c > 1:
            pl.cell(row=r, column=c).number_format = "0.0%"
    r += 1
r += 1
pl.cell(row=r, column=1,
        value="Fully loaded - the same margin with the $45 print-job setup amortised "
              "over that order. A one-off order carries the whole setup; a pooled "
              "production run spreads it.").font = F_B
pl.cell(row=r, column=1).fill = FILL_ACC
r += 1
hdr(pl, r, ["Band", "A5 fully loaded", "A5 GM", "A4 fully loaded", "A4 GM"],
    [13, 13, 11, 13, 11])
r += 1
for i, (name, minq, a5p, a4p, kitp) in enumerate(BANDS):
    src = BAND_ROW0 + i
    qcol = get_column_letter(2 + QUANTITIES.index(minq))
    pl.cell(row=r, column=1, value=f"=A{src}").font = F_CALC
    pl.cell(row=r, column=2,
            value=f"='Cost Model'!{qcol}{BEST_FULL['A5']}").font = F_CALC
    pl.cell(row=r, column=3, value=f"=(C{src}-B{r})/C{src}").font = F_CALC
    pl.cell(row=r, column=4,
            value=f"='Cost Model'!{qcol}{BEST_FULL['A4']}").font = F_CALC
    pl.cell(row=r, column=5, value=f"=(F{src}-D{r})/F{src}").font = F_CALC
    for c in range(1, 6):
        pl.cell(row=r, column=c).border = BOX
        if c in (2, 4):
            pl.cell(row=r, column=c).number_format = '"$"#,##0.00'
        elif c in (3, 5):
            pl.cell(row=r, column=c).number_format = "0.0%"
    r += 1

r += 1
pl.cell(row=r, column=1,
        value="Assumption: duty and tax are modelled at 10%. Confirm the HS code and "
              "the real rate - it is the single biggest lever in this model."
        ).font = F_NOTE

# ===========================================================================
# Dealer Economics
# ===========================================================================
de = wb.create_sheet("Dealer Economics")
de.sheet_properties.tabColor = SLATE
title_block(de, "Dealer economics",
            "One dealer, one year, A5 stickers at the band's price.", 9)

r = 4
hdr(de, r, ["Vehicles", "Band", "Price / sticker", "Goods revenue", "Goods cost",
            "Platform", "Total revenue", "Total GM", "All-in per vehicle / yr"],
    [11, 13, 14, 15, 13, 11, 14, 11, 17])
r += 1
for veh in (20, 40, 80, 150, 300):
    de.cell(row=r, column=1, value=veh).font = F_IN
    de.cell(row=r, column=2,
            value=f"=LOOKUP(A{r},'Price List'!$B${BAND_ROW0}:$B${BAND_ROW0 + len(BANDS) - 1},"
                  f"'Price List'!$A${BAND_ROW0}:$A${BAND_ROW0 + len(BANDS) - 1})"
            ).font = F_CALC
    de.cell(row=r, column=3,
            value=f"=INDEX('Price List'!$C${BAND_ROW0}:$C${BAND_ROW0 + len(BANDS) - 1},"
                  f"MATCH(B{r},'Price List'!$A${BAND_ROW0}:$A${BAND_ROW0 + len(BANDS) - 1},0))"
            ).font = F_CALC
    de.cell(row=r, column=4, value=f"=A{r}*C{r}").font = F_CALC
    de.cell(row=r, column=5,
            value=f"=A{r}*INDEX('Cost Model'!$B${BEST['A5']}:${LASTQ}${BEST['A5']},"
                  f"MATCH(A{r},'Cost Model'!$B$4:${LASTQ}$4,1))").font = F_CALC
    de.cell(row=r, column=6,
            value=f"=INDEX('Price List'!$K${BAND_ROW0}:$K${BAND_ROW0 + len(BANDS) - 1},"
                  f"MATCH(B{r},'Price List'!$A${BAND_ROW0}:$A${BAND_ROW0 + len(BANDS) - 1},0))"
            ).font = F_CALC
    de.cell(row=r, column=7, value=f"=D{r}+F{r}").font = F_CALC
    de.cell(row=r, column=8, value=f"=(G{r}-E{r})/G{r}").font = F_CALC
    de.cell(row=r, column=9, value=f"=(C{r}+F{r}*12/A{r})").font = F_CALC
    for c in range(1, 10):
        cell = de.cell(row=r, column=c)
        cell.border = BOX
        if c in (3, 4, 5, 6, 7, 9):
            cell.number_format = '"$"#,##0.00'
        elif c == 8:
            cell.number_format = "0.0%"
        elif c == 1:
            cell.number_format = "#,##0"
    r += 1
de.freeze_panes = "A5"

# ===========================================================================
# Scenarios - one row per band x scenario
# ===========================================================================
sc = wb.create_sheet("Scenarios")
sc.sheet_properties.tabColor = GREY
title_block(sc, "Sensitivity",
            "How the margin moves if the cost drivers move. Landed cost excludes the "
            "print-job setup, so it is directly comparable with the price list.", 9)

r = 4
sc.cell(row=r, column=1, value="Scenario multipliers (print, laminate, freight, duty)"
        ).font = F_B
r += 1
hdr(sc, r, ["Scenario", "Print", "Laminate", "Freight", "Duty"],
    [16, 11, 11, 11, 11])
r += 1
SCEN = [("LOW", 0.85, 0.85, 0.85, 0.70), ("MID", 1.00, 1.00, 1.00, 1.00),
        ("HIGH", 1.25, 1.15, 1.40, 1.80)]
SCEN_ROW = {}
for name, a, b, c, d in SCEN:
    sc.cell(row=r, column=1, value=name).font = F_B
    for j, v in enumerate((a, b, c, d)):
        cell = sc.cell(row=r, column=2 + j, value=v)
        cell.font = F_IN
        cell.border = BOX
        cell.number_format = "0.00"
    sc.cell(row=r, column=1).border = BOX
    SCEN_ROW[name] = r
    r += 1

r += 1
sc.cell(row=r, column=1, value="Margin at each band under each scenario").font = F_B
r += 1
hdr(sc, r, ["Band", "Scenario", "A5 regional landed", "A5 factory landed",
             "A4 regional landed", "A4 factory landed", "A5 GM", "A4 GM"],
    [13, 10, 13, 13, 13, 13, 10, 10])
r += 1
for i, (name, minq, a5p, a4p, kitp) in enumerate(BANDS):
    src = BAND_ROW0 + i
    qcol = get_column_letter(2 + QUANTITIES.index(minq))
    for sname in ("LOW", "MID", "HIGH"):
        srow = SCEN_ROW[sname]
        sc.cell(row=r, column=1, value=f"='Price List'!A{src}").font = F_CALC
        sc.cell(row=r, column=2, value=sname).font = F_B
        for k, (sku, route) in enumerate((("A5", "Regional"), ("A5", "Factory"),
                                          ("A4", "Regional"), ("A4", "Factory"))):
            area = SC["s_AreaA5"] if sku == "A5" else SC["s_AreaA4"]
            wt = SC["s_WeightA5"] if sku == "A5" else SC["s_WeightA4"]
            pack = SC["s_PackA5"] if sku == "A5" else SC["s_PackA4"]
            fr = (SC["s_FreightRegional"] if route == "Regional"
                  else SC["s_FreightFactory"])
            vdp = (SC["s_VDPRegional"] if route == "Regional"
                   else SC["s_VDPFactory"])
            pr = f"'Cost Model'!{qcol}{ROWS[(sku, route, 'print')]}"
            lm = f"'Cost Model'!{qcol}{ROWS[(sku, route, 'lam')]}"
            gd = f"'Cost Model'!{qcol}{ROWS[(sku, route, 'goods')]}"
            # duty applies to the scenario-adjusted goods, not the mid-case goods
            goods_s = f"({pr}*B{srow}+{lm}*C{srow})"
            landed = (f"({goods_s}+{pack}+{fr}*{wt}*D{srow}"
                      f"+{goods_s}*{SC['s_Duty']}*E{srow})*(1+{SC['s_Wastage']})")
            cell = sc.cell(row=r, column=3 + k, value=f"={landed}")
            cell.font = F_CALC
            cell.border = BOX
            cell.number_format = '"$"0.000'
        for sku, base in (("A5", 3), ("A4", 5)):
            price = f"'Price List'!{'C' if sku == 'A5' else 'F'}{src}"
            cl = get_column_letter(base)
            fl = get_column_letter(base + 1)
            reg = f"{cl}{r}"
            fac = f"{fl}{r}"
            col = 7 if sku == "A5" else 8
            cell = sc.cell(row=r, column=col,
                            value=f"=({price}-IF('Cost Model'!{qcol}$4>={SC['s_FactoryMOQ']},"
                                  f"MIN({reg},{fac}),{reg}))/{price}")
            cell.font = F_B
            cell.border = BOX
            cell.number_format = "0.0%"
        for c in (1, 2):
            sc.cell(row=r, column=c).border = BOX
        r += 1
sc.freeze_panes = "C12"

wb.save("/workspace/car-qr-showcase/pricing/Vehicle-Pricing-Model.xlsx")
print("saved Vehicle-Pricing-Model.xlsx")
