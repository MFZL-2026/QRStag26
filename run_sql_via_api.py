#!/usr/bin/env python3
"""
Runs a .sql file against the live Supabase project via the Management API.

    python3 run_sql_via_api.py <sbp_TOKEN> <sql_file>

The token is a Supabase personal access token (Dashboard > Account > Access
Tokens). It is used once, in-memory, and never written to disk.

Endpoint:
    POST https://api.supabase.com/v1/projects/<ref>/database/query
    Authorization: Bearer <sbp_TOKEN>
    Content-Type: application/json
    Body: {"query": "<sql>"}
"""
import json
import sys
import urllib.error
import urllib.request

REF = "uifcfnkbccluhyryywxe"
API = f"https://api.supabase.com/v1/projects/{REF}/database/query"


def run(token: str, sql: str) -> tuple:
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
        with urllib.request.urlopen(req, timeout=90) as r:
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
    with open(path, encoding="utf-8") as fh:
        sql = fh.read()

    status, body = run(token, sql)
    print(f"HTTP {status}")
    if status == 0:
        print(body)
        return 1
    try:
        parsed = json.loads(body)
        print(json.dumps(parsed, indent=2)[:2000])
    except Exception:
        print(body[:2000])
    return 0 if 200 <= status < 300 else 1


if __name__ == "__main__":
    raise SystemExit(main())
