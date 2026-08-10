export type AdministrativeAreaNode = {
  id?: string | null;
  name?: string | null;
  level?: string | null;
  code?: string | null;
  officialCode?: string | null;
  parent?: AdministrativeAreaNode | null;
};

export const DKI_JAKARTA_PROVINCE_CODE = "31";
export const DKI_REGENCY_CITY_LEVELS = ["REGENCY", "CITY"] as const;

const LEVEL_LABELS: Record<string, string> = {
  COUNTRY: "Negara",
  PROVINCE: "Provinsi",
  REGENCY: "Kabupaten",
  CITY: "Kota",
  DISTRICT: "Kecamatan",
  VILLAGE: "Desa",
  URBAN_VILLAGE: "Kelurahan",
  RW: "RW",
  RT: "RT",
};

export function administrativeAreaLevelLabel(level?: string | null) {
  if (!level) return "Wilayah";
  return LEVEL_LABELS[level] ?? level.replaceAll("_", " ");
}

export function administrativeAreaDisplayName(area?: AdministrativeAreaNode | null) {
  const name = area?.name?.trim();
  if (!name) return "Wilayah belum terpetakan";

  const levelLabel = administrativeAreaLevelLabel(area?.level);
  if (levelLabel === "Negara" || levelLabel === "Wilayah") return name;

  const normalizedName = name.toLocaleLowerCase("id-ID");
  const normalizedLabel = levelLabel.toLocaleLowerCase("id-ID");
  return normalizedName.startsWith(`${normalizedLabel} `) || normalizedName === normalizedLabel
    ? name
    : `${levelLabel} ${name}`;
}

export function administrativeAreaHierarchy(value?: AdministrativeAreaNode | null) {
  const hierarchy: AdministrativeAreaNode[] = [];
  const visited = new Set<string>();
  let area = value;

  while (area?.name && hierarchy.length < 8) {
    const identity = area.id ?? `${area.level ?? "UNKNOWN"}:${area.name}`;
    if (visited.has(identity)) break;

    visited.add(identity);
    hierarchy.push(area);
    area = area.parent;
  }

  return hierarchy;
}

export function administrativeAreaLabel(value?: AdministrativeAreaNode | null) {
  const hierarchy = administrativeAreaHierarchy(value);
  return hierarchy.length > 0 ? hierarchy.map(administrativeAreaDisplayName).join(", ") : "Wilayah belum terpetakan";
}

export function isDkiJakartaProvinceArea(area?: AdministrativeAreaNode | null) {
  if (area?.level !== "PROVINCE") return false;

  const code = area.officialCode ?? area.code ?? "";
  const name = area.name?.toLocaleLowerCase("id-ID") ?? "";
  return (
    code === DKI_JAKARTA_PROVINCE_CODE || name.includes("dki jakarta") || name.includes("daerah khusus ibukota jakarta")
  );
}

export function isDkiJakartaRegencyCityArea(area?: AdministrativeAreaNode | null) {
  if (!area?.level || !DKI_REGENCY_CITY_LEVELS.includes(area.level as (typeof DKI_REGENCY_CITY_LEVELS)[number])) {
    return false;
  }

  const code = area.officialCode ?? area.code ?? "";
  return (
    code.startsWith(`${DKI_JAKARTA_PROVINCE_CODE}.`) ||
    isDkiJakartaProvinceArea(area.parent) ||
    Boolean(area.parent?.name?.toLocaleLowerCase("id-ID").includes("jakarta"))
  );
}
