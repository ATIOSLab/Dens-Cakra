// biome-ignore-all lint/nursery/useSortedClasses: Preserves selected finalkalife map UI class composition.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertTriangle,
  FileText,
  Layers3,
  LoaderCircle,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map as BaseMap, MapControls, MapGeoJSON, MapMarker, type MapRef, type MapViewport } from "@/components/ui/map";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import { MapInspector, type SelectionType } from "./MapInspector";
import { MapLegend, REPORT_URGENCY_COLORS, REPORT_URGENCY_LABELS } from "./MapLegend";
import { usePersonnelMap } from "./usePersonnelMap";
import { getCoordinates, getPersonnelStatus } from "./utils/mapHelpers";

const INDONESIA_CENTER: [number, number] = [117.5, -2.5];
const EMPTY_COLLECTION = { type: "FeatureCollection", features: [] };
const OPENSTREETMAP_3D_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAP_STYLES = {
  light: OPENSTREETMAP_3D_STYLE,
  dark: OPENSTREETMAP_3D_STYLE,
};
type ObjectFilter = "ALL" | "PERSONNEL" | "REPORTS";
type UnitBranchFilter = "ALL" | "BINDA" | "DIRECTORATE";

type AdministrativeAreaOption = {
  id: string;
  code: string;
  name: string;
  level: "COUNTRY" | "PROVINCE" | "REGENCY" | "CITY" | "DISTRICT";
  parentId: string | null;
  centroidLatitude: string | number | null;
  centroidLongitude: string | number | null;
};

type JaringClusterOption = {
  id: string;
  code: string;
  name: string;
};

type AreaFocus =
  | { kind: "bounds"; bounds: [[number, number], [number, number]] }
  | { kind: "center"; center: [number, number] };

type NominatimResult = {
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string];
};

const REPORT_STATUSES = ["SENT_TO_OIM", "UNDER_VERIFICATION", "NEEDS_DEVELOPMENT", "VERIFIED", "REJECTED"] as const;

const REPORT_URGENCIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const REPORT_STATUS_LABELS: Record<(typeof REPORT_STATUSES)[number], string> = {
  SENT_TO_OIM: "Dikirim ke OIM",
  UNDER_VERIFICATION: "Dalam Verifikasi",
  NEEDS_DEVELOPMENT: "Perlu Pengembangan",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getUnitBranch(properties: Record<string, unknown>): UnitBranchFilter | null {
  if (properties.unitBranch === "BINDA" || properties.unitBranch === "DIRECTORATE") {
    return properties.unitBranch;
  }
  const unitName = String(properties.unitName || "");
  if (/binda/i.test(unitName)) return "BINDA";
  if (/direktorat/i.test(unitName)) return "DIRECTORATE";
  return null;
}

function getGeometryBounds(geometry: unknown): [[number, number], [number, number]] | null {
  const coordinates = record(geometry).coordinates;
  if (!Array.isArray(coordinates)) return null;

  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    const longitude = numberOrNull(value[0]);
    const latitude = numberOrNull(value[1]);
    if (longitude !== null && latitude !== null) {
      minLongitude = Math.min(minLongitude, longitude);
      minLatitude = Math.min(minLatitude, latitude);
      maxLongitude = Math.max(maxLongitude, longitude);
      maxLatitude = Math.max(maxLatitude, latitude);
      return;
    }
    value.forEach(visit);
  };

  visit(coordinates);
  if (![minLongitude, minLatitude, maxLongitude, maxLatitude].every(Number.isFinite)) return null;
  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}

function isCoordinateInIndonesia(longitude: number, latitude: number) {
  return longitude >= 90 && longitude <= 145 && latitude >= -15 && latitude <= 10;
}

function areBoundsInIndonesia(bounds: [[number, number], [number, number]]) {
  return isCoordinateInIndonesia(bounds[0][0], bounds[0][1]) && isCoordinateInIndonesia(bounds[1][0], bounds[1][1]);
}

function normalizeAreaNameForGeocoding(name: string) {
  return name.replace(/^(kabupaten|kota administrasi|kota)\s+/i, "").trim();
}

function getNominatimFocus(result: NominatimResult | undefined): AreaFocus | null {
  if (!result) return null;
  const [south, north, west, east] = (result.boundingbox ?? []).map(Number);
  const bounds: [[number, number], [number, number]] = [
    [west, south],
    [east, north],
  ];
  if ([south, north, west, east].every(Number.isFinite) && areBoundsInIndonesia(bounds)) {
    return { kind: "bounds", bounds };
  }

  const longitude = numberOrNull(result.lon);
  const latitude = numberOrNull(result.lat);
  if (longitude === null || latitude === null || !isCoordinateInIndonesia(longitude, latitude)) return null;
  return { kind: "center", center: [longitude, latitude] };
}

