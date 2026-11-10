#!/usr/bin/env python3
"""
Applies a .sql file to the live Supabase project and then verifies the result.

    python3 run_sql_via_api.py <sbp_TOKEN> <sql_file> [verify_column ...]

The token is a Supabase personal access token (Dashboard > Account > Access Tokens).
It is read from argv, used in memory only, and never written to disk.

Exit codes: 0 = applied + verified, 1 = failed.
"""
import json
import sys
import urllib.error
import urllib.request

REF = "uifcfnkbccluhyryywxe"
API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

# Columns the spec migration is expected to create.
DEFAULT_VERIFY = [
    "body_type", "warranty_status", "warranty_details", "cylinders",
    "wheel_drive", "turbo", "camera_features", "wheel_size",
    "seat_material", "number_of_seats", "car_condition", "trim_level",
]


def query(token: str, sql: str) -> tuple:
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    token, path = sys.argv[1], sys.argv[2]
    verify = sys.argv[3:] or DEFAULT_VERIFY

    with open(path, encoding="utf-8") as fh:
        sql = fh.read()

    print(f"applying {path} ...")
    status, body = query(token, sql)
    print(f"  HTTP {status}")
    if body.strip():
        print("  " + body.strip()[:800])
    if status == 0 or not (200 <= status < 300):
        print("\nFAILED to apply.")
        return 1

    print("\nverifying columns ...")
    cols = ",".join("'" + c + "'" for c in verify)
    status, body = query(token, f"""
        SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema='public' AND table_name='cars'
           AND column_name IN ({cols})
         ORDER BY column_name;
    """)
    if not (200 <= status < 300):
        print(f"  verification query failed (HTTP {status}): {body[:400]}")
        return 1
    try:
        rows = json.loads(body)
    except Exception:
        print("  could not parse verification response:", body[:400])
        return 1

    if isinstance(rows, dict):
        rows = rows.get("data", rows.get("rows", []))
    rows = rows or []
    for r in rows:
        print(f"  ✅ {r.get('column_name'):<22} {r.get('data_type')}")
    missing = set(verify) - {r.get("column_name") for r in rows}
    if missing:
        print(f"\n  ❌ missing after apply: {sorted(missing)}")
        return 1
    print(f"\n✅ ALL {len(verify)} COLUMNS PRESENT — migration applied and verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
