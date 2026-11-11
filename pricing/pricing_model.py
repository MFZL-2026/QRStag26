#!/usr/bin/env python3
"""
Car QR Showcase - landed cost + price model.  (v2)

Single source of truth for the pricing strategy. The PDF document and the XLSX
model are both generated from the numbers produced here.

Every figure is either (a) a sourced market price with the source noted, or
(b) an explicit modelling assumption, flagged ASSUMPTION.

Cost scenarios: LOW / MID / HIGH so the price list is stress-tested, not guessed.

Run:  python3 pricing_model.py
"""

# ---------------------------------------------------------------------------
# SOURCED INPUTS
# ---------------------------------------------------------------------------

# Factory-direct (China) unit price: full colour, gloss, kiss-cut + trimming
# INCLUDED. Source: e-print price list (HK$), converted at 7.8 HKD/USD.
FACTORY_HKD_PER_EA = {
    "A5": {100: 2.090, 200: 1.505, 300: 1.503, 500: 1.200, 1000: 0.932,
           2000: 0.815, 3000: 0.697, 5000: 0.603, 10000: 0.510},
    "A4": {100: 3.010, 200: 2.330, 300: 2.330, 500: 2.240, 1000: 1.630,
           2000: 1.270, 3000: 1.052, 5000: 1.020, 10000: 0.997},
}
HKD_USD = 7.8

# Regional print shop (UAE / Turkey via Erbil), digital, laminated vinyl, TRIMMED
# (not die-cut). Anchors:
#   Premium Prints UAE - die-cut A4 sheet, white vinyl + gloss lam: AED 12-22
#   printonline.ae    - large-format vinyl 1 m2 = AED 110; digital A4 colour
#                       sheet AED 0.50-2 walk-in, AED 1-5 online
# A5 modelled as a trimmed half-sheet. MID values below.
REGIONAL_USD_PER_EA = {
    "A5": {25: 1.55, 100: 1.30, 250: 1.12, 500: 1.00, 1000: 0.92},
    "A4": {25: 3.10, 100: 2.60, 250: 2.25, 500: 2.00, 1000: 1.85},
}
# Optional die-cut / contour-cut upgrade (premium tier)
DIECUT_PREMIUM = {"A5": 0.80, "A4": 1.60}

# Outdoor protective overlaminate, polymeric, UV + scratch + weather.
# Source: Wielka Reklama - polymeric laminate approx EUR 8 net / m2.
# EUR/USD 1.09 -> $8.72 / m2.  A5 = 0.03108 m2, A4 = 0.06237 m2.
LAMINATE_USD_PER_M2 = 8.72
AREA_M2 = {"A5": 0.03108, "A4": 0.06237}

# Freight to Iraq, door-to-door DDP. Source: 2026 China->Iraq rate guides.
# Sea LCL $0.30-0.95/kg equiv; air freight $3-8/kg; express courier $5.50-15/kg.
FREIGHT_USD_PER_KG = {"regional": 8.0, "factory": 4.0}   # MID
UNIT_WEIGHT_KG = {"A5": 0.005, "A4": 0.008}
PACKAGING_USD = {"A5": 0.03, "A4": 0.08}

# Variable-data printing premium (each sticker carries a unique QR).
# ASSUMPTION - confirm with the printer. Typical VDP uplift is 10-25%.
VDP_PREMIUM = {"regional": 0.10, "factory": 0.15}

# ---------------------------------------------------------------------------
# ASSUMPTIONS - owner must confirm
# ---------------------------------------------------------------------------
DUTY_BUFFER = 0.10    # Iraq 2026: new ASYCUDA tariff 0.5-30% by category + VAT ~5%.
                       # 10% = conservative mid. CONFIRM HS CODE + RATE WITH THE BROKER.
WASTAGE = 0.03         # spoilage, misprints, trim waste, spares
PAYMENT_FEE = 0.03    # blended card/wallet/transfer (FIB 1-5%, ZainCash 1%+$0.15,
                       # COD higher). ASSUMPTION.
FX_BUFFER = 0.02       # IQD/USD + supplier currency movement
SETUP_USD = 45.0       # prepress + plates/DRS + proofing per print job

# Cost scenario multipliers applied to the print + laminate lines only.
SCENARIOS = {
    "LOW":  {"print": 0.85, "lam": 0.85, "freight": 0.85, "duty": 0.70},
    "MID":  {"print": 1.00, "lam": 1.00, "freight": 1.00, "duty": 1.00},
    "HIGH": {"print": 1.25, "lam": 1.15, "freight": 1.40, "duty": 1.80},
}