function mergePersonnelDetails(featureProperties: any, assignmentValue: unknown, pingValue: unknown) {
  const assignment = record(assignmentValue);
  const profile = record(assignment.userProfile);
  const authUser = record(profile.authUser);
  const position = record(assignment.position);
  const role = record(position.role);
  const unit = record(position.organizationUnit);
  const ping = record(pingValue);
  const scopes = Array.isArray(assignment.areaScopes) ? assignment.areaScopes.map(record) : [];
  const primaryScope = scopes.find((scope) => scope.isPrimary === true) ?? scopes[0] ?? {};
  const primaryArea = record(primaryScope.area);
  const areaNames = scopes
    .map((scope) => stringOrNull(record(scope.area).name))
    .filter((name): name is string => Boolean(name));

  return {
    ...featureProperties,
    assignmentId: stringOrNull(assignment.id) ?? featureProperties.assignmentId,
    assignmentIsActive: typeof assignment.isActive === "boolean" ? assignment.isActive : null,
    assignmentIsPrimary: typeof assignment.isPrimary === "boolean" ? assignment.isPrimary : null,
    assignmentValidFrom: stringOrNull(assignment.validFrom),
    assignmentValidUntil: stringOrNull(assignment.validUntil),
    userProfileId: stringOrNull(profile.id) ?? featureProperties.userProfileId,
    userName:
      stringOrNull(profile.fullName) ??
      stringOrNull(authUser.name) ??
      stringOrNull(authUser.email) ??
      featureProperties.userName,
    username: stringOrNull(profile.username),
    email: stringOrNull(authUser.email),
    phone: stringOrNull(profile.phone),
    profileStatus: stringOrNull(profile.status),
    profileIsActive: typeof profile.isActive === "boolean" ? profile.isActive : null,
    lastLoginAt: stringOrNull(profile.lastLoginAt),
    positionCode: stringOrNull(position.code),
    positionTitle: stringOrNull(position.title) ?? featureProperties.positionTitle,
    roleCode: stringOrNull(role.code),
    roleName: stringOrNull(role.name),
    unitId: stringOrNull(unit.id) ?? featureProperties.unitId,
    unitCode: stringOrNull(unit.code),
    unitName: stringOrNull(unit.name) ?? featureProperties.unitName,
    unitType: stringOrNull(unit.type) ?? featureProperties.unitType,
    unitBranch: stringOrNull(unit.branch) ?? featureProperties.unitBranch,
    areaId: stringOrNull(ping.areaId) ?? stringOrNull(primaryArea.id) ?? featureProperties.areaId,
    areaName: stringOrNull(record(ping.area).name) ?? stringOrNull(primaryArea.name) ?? featureProperties.areaName,
    areaNames,
    capturedAt: stringOrNull(ping.capturedAt) ?? featureProperties.capturedAt,
    gpsAccuracyMeters: numberOrNull(ping.gpsAccuracyMeters),
    coordinateSource: stringOrNull(ping.coordinateSource),
    areaResolutionMethod: stringOrNull(ping.areaResolutionMethod),
    hasLiveLocation: Boolean(ping.id) || Boolean(featureProperties.hasLiveLocation),
  };
}

function mergeReportDetails(featureProperties: any, detailValue: unknown) {
  const detail = record(detailValue);
  const versions = Array.isArray(detail.versions) ? detail.versions.map(record) : [];
  const currentVersionNumber = numberOrNull(detail.currentVersionNumber);
  const currentVersion =
    versions.find((version) => numberOrNull(version.versionNumber) === currentVersionNumber) ?? versions[0] ?? {};
  const category = record(detail.reportCategory);
  const cluster = record(detail.jaringCluster);
  const creatorAssignment = record(detail.createdByFieldOfficerAssignment);
  const creatorProfile = record(creatorAssignment.userProfile);
  const creatorPosition = record(creatorAssignment.position);
  const verification = record(currentVersion.verification);

  return {
    ...featureProperties,
    status: stringOrNull(detail.status) ?? featureProperties.status,
    title: stringOrNull(currentVersion.title) ?? featureProperties.title,
    urgency: stringOrNull(currentVersion.urgency) ?? featureProperties.urgency,
    originalContent: stringOrNull(currentVersion.originalContent),
    normalizedContent: stringOrNull(currentVersion.normalizedContent),
    eventTime: stringOrNull(currentVersion.eventTime),
    fieldOfficerNote: stringOrNull(currentVersion.fieldOfficerNote),
    coverageValidationStatus: stringOrNull(currentVersion.coverageValidationStatus),
    coverageValidationNote: stringOrNull(currentVersion.coverageValidationNote),
    areaResolutionMethod: stringOrNull(currentVersion.areaResolutionMethod),
    areaResolutionConfidence: numberOrNull(currentVersion.areaResolutionConfidence),
    gpsAccuracyMeters: numberOrNull(currentVersion.gpsAccuracyMeters),
    reportCategoryId: stringOrNull(category.id) ?? featureProperties.reportCategoryId,
    reportCategoryName: stringOrNull(category.name) ?? featureProperties.reportCategoryName,
    jaringClusterId: stringOrNull(cluster.id) ?? featureProperties.jaringClusterId,
    jaringClusterName: stringOrNull(cluster.name) ?? featureProperties.jaringClusterName,
    createdByName: stringOrNull(creatorProfile.fullName),
    createdByPosition: stringOrNull(creatorPosition.title),
    verificationStatus: stringOrNull(verification.status),
    sourceCount: Array.isArray(currentVersion.sourceMessages) ? currentVersion.sourceMessages.length : 0,
    attachmentCount: Array.isArray(currentVersion.attachments) ? currentVersion.attachments.length : 0,
    alertCount: Array.isArray(detail.alerts) ? detail.alerts.length : 0,
    versionNumber: numberOrNull(currentVersion.versionNumber),
  };
}

