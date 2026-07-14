"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Compass,
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
import { Map as BaseMap, MapControls, MapGeoJSON, type MapRef, type MapViewport } from "@/components/ui/map";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import { MapInspector, type SelectionType } from "./MapInspector";
import { MapLegend } from "./MapLegend";
import { usePersonnelMap } from "./usePersonnelMap";
import { getCoordinates, getPersonnelStatus } from "./utils/mapHelpers";

const INDONESIA_CENTER: [number, number] = [117.5, -2.5];
const EMPTY_COLLECTION = { type: "FeatureCollection", features: [] };
const OPENSTREETMAP_3D_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAP_STYLES = {
  light: OPENSTREETMAP_3D_STYLE,
  dark: OPENSTREETMAP_3D_STYLE,
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
    unitCode: stringOrNull(unit.code),
    unitName: stringOrNull(unit.name) ?? featureProperties.unitName,
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

export function NationalMap() {
  const mapRef = useRef<MapRef>(null);
  const personnelRequestId = useRef(0);

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
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Inspector Panel State
  const [selection, setSelection] = useState<SelectionType | null>(null);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);

  const fetchLayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bounds = mapRef.current?.getMap()?.getBounds();
      const bbox = bounds
        ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",")
        : "94,-12,142,7";
      const query = { bbox, zoom: Math.round(viewport.zoom), limit: 1000 };

      const [boundariesRes, reportsRes, alertsRes, emergenciesRes, personnelRes] = await Promise.all([
        apiBrowserFetch("/map/boundaries", { query }),
        apiBrowserFetch("/map/reports", { query }),
        apiBrowserFetch("/map/alerts", { query }),
        apiBrowserFetch("/map/emergencies", { query }),
        apiBrowserFetch("/personnel-location-map"),
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
  }, [viewport.zoom]);

  // Initial fetch and auto refresh
  useEffect(() => {
    void fetchLayers();
  }, [fetchLayers]);

  useEffect(() => {
    const interval = setInterval(() => void fetchLayers(), 60_000);
    return () => clearInterval(interval);
  }, [fetchLayers]);

  // Extract unique units for filtering
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    (personnel?.features || []).forEach((f: any) => {
      if (f.properties?.unitName) {
        units.add(f.properties.unitName);
      }
    });
    return Array.from(units).sort();
  }, [personnel]);

  // Filtered personnel data based on active search and dropdown filters
  const filteredPersonnelData = useMemo(() => {
    const features = (personnel?.features || []).filter((feature: any) => {
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
      if (selectedUnit !== "ALL" && props.unitName !== selectedUnit) return false;

      return true;
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [personnel, emergencies, searchQuery, selectedStatus, selectedUnit]);

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
      setIsInspectorCollapsed(false);
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
    setIsInspectorCollapsed(false);

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

  const handleResetFilters = () => {
    personnelRequestId.current += 1;
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedUnit("ALL");
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
      reports: reports?.features?.length || 0,
      personnel: personnel?.features?.length || 0,
      alerts: alerts?.features?.length || 0,
      emergencies: emergencies?.features?.length || 0,
    }),
    [reports, personnel, alerts, emergencies],
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
            Common operating picture / need-to-know
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Peta Kerawanan Nasional</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Baket, personel lapangan, boundary administratif, alert, dan insiden dalam scope komando aktif.
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
          { key: "personnel" as const, label: "Personel dalam scope", value: counts.personnel, icon: UserRound },
          { key: "alerts" as const, label: "Alert viewport", value: counts.alerts, icon: AlertTriangle },
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
                Reset
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
            <div className="px-4 pb-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 bg-secondary/5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Status</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">SEMUA STATUS</option>
                  <option value="ACTIVE">AKTIF</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="DUTY">BERTUGAS</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-muted-foreground/80 font-bold">Unit Kerja</span>
                <select
                  className="w-full h-8 text-[11px] bg-background border border-border rounded-[4px] px-2 text-foreground font-mono truncate focus:ring-1 focus:ring-primary cursor-pointer"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="ALL">SEMUA UNIT</option>
                  {uniqueUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Map & Inspector panels */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start relative">
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

                {/* Legend panel */}
                <MapLegend />
              </BaseMap>

              {/* Inspector toggle (Desktop) */}
              <div className="absolute right-4 bottom-4 z-10 hidden xl:block pointer-events-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
                  className="size-8 rounded-full bg-background/90 backdrop-blur shadow-md hover:bg-accent border-border cursor-pointer"
                >
                  {isInspectorCollapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Right Inspector Panel wrapper */}
          <div
            className={cn(
              "w-full transition-all duration-300 xl:h-[65vh] xl:min-h-[500px] xl:max-h-[850px]",
              isInspectorCollapsed ? "xl:w-0 xl:overflow-hidden xl:hidden" : "xl:block",
            )}
          >
            <MapInspector
              selection={selection}
              onClear={() => {
                personnelRequestId.current += 1;
                setSelection(null);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
export default NationalMap;