# ---------------------------------------------------------------------------
# COST ENGINE
# ---------------------------------------------------------------------------

def _interp(curve: dict, qty: int) -> float:
    qs = sorted(curve)
    if qty <= qs[0]:
        return curve[qs[0]]
    if qty >= qs[-1]:
        return curve[qs[-1]]
    for lo, hi in zip(qs, qs[1:]):
        if lo <= qty <= hi:
            span = hi - lo
            t = 0 if span == 0 else (qty - lo) / span
            return curve[lo] + t * (curve[hi] - curve[lo])
    return curve[qs[-1]]


def unit_print(size: str, qty: int, route: str) -> float:
    if route == "factory":
        raw = {k: v / HKD_USD for k, v in FACTORY_HKD_PER_EA[size].items()}
        base = _interp(raw, qty)
    else:
        base = _interp(REGIONAL_USD_PER_EA[size], qty)
    return base * (1 + VDP_PREMIUM[route])


def landed_cost(size: str, qty: int, route: str, scenario: str = "MID",
                diecut: bool = False) -> dict:
    sc = SCENARIOS[scenario]
    print_ = unit_print(size, qty, route) * sc["print"]
    lam = LAMINATE_USD_PER_M2 * AREA_M2[size] * sc["lam"]
    pack = PACKAGING_USD[size]
    freight = FREIGHT_USD_PER_KG[route] * UNIT_WEIGHT_KG[size] * sc["freight"]
    duty = (print_ + lam) * DUTY_BUFFER * sc["duty"]
    subtotal = print_ + lam + pack + freight + duty
    waste = subtotal * WASTAGE
    total = subtotal + waste
    if diecut:
        total += DIECUT_PREMIUM[size]
    return {
        "route": route, "scenario": scenario, "qty": qty,
        "print": print_, "laminate": lam, "packaging": pack,
        "freight": freight, "duty": duty, "wastage": waste,
        "setup_unit": SETUP_USD / qty,
        "landed": total,
    }


FACTORY_MOQ = 250


def best_route(size: str, qty: int, scenario: str = "MID") -> dict:
    f = landed_cost(size, qty, "factory", scenario)
    r = landed_cost(size, qty, "regional", scenario)
    if qty >= FACTORY_MOQ and f["landed"] < r["landed"]:
        return f
    return r


# ---------------------------------------------------------------------------
# PRICE ARCHITECTURE
# ---------------------------------------------------------------------------
# Channel, min units, A5 price, A4 price, Display Kit (1xA5 + 1xA4).
# List price (Individual, single unit) - the anchor the published discount is quoted from
LIST = {"A5": 9.00, "A4": 14.00}

CHANNELS = [
    ("Individual",  1,   9.00, 15.00, 22.00),
    ("Showroom",   25,   7.00, 11.50, 17.00),
    ("Dealer",    100,   5.75,  9.25, 13.75),
    ("Dealer+",   250,   4.75,  7.50, 11.50),
    ("Partner",   500,   4.00,  6.50,  9.75),
]
# Platform subscription, aligned to the tier
PLATFORM_FEE = {"Individual": 0, "Showroom": 29, "Dealer": 99, "Dealer+": 149, "Partner": 299}


