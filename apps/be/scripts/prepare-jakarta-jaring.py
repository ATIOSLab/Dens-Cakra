#!/usr/bin/env python3
"""Prepare the Jakarta Selatan Jaring Word export for the backend importer.

The HTML is the source of table data. The paired DOCX is only used because the
HTML refers to a missing Word asset directory while the DOCX still embeds every
profile photo.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import mimetypes
import posixpath
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from zipfile import ZipFile
from xml.etree import ElementTree as ET


CITY_CODE = "31.74"
CITY_NAME = "Kota Administrasi Jakarta Selatan"
SOURCE_DOCUMENT_DATE = "2026-06-10"
EXPECTED_SOURCE_TOTAL = 297
MANIFEST_VERSION = 1

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
VML_NS = "urn:schemas-microsoft-com:vml"
W = f"{{{WORD_NS}}}"

DISTRICT_HEADING_ALIASES = {
    "tingkat kota madya": None,
    "kecamatan tebet": "31.74.01",
    "kecamatan setiabudi": "31.74.02",
    "kecamatan mampang prapatan": "31.74.03",
    "kecamatan pasar minggu": "31.74.04",
    "kecamatan keb lama": "31.74.05",
    "kecamatan cilandak": "31.74.06",
    "kecamatan keb baru": "31.74.07",
    "kecamatan pancoran": "31.74.08",
    "kecamatan jagakarsa": "31.74.09",
    "kecamatan pesanggrahan": "31.74.10",
}

AREA_NAME_ALIASES = {
    "cipendak": "Cipedak",
    "durentiga": "Duren Tiga",
    "kby lama selatan": "Kebayoran Lama Selatan",
    "keb lama selatan": "Kebayoran Lama Selatan",
    "kramat pala": "Kramat Pela",
    "pasar mangis": "Pasar Manggis",
    "setiabudi": "Setia Budi",
}

# The table-level row has no Kelurahan in either the level or profile text.
# Public address references consistently place Jalan Pinang VI in Pondok Labu.
MANUAL_AREA_OVERRIDES = {
    "table-4-row-2": {
        "villageName": "Pondok Labu",
        "reason": "Jl. Pinang VI berada di Kelurahan Pondok Labu.",
    },
}

INDONESIAN_MONTHS = {
    "januari": 1,
    "februari": 2,
    "maret": 3,
    "april": 4,
    "mei": 5,
    "juni": 6,
    "juli": 7,
    "agustus": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "desember": 12,
}

PROFILE_LABELS = {
    "fullName": r"(?:nama(?:\s+panggilan)?)",
    "birth": (
        r"(?:tempat\s*[,/]?\s*(?:tanggal|tgl)\.?\s*lahir|"
        r"tempat\s*/\s*tgl\.?\s*lahir|tempat\s+lahir|"
        r"tgl\.?\s*lahir|tanggal\s+lahir|ttl)"
    ),
    "gender": r"(?:jenis\s+kelamin)",
    "address": r"(?:alamat)",
    "phone": (
        r"(?:no(?:mor)?\.?\s*(?:hp|handphone|telepon|telpon|telp|tlp)|"
        r"hp|handphone)"
    ),
    "occupation": r"(?:pekerjaan|profesi)",
    "position": r"(?:jabatan)",
    "education": r"(?:pendidikan)",
    "organization": r"(?:organisasi)",
    "politicalAffiliation": r"(?:(?:a|af|afl|afli|afilia)si\s+politik)",
    "benefit": r"(?:kebermanfaatan)",
    "nationalIdNumber": r"(?:nik)",
    "religion": r"(?:agama)",
    "maritalStatus": r"(?:status\s+perkawinan|status)",
    "bloodType": r"(?:gol\.?\s*darah)",
    "nationality": r"(?:kebangsaan|kewarganegaraan)",
    "taxNumber": r"(?:npwp)",
}


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("\u200e", "")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def normalize_cell_text(value: str) -> str:
    value = html.unescape(value).replace("\xa0", " ").replace("\u200e", "")
    value = re.sub(r"[ \t\f\v]+", " ", value)
    value = re.sub(r"\s*\n\s*", "\n", value)
    value = re.sub(r"\n{2,}", "\n", value)
    return value.strip(" \n")


def compact_field(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" -:●•")


def slugify(value: str, fallback: str = "item") -> str:
    normalized = normalize_text(value).replace(" ", "-")
    return normalized[:80].strip("-") or fallback


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def normalize_stage(value: str) -> str:
    normalized = normalize_text(value)
    if normalized.startswith("ass"):
        return "ASSESSMENT"
    if normalized.startswith("dev"):
        return "DEVELOPMENT"
    if normalized.startswith("rec"):
        return "RECRUITMENT"
    return "UNKNOWN"


def normalize_source_status(value: str) -> str:
    return "VALIDATED" if normalize_text(value) == "tervalidasi" else "UNKNOWN"


def classify_source_level(value: str) -> str:
    normalized = normalize_text(value)
    if re.search(r"\brt\b|\brw\b", normalized):
        return "RT_RW"
    if "kelurahan" in normalized or re.search(r"\bkel\b", normalized):
        return "URBAN_VILLAGE"
    if "kecamatan" in normalized or re.search(r"\bkec\b", normalized):
        return "DISTRICT"
    if "kota" in normalized:
        return "CITY"
    return "UNKNOWN"


@dataclass
class HtmlCell:
    parts: list[str] = field(default_factory=list)
    image_sources: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return normalize_cell_text("".join(self.parts))


class WordHtmlTableParser(HTMLParser):
    BLOCK_TAGS = {
        "br",
        "div",
        "p",
        "li",
        "tr",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[HtmlCell]]] = []
        self._table: list[list[HtmlCell]] | None = None
        self._table_depth = 0
        self._row: list[HtmlCell] | None = None
        self._cell: HtmlCell | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        tag = tag.lower()
        if tag == "table":
            if self._table is None:
                self._table = []
                self._table_depth = 1
            else:
                self._table_depth += 1
                if self._cell is not None:
                    self._cell.parts.append("\n")
            return
        if self._table is None:
            return
        if self._table_depth > 1:
            if self._cell is not None and tag in self.BLOCK_TAGS:
                self._cell.parts.append("\n")
            return
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = HtmlCell()
        elif self._cell is not None:
            if tag in self.BLOCK_TAGS:
                self._cell.parts.append("\n")
            if tag in {"img", "v:imagedata"}:
                source = dict(attrs).get("src")
                if source:
                    self._cell.image_sources.append(source.replace("\\", "/"))

    def handle_startendtag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "table" and self._table is not None and self._table_depth > 1:
            self._table_depth -= 1
            if self._cell is not None:
                self._cell.parts.append("\n")
            return
        if self._table is not None and self._table_depth > 1:
            return
        if tag in {"td", "th"} and self._cell is not None and self._row is not None:
            self._row.append(self._cell)
            self._cell = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None
            self._table_depth = 0
        elif self._cell is not None and tag in self.BLOCK_TAGS:
            self._cell.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.parts.append(data)


def parse_html_tables(path: Path) -> list[dict[str, Any]]:
    parser = WordHtmlTableParser()
    parser.feed(path.read_text(encoding="cp1252", errors="replace"))
    records: list[dict[str, Any]] = []

    for table_index, table in enumerate(parser.tables):
        if not table:
            continue
        header = [normalize_text(cell.text) for cell in table[0]]
        if len(header) != 6 or header[:3] != ["no", "jaring tingkat", "profiling"]:
            continue

        district_heading = ""
        for row_index, cells in enumerate(table[1:], start=1):
            values = [cell.text for cell in cells]
            if len(cells) == 2:
                district_heading = values[0]
                continue
            if len(cells) != 6 or not values[2]:
                continue
            records.append(
                {
                    "sourceKey": f"table-{table_index}-row-{row_index}",
                    "tableIndex": table_index,
                    "rowIndex": row_index,
                    "districtHeading": district_heading,
                    "sourceNumber": values[0],
                    "sourceLevelLabel": values[1],
                    "profilingRaw": values[2],
                    "sourceImagePaths": cells[3].image_sources,
                    "informationStageRaw": values[4],
                    "sourceValidationStatusRaw": values[5],
                }
            )
    return records


def text_from_word_cell(cell: ET.Element) -> str:
    return normalize_cell_text(
        "".join(node.text or "" for node in cell.findall(f".//{W}t"))
    )


def parse_docx_rows(path: Path) -> tuple[list[dict[str, Any]], dict[str, bytes]]:
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        relationships = ET.fromstring(
            archive.read("word/_rels/document.xml.rels")
        )
        relationship_targets = {
            relation.attrib["Id"]: relation.attrib["Target"]
            for relation in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        }
        records: list[dict[str, Any]] = []
        media: dict[str, bytes] = {}

        for table_index, table in enumerate(document.findall(f".//{W}tbl")):
            if table_index in {3, 12}:
                continue
            rows = table.findall(f"./{W}tr")
            district_heading = ""
            for row_index, row in enumerate(rows[1:], start=1):
                cells = row.findall(f"./{W}tc")
                values = [text_from_word_cell(cell) for cell in cells]
                if len(cells) == 2:
                    district_heading = values[0]
                    continue
                if len(cells) != 6 or not values[2]:
                    continue

                relationship_ids: list[str] = []
                for blip in row.findall(f".//{{{DRAWING_NS}}}blip"):
                    relationship_id = blip.attrib.get(f"{{{REL_NS}}}embed")
                    if relationship_id:
                        relationship_ids.append(relationship_id)
                for image in row.findall(f".//{{{VML_NS}}}imagedata"):
                    relationship_id = image.attrib.get(f"{{{REL_NS}}}id")
                    if relationship_id:
                        relationship_ids.append(relationship_id)
                relationship_ids = list(dict.fromkeys(relationship_ids))
                if len(relationship_ids) != 1:
                    raise ValueError(
                        f"{table_index=}, {row_index=}: expected one DOCX image, "
                        f"found {len(relationship_ids)}."
                    )
                target = relationship_targets[relationship_ids[0]]
                archive_path = posixpath.normpath(posixpath.join("word", target))
                if archive_path not in media:
                    media[archive_path] = archive.read(archive_path)
                records.append(
                    {
                        "sourceKey": f"table-{table_index}-row-{row_index}",
                        "districtHeading": district_heading,
                        "sourceLevelLabel": values[1],
                        "profilingRaw": values[2],
                        "archivePath": archive_path,
                    }
                )
    return records, media


def load_area_catalog(path: Path) -> dict[str, Any]:
    sql = path.read_text(encoding="utf-8")
    pairs = re.findall(r"\('([0-9.]+)','([^']+)'\)", sql)
    districts: dict[str, dict[str, Any]] = {}
    village_by_name: dict[str, dict[str, Any]] = {}

    for official_code, name in pairs:
        if re.fullmatch(r"31\.74\.\d{2}", official_code):
            districts[official_code] = {
                "officialCode": official_code,
                "name": name,
                "villages": [],
            }
    for official_code, name in pairs:
        if not re.fullmatch(r"31\.74\.\d{2}\.\d{4}", official_code):
            continue
        district_code = ".".join(official_code.split(".")[:3])
        area = {
            "officialCode": official_code,
            "name": name,
            "districtCode": district_code,
        }
        districts[district_code]["villages"].append(area)
        village_by_name[normalize_text(name)] = area

    if len(districts) != 10:
        raise ValueError(f"Expected 10 Jakarta Selatan districts, found {len(districts)}.")
    if len(village_by_name) != 65:
        raise ValueError(
            f"Expected 65 Jakarta Selatan urban villages, found {len(village_by_name)}."
        )
    return {"districts": districts, "villageByName": village_by_name}


def district_code_from_heading(value: str) -> str | None:
    normalized = normalize_text(value)
    if normalized not in DISTRICT_HEADING_ALIASES:
        raise ValueError(f"Unknown district heading: {value!r}")
    return DISTRICT_HEADING_ALIASES[normalized]


def find_village_mentions(
    value: str, villages: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    normalized = f" {normalize_text(value)} "
    hits: list[dict[str, Any]] = []
    for village in villages:
        names = [normalize_text(village["name"])]
        names.extend(
            alias
            for alias, canonical in AREA_NAME_ALIASES.items()
            if canonical == village["name"]
        )
        if any(f" {name} " in normalized for name in names):
            hits.append(village)
    return sorted(hits, key=lambda item: len(item["name"]), reverse=True)


def extract_explicit_village_text(profile: str) -> str:
    patterns = [
        r"(?is)\bkel(?:urahan)?\b\.?\s*/?\s*desa\s*[:.]?\s*([^,\n]+)",
        r"(?is)\bkel(?:urahan)?\b\.?\s*[:.]?\s*([^,\n]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, profile)
        if match:
            return match.group(1)
    address = extract_profile_fields(profile).get("address", "")
    return address


def resolve_area(
    record: dict[str, Any], catalog: dict[str, Any]
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    issues: list[dict[str, str]] = []
    district_code = district_code_from_heading(record["districtHeading"])
    source_level = classify_source_level(record["sourceLevelLabel"])
    all_districts = catalog["districts"]

    if district_code:
        villages = all_districts[district_code]["villages"]
    else:
        villages = [
            village
            for district in all_districts.values()
            for village in district["villages"]
        ]

    level_mentions = find_village_mentions(record["sourceLevelLabel"], villages)
    use_level_mention = source_level in {"URBAN_VILLAGE", "RT_RW"}
    selected = level_mentions[0] if use_level_mention and level_mentions else None

    profile_location = extract_explicit_village_text(record["profilingRaw"])
    profile_mentions = find_village_mentions(profile_location, villages)
    if not selected and profile_mentions:
        selected = profile_mentions[0]

    override = MANUAL_AREA_OVERRIDES.get(record["sourceKey"])
    if not selected and override:
        selected = catalog["villageByName"][normalize_text(override["villageName"])]
        issues.append(
            {
                "severity": "WARNING",
                "code": "MANUAL_AREA_OVERRIDE",
                "message": override["reason"],
            }
        )

    if not selected:
        raise ValueError(
            f"{record['sourceKey']}: cannot resolve an urban village from "
            f"{record['sourceLevelLabel']!r}."
        )

    if district_code and selected["districtCode"] != district_code:
        raise ValueError(
            f"{record['sourceKey']}: village {selected['name']} is outside "
            f"the heading district."
        )
    district_code = selected["districtCode"]
    district = all_districts[district_code]

    if (
        level_mentions
        and profile_mentions
        and level_mentions[0]["officialCode"] != profile_mentions[0]["officialCode"]
    ):
        issues.append(
            {
                "severity": "WARNING",
                "code": "SOURCE_AREA_CONFLICT",
                "message": (
                    f"Kolom tingkat menunjuk {level_mentions[0]['name']}, sedangkan "
                    f"profil menunjuk {profile_mentions[0]['name']}; cakupan mengikuti "
                    "kolom tingkat."
                ),
            }
        )

    if source_level == "UNKNOWN":
        issues.append(
            {
                "severity": "WARNING",
                "code": "SOURCE_LEVEL_UNKNOWN",
                "message": "Label tingkat kosong/tidak baku; kelurahan diambil dari profil.",
            }
        )

    return (
        {
            "cityOfficialCode": CITY_CODE,
            "cityName": CITY_NAME,
            "districtOfficialCode": district_code,
            "districtName": district["name"],
            "villageOfficialCode": selected["officialCode"],
            "villageName": selected["name"],
            "sourceLevel": source_level,
        },
        issues,
    )


def compile_label_pattern() -> re.Pattern[str]:
    alternatives = "|".join(
        f"(?P<{name}>{pattern})" for name, pattern in PROFILE_LABELS.items()
    )
    return re.compile(rf"(?is)(?:^|[\s●•\-]+)(?:{alternatives})\s*[:.]?\s*")


LABEL_PATTERN = compile_label_pattern()


def extract_profile_fields(profile: str) -> dict[str, str]:
    profile = "".join(
        character
        for character in profile
        if unicodedata.category(character) != "Cf"
    )
    matches = list(LABEL_PATTERN.finditer(profile))
    fields: dict[str, str] = {}
    for index, match in enumerate(matches):
        field_name = next(
            name for name, value in match.groupdict().items() if value is not None
        )
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(profile)
        value = compact_field(normalize_cell_text(profile[start:end]))
        if value and field_name not in fields:
            fields[field_name] = value
    return fields


def normalize_phone(value: str) -> str | None:
    digits = re.sub(r"\D", "", value)
    if digits.startswith("620"):
        digits = "62" + digits[3:]
    elif digits.startswith("0"):
        digits = "62" + digits[1:]
    if not digits.startswith("62") or not 9 <= len(digits) <= 15:
        return None
    return digits


def parse_birth(value: str) -> tuple[str | None, str | None]:
    cleaned = normalize_cell_text(value).strip(" ,/-")
    if not cleaned or cleaned == "-":
        return None, None

    named_month = re.search(
        r"(?i)\b(\d{1,2})\s+("
        + "|".join(INDONESIAN_MONTHS)
        + r")\s+(\d{4})\b",
        cleaned,
    )
    numeric = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", cleaned)
    parsed_date: date | None = None
    start = None
    if named_month:
        parsed_date = date(
            int(named_month.group(3)),
            INDONESIAN_MONTHS[named_month.group(2).lower()],
            int(named_month.group(1)),
        )
        start = named_month.start()
    elif numeric:
        try:
            parsed_date = date(
                int(numeric.group(3)), int(numeric.group(2)), int(numeric.group(1))
            )
            start = numeric.start()
        except ValueError:
            parsed_date = None

    place = None
    if start is not None:
        candidate = cleaned[:start].strip(" ,/-")
        if candidate and not re.fullmatch(r"\d+", candidate):
            place = candidate[:120]
    return place, parsed_date.isoformat() if parsed_date else None


def normalize_gender(value: str) -> str | None:
    normalized = normalize_text(value)
    if "perempuan" in normalized or "wanita" in normalized:
        return "FEMALE"
    if "laki" in normalized or "pria" in normalized:
        return "MALE"
    return None


def occupation_code(value: str, position: str) -> str:
    normalized = normalize_text(f"{value} {position}")
    mappings = [
        (r"\b(pns|asn|pegawai negeri)\b", "ASN_PNS"),
        (r"\bpppk\b", "PPPK"),
        (r"\b(tni|babinsa)\b", "TNI"),
        (r"\b(polri|polisi|bhabinkamtibmas)\b", "POLRI"),
        (r"\b(bumn)\b", "PEGAWAI_BUMN"),
        (r"\b(bumd)\b", "PEGAWAI_BUMD"),
        (r"\b(guru|dosen|pengajar)\b", "GURU_DOSEN"),
        (r"\b(dokter|perawat|bidan|apoteker|kesehatan)\b", "TENAGA_KESEHATAN"),
        (r"\b(mahasiswa|pelajar|siswa)\b", "MAHASISWA_PELAJAR"),
        (r"\b(wiraswasta|pengusaha|usaha mandiri)\b", "WIRASWASTA"),
        (r"\b(pedagang|jualan|warung)\b", "PEDAGANG"),
        (r"\b(umkm)\b", "UMKM"),
        (r"\b(sopir|driver|transportasi)\b", "SOPIR_TRANSPORTASI"),
        (r"\b(ojek|ojol|kurir)\b", "OJEK_ONLINE_KURIR"),
        (r"\b(satpam|security|keamanan)\b", "SATPAM_SECURITY"),
        (r"\b(wartawan|jurnalis|media)\b", "JURNALIS_MEDIA"),
        (r"\b(ustadz|ustad|tokoh agama|imam|pendeta)\b", "TOKOH_AGAMA"),
        (r"\b(ketua|pengurus)\s+(rt|rw)\b", "PENGURUS_RT_RW"),
        (r"\b(tokoh masyarakat)\b", "TOKOH_MASYARAKAT"),
        (r"\b(ibu rumah tangga|mengurus rumah tangga)\b", "IBU_RUMAH_TANGGA"),
        (r"\b(pensiun|purnawirawan)\b", "PENSIUNAN"),
        (r"\b(tidak bekerja|pengangguran)\b", "TIDAK_BEKERJA"),
        (r"\b(karyawan|pegawai|swasta|buruh|honorer|freelance)\b", "PEGAWAI_SWASTA"),
    ]
    for pattern, code in mappings:
        if re.search(pattern, normalized):
            return code
    return "LAINNYA"


def profile_payload(record: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, str]]]:
    fields = extract_profile_fields(record["profilingRaw"])
    issues: list[dict[str, str]] = []
    phone = normalize_phone(fields.get("phone", ""))
    birth_place, birth_date = parse_birth(fields.get("birth", ""))
    gender = normalize_gender(fields.get("gender", ""))
    full_name = compact_field(fields.get("fullName", ""))
    address = compact_field(fields.get("address", ""))

    if not full_name:
        issues.append(
            {"severity": "ERROR", "code": "FULL_NAME_MISSING", "message": "Nama kosong."}
        )
    if not phone:
        issues.append(
            {
                "severity": "WARNING",
                "code": "PHONE_MISSING_OR_INVALID",
                "message": "Nomor WhatsApp tidak tersedia atau tidak valid.",
            }
        )
    if not address:
        issues.append(
            {
                "severity": "WARNING",
                "code": "ADDRESS_MISSING",
                "message": "Alamat terstruktur tidak ditemukan.",
            }
        )

    return (
        {
            "fullName": full_name or f"Jaring tanpa nama {record['sourceKey']}",
            "whatsappNumber": phone,
            "address": address or None,
            "birthPlace": birth_place,
            "birthDate": birth_date,
            "gender": gender,
            "occupationRaw": compact_field(fields.get("occupation", "")) or None,
            "occupationCode": occupation_code(
                fields.get("occupation", ""), fields.get("position", "")
            ),
            "jobTitle": compact_field(fields.get("position", "")) or None,
            "organizationName": compact_field(fields.get("organization", "")) or None,
            "politicalAffiliation": (
                compact_field(fields.get("politicalAffiliation", "")) or None
            ),
            "nationalIdNumber": (
                re.sub(r"\D", "", fields.get("nationalIdNumber", "")) or None
            ),
            "educationRaw": compact_field(fields.get("education", "")) or None,
            "benefitRaw": compact_field(fields.get("benefit", "")) or None,
        },
        issues,
    )


def html_index(manifest: dict[str, Any]) -> str:
    rows: list[str] = []
    for record in manifest["records"]:
        issue_codes = ", ".join(issue["code"] for issue in record["validationIssues"])
        relative_photo = record["profilePhoto"]["storageKey"].removeprefix(
            "jaring/jakarta-selatan/"
        )
        status_class = (
            "ok" if record["importDisposition"] == "APPROVED" else "review"
        )
        rows.append(
            "<tr>"
            f"<td>{record['index']}</td>"
            f"<td><code>{html.escape(record['aliasName'])}</code></td>"
            f"<td>{html.escape(record['area']['districtName'])}</td>"
            f"<td>{html.escape(record['area']['villageName'])}</td>"
            f"<td>{html.escape(record['area']['sourceLevel'])}</td>"
            f"<td>{html.escape(record['profile']['fullName'])}</td>"
            f"<td>{html.escape(record['profile']['whatsappNumber'] or '-')}</td>"
            f"<td>{html.escape(record['informationStage'])}</td>"
            f"<td>{html.escape(record['sourceValidationStatus'])}</td>"
            f"<td class='{status_class}'>{html.escape(record['importDisposition'])}"
            f"<small>{html.escape(issue_codes)}</small></td>"
            f"<td><a href='{html.escape(relative_photo)}'>"
            f"<img loading='lazy' src='{html.escape(relative_photo)}' "
            f"alt='Foto {html.escape(record['profile']['fullName'])}'></a></td>"
            "</tr>"
        )
    summary = manifest["summary"]
    return f"""<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Index Jaring Jakarta Selatan</title>
  <style>
    :root {{ color-scheme: light dark; font-family: system-ui, sans-serif; }}
    body {{ margin: 0; padding: 24px; background: #f4f6f8; color: #17202a; }}
    h1 {{ margin: 0 0 8px; }} p {{ margin: 4px 0 18px; }}
    .wrap {{ overflow: auto; background: white; border: 1px solid #d7dde3; }}
    table {{ width: 100%; border-collapse: collapse; min-width: 1500px; }}
    th, td {{ padding: 8px; border-bottom: 1px solid #e3e7eb; text-align: left; vertical-align: top; }}
    th {{ position: sticky; top: 0; background: #17202a; color: white; }}
    tr:hover {{ background: #f0f6ff; }}
    img {{ width: 72px; height: 72px; object-fit: cover; border-radius: 6px; }}
    small {{ display: block; max-width: 260px; color: #7b241c; }}
    .ok {{ color: #11734b; font-weight: 700; }}
    .review {{ color: #b03a2e; font-weight: 700; }}
    code {{ white-space: nowrap; }}
    @media (prefers-color-scheme: dark) {{
      body {{ background: #111827; color: #e5e7eb; }}
      .wrap {{ background: #1f2937; border-color: #374151; }}
      td {{ border-color: #374151; }} tr:hover {{ background: #263548; }}
    }}
  </style>
</head>
<body>
  <h1>Index Jaring Jakarta Selatan</h1>
  <p>Parsed {summary['parsedTotal']} baris; rekap sumber {summary['declaredTotal']};
  siap impor {summary['approvedTotal']}; perlu review {summary['reviewRequiredTotal']}.</p>
  <div class="wrap">
    <table>
      <thead><tr><th>Index</th><th>Alias</th><th>Kecamatan</th><th>Kelurahan</th>
      <th>Tingkat</th><th>Nama</th><th>WhatsApp</th><th>Keterangan</th>
      <th>Status Sumber</th><th>Validasi Impor</th><th>Foto</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
  </div>
</body>
</html>
"""


def prepare(args: argparse.Namespace) -> dict[str, Any]:
    source_dir = args.source_dir.resolve()
    html_path = source_dir / args.html_name
    docx_path = source_dir / args.docx_name
    output_root = args.output_root.resolve()
    area_sql = args.area_sql.resolve()

    for path in (html_path, docx_path, area_sql):
        if not path.is_file():
            raise FileNotFoundError(path)

    html_records = parse_html_tables(html_path)
    docx_records, media = parse_docx_rows(docx_path)
    if len(html_records) != len(docx_records):
        raise ValueError(
            f"HTML has {len(html_records)} rows, DOCX has {len(docx_records)} rows."
        )
    for html_record, docx_record in zip(html_records, docx_records, strict=True):
        html_profile_key = normalize_text(html_record["profilingRaw"]).replace(" ", "")
        docx_profile_key = normalize_text(docx_record["profilingRaw"]).replace(" ", "")
        if html_profile_key != docx_profile_key:
            raise ValueError(
                f"{html_record['sourceKey']}: HTML/DOCX profile text differs."
            )
        html_record["docxArchivePath"] = docx_record["archivePath"]

    catalog = load_area_catalog(area_sql)
    source_sha = sha256_bytes(html_path.read_bytes())
    docx_sha = sha256_bytes(docx_path.read_bytes())
    district_sequences: Counter[str] = Counter()
    records: list[dict[str, Any]] = []

    for index, record in enumerate(html_records, start=1):
        area, area_issues = resolve_area(record, catalog)
        profile, profile_issues = profile_payload(record)
        district_sequences[area["districtOfficialCode"]] += 1
        district_number = area["districtOfficialCode"].split(".")[-1]
        alias_name = f"Z{district_number}{district_sequences[area['districtOfficialCode']]:03d}"
        code = f"JKT-SEL-{index:04d}"

        image_bytes = media[record["docxArchivePath"]]
        suffix = Path(record["docxArchivePath"]).suffix.lower()
        if suffix == ".jpeg":
            suffix = ".jpg"
        mime_type = mimetypes.types_map.get(suffix, "application/octet-stream")
        if mime_type not in {"image/jpeg", "image/png", "image/gif", "image/webp"}:
            raise ValueError(
                f"{record['sourceKey']}: unsupported image type {mime_type}."
            )
        photo_relative = Path(
            "photos",
            f"{area['districtOfficialCode']}-{slugify(area['districtName'])}",
            f"{area['villageOfficialCode']}-{slugify(area['villageName'])}",
            f"{index:04d}-{alias_name.lower()}-{slugify(profile['fullName'])}{suffix}",
        )
        photo_path = output_root / photo_relative
        photo_path.parent.mkdir(parents=True, exist_ok=True)
        photo_path.write_bytes(image_bytes)

        issues = [*area_issues, *profile_issues]
        record_payload = {
            "index": index,
            "code": code,
            "aliasName": alias_name,
            "source": {
                "key": record["sourceKey"],
                "tableIndex": record["tableIndex"],
                "rowIndex": record["rowIndex"],
                "number": record["sourceNumber"],
                "districtHeading": record["districtHeading"],
                "levelLabel": record["sourceLevelLabel"],
                "profilingRaw": record["profilingRaw"],
                "imagePaths": record["sourceImagePaths"],
            },
            "area": area,
            "profile": profile,
            "informationStage": normalize_stage(record["informationStageRaw"]),
            "informationStageRaw": record["informationStageRaw"],
            "sourceValidationStatus": normalize_source_status(
                record["sourceValidationStatusRaw"]
            ),
            "sourceValidationStatusRaw": record["sourceValidationStatusRaw"],
            "profilePhoto": {
                "storageKey": (
                    Path("jaring", "jakarta-selatan", photo_relative)
                    .as_posix()
                    .lower()
                ),
                "originalName": photo_path.name,
                "mimeType": mime_type,
                "sizeBytes": len(image_bytes),
                "checksumSha256": sha256_bytes(image_bytes),
            },
            "validationIssues": issues,
            "importDisposition": (
                "REVIEW_REQUIRED"
                if any(
                    issue["code"]
                    in {
                        "FULL_NAME_MISSING",
                        "PHONE_MISSING_OR_INVALID",
                        "SOURCE_AREA_CONFLICT",
                    }
                    for issue in issues
                )
                else "APPROVED"
            ),
        }
        records.append(record_payload)

    phone_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        phone = record["profile"]["whatsappNumber"]
        if phone:
            phone_groups[phone].append(record)
    for phone, duplicates in phone_groups.items():
        if len(duplicates) < 2:
            continue
        for record in duplicates[1:]:
            record["validationIssues"].append(
                {
                    "severity": "WARNING",
                    "code": "PHONE_DUPLICATE",
                    "message": (
                        f"Nomor {phone} juga digunakan oleh index "
                        f"{duplicates[0]['index']}; baris ini perlu review."
                    ),
                }
            )
            record["importDisposition"] = "REVIEW_REQUIRED"

    for record in records:
        if not record["profile"]["whatsappNumber"]:
            record["profile"]["whatsappNumber"] = (
                f"00003174{record['index']:06d}"
            )
            record["profile"]["usesPlaceholderWhatsappNumber"] = True
        else:
            record["profile"]["usesPlaceholderWhatsappNumber"] = False

    issue_counts = Counter(
        issue["code"] for record in records for issue in record["validationIssues"]
    )
    level_counts = Counter(record["area"]["sourceLevel"] for record in records)
    stage_counts = Counter(record["informationStage"] for record in records)
    status_counts = Counter(record["sourceValidationStatus"] for record in records)
    district_counts = Counter(record["area"]["districtName"] for record in records)
    covered_village_codes = {
        record["area"]["villageOfficialCode"] for record in records
    }
    uncovered_villages = sorted(
        (
            {
                "officialCode": village["officialCode"],
                "name": village["name"],
                "districtName": catalog["districts"][village["districtCode"]]["name"],
            }
            for district in catalog["districts"].values()
            for village in district["villages"]
            if village["officialCode"] not in covered_village_codes
        ),
        key=lambda item: item["officialCode"],
    )
    approved_total = sum(
        record["importDisposition"] == "APPROVED" for record in records
    )
    summary = {
        "declaredTotal": EXPECTED_SOURCE_TOTAL,
        "parsedTotal": len(records),
        "totalMismatch": len(records) != EXPECTED_SOURCE_TOTAL,
        "approvedTotal": approved_total,
        "reviewRequiredTotal": len(records) - approved_total,
        "districtTotal": len(district_counts),
        "expectedVillageTotal": 65,
        "coveredVillageTotal": len(covered_village_codes),
        "uncoveredVillages": uncovered_villages,
        "sourceLevelCounts": dict(sorted(level_counts.items())),
        "informationStageCounts": dict(sorted(stage_counts.items())),
        "sourceStatusCounts": dict(sorted(status_counts.items())),
        "districtRecordCounts": dict(sorted(district_counts.items())),
        "validationIssueCounts": dict(sorted(issue_counts.items())),
    }
    manifest = {
        "version": MANIFEST_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceDocumentDate": SOURCE_DOCUMENT_DATE,
        "source": {
            "htmlFile": args.html_name,
            "htmlSha256": source_sha,
            "docxFile": args.docx_name,
            "docxSha256": docx_sha,
        },
        "summary": summary,
        "records": records,
    }
    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    validation_report = {
        "source": manifest["source"],
        "summary": summary,
        "globalIssues": [
            *(
                [
                    {
                        "severity": "WARNING",
                        "code": "SOURCE_TOTAL_MISMATCH",
                        "message": (
                            f"Rekap tabel menyatakan {EXPECTED_SOURCE_TOTAL}, tetapi "
                            f"{len(records)} baris data ditemukan. Semua baris dipertahankan."
                        ),
                    }
                ]
                if summary["totalMismatch"]
                else []
            ),
            *(
                [
                    {
                        "severity": "WARNING",
                        "code": "SOURCE_VILLAGE_COVERAGE_INCOMPLETE",
                        "message": (
                            "Tidak ada baris Jaring pada sumber untuk: "
                            + ", ".join(
                                f"{item['name']} ({item['districtName']})"
                                for item in uncovered_villages
                            )
                            + "."
                        ),
                    }
                ]
                if uncovered_villages
                else []
            ),
        ],
        "records": [
            {
                "index": record["index"],
                "code": record["code"],
                "aliasName": record["aliasName"],
                "sourceKey": record["source"]["key"],
                "fullName": record["profile"]["fullName"],
                "district": record["area"]["districtName"],
                "village": record["area"]["villageName"],
                "importDisposition": record["importDisposition"],
                "issues": record["validationIssues"],
            }
            for record in records
            if record["validationIssues"]
        ],
    }
    (output_root / "validation-report.json").write_text(
        json.dumps(validation_report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_root / "index.html").write_text(
        html_index(manifest), encoding="utf-8"
    )
    readme_source = Path(__file__).with_name("README-jakarta-jaring.md")
    shutil.copyfile(readme_source, output_root / "README.md")
    return manifest


def parse_args() -> argparse.Namespace:
    script_path = Path(__file__).resolve()
    backend_root = script_path.parent.parent
    repo_root = backend_root.parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=repo_root / "folder")
    parser.add_argument("--html-name", default="jakarta.html")
    parser.add_argument("--docx-name", default="JAKARTA SELATAN.docx")
    parser.add_argument(
        "--area-sql",
        type=Path,
        default=repo_root / "apps" / "wilayah" / "db" / "wilayah.sql",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=backend_root / "storage" / "jaring" / "jakarta-selatan",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove the previous generated output after verifying the target path.",
    )
    args = parser.parse_args()
    if args.clean:
        output = args.output_root.resolve()
        expected = (backend_root / "storage" / "jaring" / "jakarta-selatan").resolve()
        if output != expected:
            raise ValueError("--clean is only allowed for the default output directory.")
        if output.exists():
            shutil.rmtree(output)
    return args


if __name__ == "__main__":
    prepared = prepare(parse_args())
    print(json.dumps(prepared["summary"], ensure_ascii=False, indent=2))