export function NationalMap() {
  const mapRef = useRef<MapRef>(null);
  const personnelRequestId = useRef(0);
  const reportRequestId = useRef(0);
  const districtFocusCache = useRef(new Map<string, AreaFocus>());

  // Viewport State
  const [viewport, setViewport] = useState<MapViewport>({
    center: INDONESIA_CENTER,
    zoom: 4.2,
    pitch: 60,
    bearing: -18,
  });

  // Layer Collections
  const [boundaries, setBoundaries] = useState<any>(EMPTY_COLLECTION);
  const [reports, setReports] = useState<any>(EMPTY_COLLECTION);
  const [personnel, setPersonnel] = useState<any>(EMPTY_COLLECTION);
  const [alerts, setAlerts] = useState<any>(EMPTY_COLLECTION);
  const [emergencies, setEmergencies] = useState<any>(EMPTY_COLLECTION);

  // UI / Layer toggles
  const [layers, setLayers] = useState({
    reports: true,
    personnel: true,
    alerts: true,
    emergencies: true,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectFilter>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedUnitBranch, setSelectedUnitBranch] = useState<UnitBranchFilter>("ALL");
  const [selectedReportStatus, setSelectedReportStatus] = useState<string>("ALL");
  const [selectedReportUrgency, setSelectedReportUrgency] = useState<string>("ALL");
  const [selectedReportCluster, setSelectedReportCluster] = useState<string>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Cascading administrative filters
  const [countries, setCountries] = useState<AdministrativeAreaOption[]>([]);
  const [provinces, setProvinces] = useState<AdministrativeAreaOption[]>([]);
  const [regencies, setRegencies] = useState<AdministrativeAreaOption[]>([]);
  const [districts, setDistricts] = useState<AdministrativeAreaOption[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedRegencyId, setSelectedRegencyId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [areaOptionsLoading, setAreaOptionsLoading] = useState(false);
  const [jaringClusters, setJaringClusters] = useState<JaringClusterOption[]>([]);

  // Inspector Panel State
  const [selection, setSelection] = useState<SelectionType | null>(null);

  const activeAreaId = selectedDistrictId || selectedRegencyId || selectedProvinceId || undefined;
  const queryZoom = Math.round(viewport.zoom);

  const fetchLayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bounds = mapRef.current?.getMap()?.getBounds();
      const bbox = activeAreaId
        ? "94,-12,142,7"
        : bounds
          ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",")
          : "94,-12,142,7";
      const query = { bbox, zoom: queryZoom, limit: 5000, areaId: activeAreaId };

      const [boundariesRes, reportsRes, alertsRes, emergenciesRes, personnelRes] = await Promise.all([
        apiBrowserFetch("/map/boundaries", { query }),
        apiBrowserFetch("/map/reports", { query }),
        apiBrowserFetch("/map/alerts", { query }),
        apiBrowserFetch("/map/emergencies", { query }),
        apiBrowserFetch("/personnel-location-map", { query: { areaId: activeAreaId } }),
      ]);

      setBoundaries(boundariesRes || EMPTY_COLLECTION);
      setReports(reportsRes || EMPTY_COLLECTION);
      setAlerts(alertsRes || EMPTY_COLLECTION);
      setEmergencies(emergenciesRes || EMPTY_COLLECTION);
      setPersonnel(personnelRes || EMPTY_COLLECTION);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat sebagian data peta.");
    } finally {
      setLoading(false);
    }
  }, [activeAreaId, queryZoom]);

  // Initial fetch and auto refresh
  useEffect(() => {
    void fetchLayers();
  }, [fetchLayers]);

  useEffect(() => {
    const interval = setInterval(() => void fetchLayers(), 60_000);
    return () => clearInterval(interval);
  }, [fetchLayers]);

  useEffect(() => {
    let cancelled = false;

    const loadMasterFilters = async () => {
      setAreaOptionsLoading(true);
      try {
        const [countryItems, clusterItems] = await Promise.all([
          apiBrowserFetch<AdministrativeAreaOption[]>("/administrative-areas", {
            query: { level: "COUNTRY", limit: 1000, isActive: true },
          }),
          apiBrowserFetch<JaringClusterOption[]>("/jaring/clusters", {
            query: { limit: 200 },
          }).catch(() => []),
        ]);
        if (cancelled) return;

        setCountries(countryItems || []);
        setJaringClusters(clusterItems || []);

        const defaultCountry = countryItems?.[0];
        if (!defaultCountry) return;

        setSelectedCountryId(defaultCountry.id);
        const provinceItems = await apiBrowserFetch<AdministrativeAreaOption[]>(
          `/administrative-areas/${defaultCountry.id}/children`,
          { query: { level: "PROVINCE" } },
        );
        if (!cancelled) setProvinces(provinceItems || []);
      } catch (masterError) {
        if (!cancelled) {
          setError(masterError instanceof Error ? masterError.message : "Filter master wilayah gagal dimuat.");
        }
      } finally {
        if (!cancelled) setAreaOptionsLoading(false);
      }
    };

    void loadMasterFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  const reportFilterOptions = useMemo(() => {
    const clusters = new Map<string, string>(jaringClusters.map((cluster) => [cluster.id, cluster.name]));

    (reports?.features || []).forEach((feature: any) => {
      const props = feature.properties || {};
      const clusterKey = props.jaringClusterId || props.jaringClusterCode || props.jaringClusterName;
      if (clusterKey) {
        clusters.set(String(clusterKey), String(props.jaringClusterName || props.jaringClusterCode || clusterKey));
      }
    });

    return {
      statuses: [...REPORT_STATUSES],
      urgencies: [...REPORT_URGENCIES],
      clusters: Array.from(clusters.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [jaringClusters, reports]);

  // Filtered personnel data based on active search and dropdown filters
  const filteredPersonnelData = useMemo(() => {
    const features = (personnel?.features || []).filter((feature: any) => {
      if (selectedObjectType === "REPORTS") return false;
      const props = feature.properties || {};
      const status = getPersonnelStatus(props, emergencies?.features || []);

      // Search query evaluation (Username, Unit, Area)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (props.userName || "").toLowerCase().includes(q);
        const matchesUnit = (props.unitName || "").toLowerCase().includes(q);
        const matchesArea = (props.areaName || "").toLowerCase().includes(q);
        if (!matchesName && !matchesUnit && !matchesArea) return false;
      }

      // Status dropdown evaluation
      if (selectedStatus !== "ALL" && status !== selectedStatus) return false;

      // Unit dropdown evaluation
      if (selectedUnitBranch !== "ALL" && getUnitBranch(props) !== selectedUnitBranch) return false;

      return true;
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [personnel, emergencies, searchQuery, selectedStatus, selectedUnitBranch, selectedObjectType]);

  const filteredReportsData = useMemo(() => {
    const features = (reports?.features || []).filter((feature: any) => {
      if (selectedObjectType === "PERSONNEL") return false;
      const props = feature.properties || {};
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesTitle = String(props.title || "")
          .toLowerCase()
          .includes(q);
        const matchesArea = String(props.areaName || "")
          .toLowerCase()
          .includes(q);
        const matchesCategory = String(props.reportCategoryName || "")
          .toLowerCase()
          .includes(q);
        const matchesCluster = String(props.jaringClusterName || "")
          .toLowerCase()
          .includes(q);
        if (!matchesTitle && !matchesArea && !matchesCategory && !matchesCluster) return false;
      }
      if (selectedReportStatus !== "ALL" && props.status !== selectedReportStatus) return false;
      if (selectedReportUrgency !== "ALL" && props.urgency !== selectedReportUrgency) return false;
      if (
        selectedReportCluster !== "ALL" &&
        props.jaringClusterId !== selectedReportCluster &&
        props.jaringClusterCode !== selectedReportCluster &&
        props.jaringClusterName !== selectedReportCluster
      ) {
        return false;
      }
      return true;
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [reports, searchQuery, selectedObjectType, selectedReportStatus, selectedReportUrgency, selectedReportCluster]);

  // Autocomplete search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return (personnel?.features || [])
      .filter((f: any) => {
        const props = f.properties || {};
        return (props.userName || "").toLowerCase().includes(q) || (props.unitName || "").toLowerCase().includes(q);
      })
      .slice(0, 5);
  }, [searchQuery, personnel]);

  // Set up MapLibre custom layer handling
  const mapInstance = mapRef.current?.getMap();

  const handleSelectPersonnel = useCallback(
    async (feature: any) => {
      const coordinates = getCoordinates(feature);
      const assignmentId = stringOrNull(feature?.properties?.assignmentId);
      if (!coordinates || !assignmentId) return;

      const requestId = ++personnelRequestId.current;
      const initialProperties = {
        ...feature.properties,
        status: getPersonnelStatus(feature.properties, emergencies?.features || []),
      };

      setSelection({
        kind: "personnel",
        properties: initialProperties,
        coordinates,
        loading: true,
        detailError: null,
      });
      mapRef.current?.easeTo({
        center: coordinates,
        zoom: 15.5,
        pitch: 60,
        bearing: -18,
        duration: 900,
      });

      try {
        const [assignment, latestPing] = await Promise.all([
          apiBrowserFetch(`/position-assignments/${assignmentId}`),
          apiBrowserFetch(`/personnel-location-pings/${assignmentId}/latest`).catch(() => null),
        ]);
        if (requestId !== personnelRequestId.current) return;

        const properties = mergePersonnelDetails(initialProperties, assignment, latestPing);
        const ping = record(latestPing);
        const pingLongitude = numberOrNull(ping.longitude);
        const pingLatitude = numberOrNull(ping.latitude);
        const resolvedCoordinates: [number, number] =
          pingLongitude !== null && pingLatitude !== null ? [pingLongitude, pingLatitude] : coordinates;

        setSelection((current) => {
          if (!current || current.kind !== "personnel" || current.properties.assignmentId !== assignmentId) {
            return current;
          }
          return {
            ...current,
            properties,
            coordinates: resolvedCoordinates,
            loading: false,
            detailError: null,
          };
        });

        if (pingLongitude !== null && pingLatitude !== null) {
          mapRef.current?.easeTo({
            center: resolvedCoordinates,
            zoom: 15.5,
            pitch: 60,
            bearing: -18,
            duration: 500,
          });
        }
      } catch (detailError) {
        if (requestId !== personnelRequestId.current) return;
        setSelection((current) => {
          if (!current || current.kind !== "personnel" || current.properties.assignmentId !== assignmentId) {
            return current;
          }
          return {
            ...current,
            loading: false,
            detailError:
              detailError instanceof Error ? detailError.message : "Detail personel tidak dapat dimuat dari database.",
          };
        });
      }
    },
    [emergencies],
  );

  usePersonnelMap({
    map: mapInstance || null,
    isReady: mapInstance?.isStyleLoaded() || false,
    personnelData: filteredPersonnelData,
    emergencies: emergencies?.features || [],
    selectedPersonnelId: selection?.kind === "personnel" ? selection.properties.assignmentId : null,

    onSelectPersonnel: handleSelectPersonnel,
    visibleLayers: {
      personnel: layers.personnel,
    },
  });

  // Handle boundary clicks
  const selectBoundary = useCallback(async (feature: any) => {
    const areaId = feature.properties?.areaId;
    if (!areaId) return;
    personnelRequestId.current += 1;

    const bounds = getGeometryBounds(feature.geometry);
    const areaLevel = String(feature.properties?.level || "");
    const areaMaxZoom = areaLevel === "PROVINCE" ? 8 : areaLevel === "REGENCY" || areaLevel === "CITY" ? 11 : 14;
    const areaCenter: [number, number] | undefined = bounds
      ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
      : undefined;

    if (bounds) {
      mapRef.current?.getMap()?.fitBounds(bounds, {
        padding: 56,
        maxZoom: areaMaxZoom,
        pitch: 50,
        bearing: -12,
        duration: 1000,
      });
    }

    setSelection({
      kind: "area",
      properties: feature.properties,
      coordinates: areaCenter,
      summary: {},
      loading: true,
      detailError: null,
    });

    try {
      const summary = record(await apiBrowserFetch("/map/area-summary", { query: { areaId } }));
      const summaryKpis = record(summary.kpis);
      setSelection((current: any) => {
        if (!current || current.kind !== "area" || current.properties.areaId !== areaId) return current;
        return {
          ...current,
          summary: {
            personnelCount: Number(summaryKpis.personnel || 0),
            reportsCount: Number(summaryKpis.bakets || 0),
            alertsCount: Number(summaryKpis.alerts || 0),
            unitsCount: Number(summaryKpis.units || 0),
            emergenciesCount: Number(summaryKpis.emergencies || 0),
          },
          loading: false,
          detailError: null,
        };
      });
    } catch (summaryError) {
      setSelection((current) => {
        if (!current || current.kind !== "area" || current.properties.areaId !== areaId) return current;
        return {
          ...current,
          loading: false,
          detailError:
            summaryError instanceof Error
              ? summaryError.message
              : "Ringkasan wilayah tidak dapat dimuat dari database.",
        };
      });
    }
  }, []);

  const handleBoundaryClick = useCallback(
    ({ feature, rawEvent }: any) => {
      const map = mapRef.current?.getMap();
      const clickedPersonnel = map?.getLayer("personnel-points")
        ? map.queryRenderedFeatures(rawEvent.point, { layers: ["personnel-points"] })
        : [];

      if (clickedPersonnel?.length) return;
      void selectBoundary(feature);
    },
    [selectBoundary],
  );

  // Handle click on search result item
  const handleSelectSearchResult = (feature: any) => {
    const coords = feature.geometry?.coordinates;
    if (coords) {
      setSearchQuery(feature.properties.userName || "");
      void handleSelectPersonnel(feature);
    }
  };

  const handleSelectReport = useCallback(async (feature: any) => {
    const coordinates = getCoordinates(feature);
    const baketId = stringOrNull(feature?.properties?.baketId);
    if (!coordinates || !baketId) return;
    personnelRequestId.current += 1;
    const requestId = ++reportRequestId.current;
    setSelection({
      kind: "report",
      properties: feature.properties || {},
      coordinates,
      loading: true,
      detailError: null,
    });
    mapRef.current?.easeTo({
      center: coordinates,
      zoom: 13.5,
      pitch: 60,
      bearing: -18,
      duration: 850,
    });

    try {
      const detail = await apiBrowserFetch(`/bakets/${baketId}`);
      if (requestId !== reportRequestId.current) return;
      setSelection((current) => {
        if (!current || current.kind !== "report" || current.properties.baketId !== baketId) return current;
        return {
          ...current,
          properties: mergeReportDetails(current.properties, detail),
          loading: false,
          detailError: null,
        };
      });
    } catch (detailError) {
      if (requestId !== reportRequestId.current) return;
      setSelection((current) => {
        if (!current || current.kind !== "report" || current.properties.baketId !== baketId) return current;
        return {
          ...current,
          loading: false,
          detailError: detailError instanceof Error ? detailError.message : "Detail baket tidak dapat dimuat.",
        };
      });
    }
  }, []);

  const focusAdministrativeArea = useCallback(async (area: AdministrativeAreaOption | undefined) => {
    if (!area) return false;
    const maxZoom = area.level === "COUNTRY" ? 5 : area.level === "PROVINCE" ? 8 : area.level === "DISTRICT" ? 14 : 11;

    try {
      const boundary = record(
        await apiBrowserFetch(`/administrative-areas/${area.id}/boundary`, {
          query: { simplifyMeters: area.level === "COUNTRY" ? 3000 : 300 },
        }),
      );
      const bounds = getGeometryBounds(boundary.geometry);
      if (bounds && areBoundsInIndonesia(bounds)) {
        mapRef.current?.getMap()?.fitBounds(bounds, {
          padding: 56,
          maxZoom,
          pitch: 55,
          bearing: -15,
          duration: 900,
        });
        return true;
      }
    } catch {
      // Centroid remains a valid fallback when an area has no active polygon.
    }

    const longitude = numberOrNull(area.centroidLongitude);
    const latitude = numberOrNull(area.centroidLatitude);
    if (longitude === null || latitude === null || !isCoordinateInIndonesia(longitude, latitude)) return false;
    mapRef.current?.easeTo({
      center: [longitude, latitude],
      zoom: maxZoom,
      pitch: 55,
      bearing: -15,
      duration: 900,
    });
    return true;
  }, []);

  const focusDistrictFromOpenStreetMap = useCallback(
    async (
      district: AdministrativeAreaOption,
      regency: AdministrativeAreaOption | undefined,
      province: AdministrativeAreaOption | undefined,
    ) => {
      let focus = districtFocusCache.current.get(district.id) ?? null;

      if (!focus) {
        const query = [
          normalizeAreaNameForGeocoding(district.name),
          regency ? normalizeAreaNameForGeocoding(regency.name) : null,
          province ? normalizeAreaNameForGeocoding(province.name) : null,
          "Indonesia",
        ]
          .filter(Boolean)
          .join(", ");
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          countrycodes: "id",
          limit: "1",
          "accept-language": "id",
        });

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
          if (!response.ok) return false;
          const results = (await response.json()) as NominatimResult[];
          focus = getNominatimFocus(results[0]);
          if (!focus) return false;
          districtFocusCache.current.set(district.id, focus);
        } catch {
          return false;
        }
      }

      if (focus.kind === "bounds") {
        mapRef.current?.getMap()?.fitBounds(focus.bounds, {
          padding: 64,
          maxZoom: 13,
          pitch: 55,
          bearing: -15,
          duration: 900,
        });
      } else {
        mapRef.current?.easeTo({
          center: focus.center,
          zoom: 12,
          pitch: 55,
          bearing: -15,
          duration: 900,
        });
      }
      return true;
    },
    [],
  );

  const handleCountryChange = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedProvinceId("");
    setSelectedRegencyId("");
    setSelectedDistrictId("");
    setRegencies([]);
    setDistricts([]);
    const country = countries.find((area) => area.id === countryId);
    if (!country) {
      setProvinces([]);
      mapRef.current?.easeTo({
        center: INDONESIA_CENTER,
        zoom: 4.2,
        pitch: 60,
        bearing: -18,
        duration: 800,
      });
      return;
    }

    setAreaOptionsLoading(true);
    try {
      const items = await apiBrowserFetch<AdministrativeAreaOption[]>(`/administrative-areas/${countryId}/children`, {
        query: { level: "PROVINCE" },
      });
      setProvinces(items || []);
      await focusAdministrativeArea(country);
    } catch (areaError) {
      setError(areaError instanceof Error ? areaError.message : "Daftar provinsi gagal dimuat.");
    } finally {
      setAreaOptionsLoading(false);
    }
  };

  const handleProvinceChange = async (provinceId: string) => {
    setSelectedProvinceId(provinceId);
    setSelectedRegencyId("");
    setSelectedDistrictId("");
    setDistricts([]);
    const province = provinces.find((area) => area.id === provinceId);
    if (!province) {
      setRegencies([]);
      await focusAdministrativeArea(countries.find((area) => area.id === selectedCountryId));
      return;
    }

    setAreaOptionsLoading(true);
    try {
      const items = await apiBrowserFetch<AdministrativeAreaOption[]>(`/administrative-areas/${provinceId}/children`);
      setRegencies((items || []).filter((area) => area.level === "REGENCY" || area.level === "CITY"));
      await focusAdministrativeArea(province);
    } catch (areaError) {
      setError(areaError instanceof Error ? areaError.message : "Daftar kabupaten/kota gagal dimuat.");
    } finally {
      setAreaOptionsLoading(false);
    }
  };

  const handleRegencyChange = async (regencyId: string) => {
    setSelectedRegencyId(regencyId);
    setSelectedDistrictId("");
    const regency = regencies.find((area) => area.id === regencyId);
    if (!regency) {
      setDistricts([]);
      await focusAdministrativeArea(provinces.find((area) => area.id === selectedProvinceId));
      return;
    }

    setAreaOptionsLoading(true);
    try {
      const items = await apiBrowserFetch<AdministrativeAreaOption[]>(`/administrative-areas/${regencyId}/children`, {
        query: { level: "DISTRICT" },
      });
      setDistricts(items || []);
      await focusAdministrativeArea(regency);
    } catch (areaError) {
      setError(areaError instanceof Error ? areaError.message : "Daftar kecamatan gagal dimuat.");
    } finally {
      setAreaOptionsLoading(false);
    }
  };

  const handleDistrictChange = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    setAreaOptionsLoading(true);
    try {
      const district = districts.find((area) => area.id === districtId);
      if (district) {
        const focused = await focusAdministrativeArea(district);
        if (focused) return;

        const regency = regencies.find((area) => area.id === selectedRegencyId);
        const province = provinces.find((area) => area.id === selectedProvinceId);
        const geocoded = await focusDistrictFromOpenStreetMap(district, regency, province);
        if (!geocoded) await focusAdministrativeArea(regency);
        return;
      }
      await focusAdministrativeArea(regencies.find((area) => area.id === selectedRegencyId));
    } finally {
      setAreaOptionsLoading(false);
    }
  };

  const handleResetFilters = () => {
    personnelRequestId.current += 1;
    reportRequestId.current += 1;
    setSearchQuery("");
    setSelectedObjectType("ALL");
    setSelectedStatus("ALL");
    setSelectedUnitBranch("ALL");
    setSelectedReportStatus("ALL");
    setSelectedReportUrgency("ALL");
    setSelectedReportCluster("ALL");
    setSelectedProvinceId("");
    setSelectedRegencyId("");
    setSelectedDistrictId("");
    setRegencies([]);
    setDistricts([]);
    setSelection(null);
    mapRef.current?.easeTo({
      center: INDONESIA_CENTER,
      zoom: 4.2,
      pitch: 60,
      bearing: -18,
      duration: 800,
    });
  };

  // Compute metric totals
  const counts = useMemo(
    () => ({
      reports: filteredReportsData.features.length,
      personnel: filteredPersonnelData.features.length,
      alerts: alerts?.features?.length || 0,
      emergencies: emergencies?.features?.length || 0,
    }),
    [filteredReportsData.features.length, filteredPersonnelData.features.length, alerts, emergencies],
  );

  const highRisk = useMemo(() => {
    const items = [...(alerts?.features || []), ...(emergencies?.features || [])];
    return items.filter((f: any) => ["HIGH", "CRITICAL", "EMERGENCY"].includes(f.properties?.severity)).length;
  }, [alerts, emergencies]);

  const hierarchyLevelLabel = (zoom: number) => {
    if (zoom <= 5) return "Provinsi / Binda";
    if (zoom <= 8.5) return "Kabupaten / Kota";
    return "Kecamatan";
  };

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-4 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <header className="flex flex-col gap-3 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Gambaran operasional bersama / sesuai kebutuhan
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Peta Kerawanan Nasional</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Baket, personel lapangan, batas administratif, peringatan, dan insiden dalam cakupan komando aktif.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            <Layers3 className="size-3.5 mr-1" /> {hierarchyLevelLabel(viewport.zoom)}
          </Badge>
          <Badge variant={highRisk ? "destructive" : "secondary"} className="font-mono text-xs">
            <ShieldAlert className="size-3.5 mr-1" /> {highRisk} eskalasi tinggi
          </Badge>
          {loading ? (
            <Badge variant="secondary" className="font-mono text-xs">
              <LoaderCircle className="animate-spin size-3.5 mr-1" /> Sinkronisasi
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-xs">
              <Radio className="size-3.5 mr-1 text-emerald-500" /> Data aktif
            </Badge>
          )}
        </div>
      </header>

      {/* Metric Cards Section */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "reports" as const, label: "Baket terpetakan", value: counts.reports, icon: FileText },
          { key: "personnel" as const, label: "Personel dalam cakupan", value: counts.personnel, icon: UserRound },
          { key: "alerts" as const, label: "Peringatan pada peta", value: counts.alerts, icon: AlertTriangle },
          { key: "emergencies" as const, label: "Insiden darurat", value: counts.emergencies, icon: ShieldAlert },
        ].map((metric) => (
          <button
            key={metric.key}
            type="button"
            onClick={() => setLayers((current) => ({ ...current, [metric.key]: !current[metric.key] }))}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-pressed={layers[metric.key]}
          >
            <Card
              className={cn(
                "h-full transition-colors rounded-[8px]",
                layers[metric.key] ? "border-primary/45 bg-primary/[0.02]" : "opacity-55",
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold">{metric.value}</p>
                </div>
                <metric.icon className="size-5 text-primary" />
              </CardContent>
            </Card>
          </button>
        ))}
      </section>

      {/* Map Search, Filters, and Render Split Grid */}
      <div className="space-y-4">
        {/* Search, Layer toggles, and filters Toolbar */}
        <Card className="border border-border bg-card shadow-xs rounded-[8px]">
          <CardContent className="p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
              <Input
                placeholder="Cari personel, unit, wilayah..."
                className="pl-9 h-9 text-xs rounded-[4px] border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* Search Suggestions Dropdown */}
              {searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-50 bg-background/95 backdrop-blur-md border border-border shadow-md rounded-[4px] overflow-hidden">
                  {searchSuggestions.map((f: any) => (
                    <button
                      type="button"
                      key={f.id || f.properties.assignmentId}
                      onClick={() => handleSelectSearchResult(f)}
                      className="w-full text-left px-3 py-2 text-[11px] hover:bg-accent hover:text-accent-foreground flex items-center justify-between border-b border-border/20 last:border-0 cursor-pointer"
                    >
                      <span>{f.properties.userName}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{f.properties.unitName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn("h-9 rounded-[4px] border-border text-xs cursor-pointer", isFilterOpen && "bg-accent")}
              >
                <SlidersHorizontal className="size-3.5 mr-1" />
                Filter
              </Button>

              <Button
                variant="ghost"
                size="xs"
                onClick={handleResetFilters}
                className="h-9 px-2 text-[10px] uppercase font-mono text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Atur Ulang
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchLayers}
                disabled={loading}
                className="h-9 w-9 rounded-[4px] border-border cursor-pointer"
              >
                <RefreshCw className={cn("size-3.5 text-muted-foreground", loading && "animate-spin")} />
              </Button>
            </div>
          </CardContent>

          {/* Expanded filter options */}
          {isFilterOpen && (
            <div className="px-4 pb-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-3 bg-secondary/5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Objek Peta</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedObjectType}
                  onChange={(e) => setSelectedObjectType(e.target.value as ObjectFilter)}
                >
                  <option value="ALL">SEMUA</option>
                  <option value="PERSONNEL">PERSONEL</option>
                  <option value="REPORTS">BAKET</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Nasional</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedCountryId}
                  onChange={(e) => void handleCountryChange(e.target.value)}
                  disabled={areaOptionsLoading}
                >
                  <option value="">SEMUA</option>
                  {countries.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Provinsi</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedProvinceId}
                  onChange={(e) => void handleProvinceChange(e.target.value)}
                  disabled={!selectedCountryId || areaOptionsLoading}
                >
                  <option value="">SEMUA</option>
                  {provinces.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">
                  Kabupaten / Kota
                </span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedRegencyId}
                  onChange={(e) => void handleRegencyChange(e.target.value)}
                  disabled={!selectedProvinceId || areaOptionsLoading}
                >
                  <option value="">SEMUA</option>
                  {regencies.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Kecamatan</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedDistrictId}
                  onChange={(e) => void handleDistrictChange(e.target.value)}
                  disabled={!selectedRegencyId || areaOptionsLoading}
                >
                  <option value="">SEMUA</option>
                  {districts.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">
                  Status Personel
                </span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">SEMUA</option>
                  <option value="ACTIVE">AKTIF</option>
                  <option value="SUPERVISOR">PENGAWAS</option>
                  <option value="DUTY">SEDANG BERTUGAS</option>
                  <option value="EMERGENCY">DARURAT</option>
                  <option value="OFFLINE">TIDAK AKTIF</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Unit Kerja</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono truncate focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedUnitBranch}
                  onChange={(e) => setSelectedUnitBranch(e.target.value as UnitBranchFilter)}
                >
                  <option value="ALL">SEMUA</option>
                  <option value="BINDA">BINDA</option>
                  <option value="DIRECTORATE">DIREKTORAT</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Status Baket</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedReportStatus}
                  onChange={(e) => setSelectedReportStatus(e.target.value)}
                >
                  <option value="ALL">SEMUA</option>
                  {reportFilterOptions.statuses.map((status) => (
                    <option key={status} value={status}>
                      {REPORT_STATUS_LABELS[status as keyof typeof REPORT_STATUS_LABELS] ?? status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Urgensi Baket</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedReportUrgency}
                  onChange={(e) => setSelectedReportUrgency(e.target.value)}
                >
                  <option value="ALL">SEMUA</option>
                  {reportFilterOptions.urgencies.map((urgency) => (
                    <option key={urgency} value={urgency}>
                      {REPORT_URGENCY_LABELS[urgency as keyof typeof REPORT_URGENCY_LABELS] ?? urgency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">
                  Kelompok Baket
                </span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono truncate focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedReportCluster}
                  onChange={(e) => setSelectedReportCluster(e.target.value)}
                >
                  <option value="ALL">SEMUA</option>
                  {reportFilterOptions.clusters.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Map panel */}
        <div className="space-y-4">
          <Card className="overflow-hidden border border-border relative rounded-[8px]">
            <div className="relative h-[65vh] min-h-[500px] max-h-[850px]">
              <BaseMap
                ref={mapRef}
                center={INDONESIA_CENTER}
                zoom={4.2}
                minZoom={3}
                maxZoom={18}
                pitch={60}
                bearing={-18}
                styles={MAP_STYLES}
                onViewportChange={setViewport}
              >
                {/* Standard controls */}
                <MapControls showZoom showCompass showFullscreen position="top-right" />

                {/* Boundaries Layer */}
                <MapGeoJSON
                  data={boundaries as any}
                  promoteId="areaId"
                  interactive
                  fillPaint={{ "fill-color": "#10b981", "fill-opacity": 0.05 }}
                  fillHoverPaint={{ "fill-color": "#10b981", "fill-opacity": 0.15 }}
                  linePaint={{ "line-color": "#10b981", "line-width": 1, "line-opacity": 0.55 }}
                  onClick={handleBoundaryClick}
                />

                {layers.reports
                  ? filteredReportsData.features.map((feature: any) => (
                      <ReportMarker
                        key={String(feature.id || feature.properties?.baketId)}
                        feature={feature}
                        onSelect={() => handleSelectReport(feature)}
                      />
                    ))
                  : null}
              </BaseMap>
            </div>
          </Card>

          <MapLegend />

          <div className="w-full">
            <MapInspector
              selection={selection}
              onClear={() => {
                personnelRequestId.current += 1;
                reportRequestId.current += 1;
                setSelection(null);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function ReportMarker({ feature, onSelect }: { feature: any; onSelect: () => void }) {
  const coordinates = getCoordinates(feature);
  if (!coordinates) return null;

  const properties = feature.properties || {};
  const urgency = String(properties.urgency || "NORMAL") as keyof typeof REPORT_URGENCY_COLORS;
  const markerColor = REPORT_URGENCY_COLORS[urgency] ?? REPORT_URGENCY_COLORS.NORMAL;

  return (
    <MapMarker longitude={coordinates[0]} latitude={coordinates[1]}>
      <button
        type="button"
        onClick={onSelect}
        title={properties.title || "Baket terpetakan"}
        aria-label={`Buka hasil analisa ${properties.title || "Baket"}`}
        className="grid size-5 cursor-pointer place-items-center rounded-full border-2 border-white/90 shadow-lg transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{ backgroundColor: markerColor, boxShadow: `0 0 0 4px ${markerColor}30` }}
      >
        <span className="size-1.5 rounded-full bg-white" />
      </button>
    </MapMarker>
  );
}
export default NationalMap;
