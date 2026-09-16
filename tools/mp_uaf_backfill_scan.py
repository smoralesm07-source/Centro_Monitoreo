#!/usr/bin/env python3
import csv
import io
import json
import tempfile
import urllib.request
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

TARGET_OCDS_CODE = "3299"
TARGET_RUT = "619730003"
TARGET_TENDER_PREFIX = "2305-"
OUT = Path("mercado-publico-pilot/data/uaf-licitaciones-2023-current.json")
SOURCES = [(year, semester, f"https://transparenciachc.blob.core.windows.net/lic-da/{year}-{semester}.zip") for year in range(2023, 2027) for semester in (1, 2)]


def clean_rut(value):
    return "".join(c for c in (value or "").upper() if c.isdigit() or c == "K")


def is_uaf(row):
    code = (row.get("CodigoExterno") or "").strip().upper()
    org = (row.get("CodigoOrganismo") or "").strip()
    unit_rut = clean_rut(row.get("RutUnidad"))
    return org == TARGET_OCDS_CODE or unit_rut == TARGET_RUT or code.startswith(TARGET_TENDER_PREFIX)


def process_source(year, semester, url, tenders, source_stats, observed_orgs):
    print(f"Downloading {year}-{semester}: {url}", flush=True)
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        urllib.request.urlretrieve(url, tmp_path)
        with zipfile.ZipFile(tmp_path) as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            if not names:
                raise RuntimeError(f"No CSV in {url}")
            name = names[0]
            info = zf.getinfo(name)
            matched_rows = 0
            total_rows = 0
            with zf.open(name, "r") as raw:
                text = io.TextIOWrapper(raw, encoding="cp1252", errors="replace", newline="")
                reader = csv.DictReader(text, delimiter=";")
                for row in reader:
                    total_rows += 1
                    if not is_uaf(row):
                        continue
                    matched_rows += 1
                    code = (row.get("CodigoExterno") or "").strip()
                    if not code:
                        continue
                    org_code = (row.get("CodigoOrganismo") or "").strip()
                    org_name = (row.get("NombreOrganismo") or "").strip()
                    observed_orgs[(org_code, org_name)] += 1
                    t = tenders.setdefault(code, {
                        "code": code,
                        "title": row.get("Nombre") or "",
                        "description": row.get("Descripcion") or "",
                        "status": row.get("Estado") or "",
                        "status_code": row.get("CodigoEstado") or "",
                        "buyer_code_bulk": org_code,
                        "buyer_name": org_name or "UNIDAD DE ANALISIS FINANCIERO",
                        "unit_code": row.get("CodigoUnidad") or "",
                        "unit_name": row.get("NombreUnidad") or "",
                        "unit_rut": row.get("RutUnidad") or "",
                        "unit_region": row.get("RegionUnidad") or "",
                        "publication_date": row.get("FechaPublicacion") or "",
                        "close_date": row.get("FechaCierre") or "",
                        "creation_date": row.get("FechaCreacion") or "",
                        "award_date": row.get("FechaAdjudicacion") or "",
                        "procurement_type": row.get("Tipo de Adquisicion") or "",
                        "source_periods": set(),
                        "items": {},
                        "suppliers": {},
                        "row_count": 0,
                    })
                    t["source_periods"].add(f"{year}-{semester}")
                    t["row_count"] += 1
                    item_code = (row.get("CodigoProductoONU") or "").strip()
                    item_name = (row.get("Nombre linea Adquisicion") or row.get("Nombre producto genrico") or "").strip()
                    if item_code or item_name:
                        ikey = item_code or item_name.lower()
                        item = t["items"].setdefault(ikey, {"product_code": item_code, "description": item_name, "row_count": 0})
                        item["row_count"] += 1
                    rut = clean_rut(row.get("RutProveedor"))
                    name_p = (row.get("RazonSocialProveedor") or row.get("NombreProveedor") or "").strip()
                    selected = (row.get("Oferta seleccionada") or "").strip().lower() == "seleccionada"
                    if rut or name_p:
                        pkey = rut or name_p.lower()
                        supplier = t["suppliers"].setdefault(pkey, {"rut_norm": rut, "name": name_p, "selected": False, "offer_rows": 0})
                        supplier["offer_rows"] += 1
                        supplier["selected"] = supplier["selected"] or selected
                        if not supplier["name"] and name_p:
                            supplier["name"] = name_p
            source_stats.append({
                "year": year,
                "semester": semester,
                "url": url,
                "zip_bytes": tmp_path.stat().st_size,
                "csv_name": name,
                "csv_uncompressed_bytes": info.file_size,
                "rows_seen": total_rows,
                "matched_rows": matched_rows,
            })
            print(f"{year}-{semester}: {matched_rows} UAF rows, {len(tenders)} unique tenders accumulated", flush=True)
    finally:
        tmp_path.unlink(missing_ok=True)


def serialise(tenders):
    out = []
    for t in tenders.values():
        x = dict(t)
        x["source_periods"] = sorted(x["source_periods"])
        x["items"] = sorted(x["items"].values(), key=lambda z: (z.get("product_code") or "", z.get("description") or ""))
        x["suppliers"] = sorted(x["suppliers"].values(), key=lambda z: (not z.get("selected", False), z.get("name") or "", z.get("rut_norm") or ""))
        out.append(x)
    out.sort(key=lambda x: (x.get("publication_date") or "", x["code"]), reverse=True)
    return out


def main():
    tenders = {}
    stats = []
    observed_orgs = Counter()
    for year, semester, url in SOURCES:
        process_source(year, semester, url, tenders, stats, observed_orgs)
    rows = serialise(tenders)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scope": "2023-current bulk semester files",
        "identity_rules": {
            "ocds_buyer_code": TARGET_OCDS_CODE,
            "unit_rut_norm": TARGET_RUT,
            "tender_prefix": TARGET_TENDER_PREFIX,
        },
        "buyer_name": "UNIDAD DE ANALISIS FINANCIERO",
        "source_count": len(stats),
        "tender_count": len(rows),
        "observed_organism_codes": [
            {"code": code, "name": name, "matched_rows": count}
            for (code, name), count in observed_orgs.most_common()
        ],
        "source_stats": stats,
        "tenders": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} unique tenders to {OUT}")


if __name__ == "__main__":
    main()
