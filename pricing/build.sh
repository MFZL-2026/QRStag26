#!/usr/bin/env bash
# Rebuilds the Car QR Showcase pricing strategy PDF end to end.
#
#   ./build.sh
#
# Two passes: the first render establishes the real page numbers, which are
# fed back into the generator so the table of contents is accurate. The
# second render is the deliverable.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PDF_SKILL="/workspace/.skills/pdf"

# Chromium's default header template prints a date banner. Blank it and let
# the custom footer carry the document title and page number.
HEADER='<div></div>'
FOOTER='<div style="width:100%;font-size:7pt;color:#4E6E8E;padding:2mm 12mm 0;border-top:0.6pt solid #9FB3C8;font-family:Trebuchet MS,Calibri,Arial,sans-serif;"><span>Car QR Showcase &#183; Pricing Strategy &#183; 2026-11-11</span><span style="float:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'

cd "$HERE"

render() {
  bash "$PDF_SKILL/scripts/make.sh" render \
    --in "$HERE/pricing_doc.html" \
    --out "$HERE/Pricing-Strategy-2026.pdf" \
    --format A4 --margin "14mm 12mm" \
    --header "$HEADER" --footer "$FOOTER" --wait 3000
}

echo "-> pass 1: generating and rendering to resolve page numbers"
python3 build_pricing_doc.py > pricing_doc.html
render

echo "-> extracting real page numbers"
python3 - <<'PY'
from pypdf import PdfReader
import json
r = PdfReader('Pricing-Strategy-2026.pdf')
pages = {}
for name, d in r.named_destinations.items():
    key = name.lstrip('/')
    try:
        pages[key] = r.get_destination_page_number(d) + 1
    except Exception:
        pass
json.dump(pages, open('toc_pages.json', 'w'), indent=1)
print("   ", json.dumps(pages, sort_keys=True))
PY

echo "-> pass 2: regenerating with the corrected contents page"
python3 build_pricing_doc.py > pricing_doc.html
render

echo "-> done"
pdfinfo Pricing-Strategy-2026.pdf | grep -E "Pages|Page size"