def main() -> None:
    print("=" * 80)
    print("CAR QR SHOWCASE - LANDED COST + PRICE MODEL (v2)")
    print("=" * 80)

    print("\n### 1. LANDED COST BUILD-UP (per unit, USD, MID scenario)\n")
    for size in ("A5", "A4"):
        for route in ("regional", "factory"):
            qty = 25 if route == "regional" else 500
            c = landed_cost(size, qty, route)
            print(f"{size}  {route:8} @ {qty:>4} units")
            print(f"    print + material + trim + VDP   {c['print']:>7.3f}")
            print(f"    outdoor overlaminate            {c['laminate']:>7.3f}")
            print(f"    packaging                       {c['packaging']:>7.3f}")
            print(f"    freight (DDP)                   {c['freight']:>7.3f}")
            print(f"    duty + tax buffer ({DUTY_BUFFER:.0%})       {c['duty']:>7.3f}")
            print(f"    wastage ({WASTAGE:.0%})                    {c['wastage']:>7.3f}")
            print(f"    print-job setup (amortised)      {c['setup_unit']:>7.3f}")
            print(f"    LANDED + SETUP                  {c['landed'] + c['setup_unit']:>7.3f}")
            print()

    print("\n### 2. THE ROUTE CLIFF - the single most important number\n")
    print(f"{'qty':>6} | {'A5 regional':>12} {'A5 factory':>11} {'best A5':>9}"
          f" | {'A4 regional':>12} {'A4 factory':>11} {'best A4':>9}")
    for qty in (25, 100, 200, 249, 250, 500, 1000, 5000):
        r5 = landed_cost("A5", qty, "regional")
        f5 = landed_cost("A5", qty, "factory")
        r4 = landed_cost("A4", qty, "regional")
        f4 = landed_cost("A4", qty, "factory")
        b5 = "factory" if (qty >= FACTORY_MOQ and f5["landed"] < r5["landed"]) else "regional"
        b4 = "factory" if (qty >= FACTORY_MOQ and f4["landed"] < r4["landed"]) else "regional"
        print(f"{qty:>6} | {r5['landed']:>12.3f} {f5['landed']:>11.3f} {b5:>9}"
              f" | {r4['landed']:>12.3f} {f4['landed']:>11.3f} {b4:>9}")

    print("\n### 3. MARGIN AT THE PROPOSED PRICE LIST\n")
    print(f"{'channel':<11} {'qty':>5} {'A5 $':>7} {'A5 cost':>9} {'GM%':>6}"
          f" | {'A4 $':>7} {'A4 cost':>9} {'GM%':>6} | {'kit GM%':>8}")
    rows = []
    for name, minq, a5p, a4p, kit in CHANNELS:
        c5 = best_route("A5", minq)
        c4 = best_route("A4", minq)
        g5 = (a5p - c5["landed"]) / a5p
        g4 = (a4p - c4["landed"]) / a4p
        kc = c5["landed"] + c4["landed"]
        gk = (kit - kc) / kit
        rows.append((name, minq, a5p, c5["landed"], g5, a4p, c4["landed"], g4, kit, gk))
        print(f"{name:<11} {minq:>5} {a5p:>7.2f} {c5['landed']:>9.3f} {g5:>6.0%}"
              f" | {a4p:>7.2f} {c4['landed']:>9.3f} {g4:>6.0%} | {gk:>8.0%}")

    print("\n### 4. STRESS TEST - margin under the HIGH cost scenario\n")
    print(f"{'channel':<11} {'A5 GM mid':>10} {'A5 GM high':>11}"
          f" | {'A4 GM mid':>10} {'A4 GM high':>11}")
    for name, minq, a5p, a4p, kit in CHANNELS:
        m5 = (a5p - best_route("A5", minq, "MID")["landed"]) / a5p
        h5 = (a5p - best_route("A5", minq, "HIGH")["landed"]) / a5p
        m4 = (a4p - best_route("A4", minq, "MID")["landed"]) / a4p
        h4 = (a4p - best_route("A4", minq, "HIGH")["landed"]) / a4p
        print(f"{name:<11} {m5:>10.0%} {h5:>11.0%} | {m4:>10.0%} {h4:>11.0%}")

    print("\n### 5. BLENDED MARGIN INCLUDING PAYMENT FEES + FX\n")
    print(f"{'channel':<11} {'A5 net GM':>12} {'A4 net GM':>12}")
    for name, minq, a5p, a4p, kit in CHANNELS:
        n5 = (a5p - best_route("A5", minq)["landed"]) / a5p - PAYMENT_FEE - FX_BUFFER
        n4 = (a4p - best_route("A4", minq)["landed"]) / a4p - PAYMENT_FEE - FX_BUFFER
        print(f"{name:<11} {n5:>12.0%} {n4:>12.0%}")

    print("\n### 6. DEALER ECONOMICS (one dealer, one year)\n")
    print(f"{'vehicles':>9} {'tier':>10} {'goods rev':>11} {'goods cost':>12}"
          f" {'platform':>10} {'total rev':>11} {'total GM':>10}")
    for veh in (20, 40, 80, 150, 300):
        tier = max((c for c in CHANNELS if veh >= c[1]), key=lambda c: c[1])
        name, minq, a5p, a4p, kit = tier
        rev = veh * a5p
        cost = veh * best_route("A5", veh)["landed"]
        plat = PLATFORM_FEE[name]
        total = rev + plat
        print(f"{veh:>9} {name:>10} {rev:>11,.2f} {cost:>12,.2f} {plat:>10,.2f}"
              f" {total:>11,.2f} {(total - cost - plat) / total:>10.0%}")

    print("\n### 7. PRICE ELASTICITY / WHAT A DEALER PAYS PER VEHICLE\n")
    print(f"{'channel':<11} {'per vehicle (A5+A4 kit)':>24} {'platform/mo':>14}")
    for name, minq, a5p, a4p, kit in CHANNELS:
        print(f"{name:<11} {kit:>24.2f} {PLATFORM_FEE[name]:>14}")


if __name__ == "__main__":
    main()
