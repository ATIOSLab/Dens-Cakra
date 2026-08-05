"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  JaringReportSessionDetail,
  PriorityLevel,
  ReportCategoryOption,
} from "@/app/(main)/dashboard/laporan-jaring/_components/laporan-jaring-types";
import { type JaringOption } from "@/components/ui/jaring-select-popover";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

import { MapsIntelijenDetailModal } from "./maps-intelijen-detail-modal";
import { MapsIntelijenHeader } from "./maps-intelijen-header";
import { MapsIntelijenMapView } from "./maps-intelijen-map-view";
import { MapsIntelijenStats } from "./maps-intelijen-stats";
import { MapsIntelijenTableView } from "./maps-intelijen-table-view";
import {
  type AdministrativeAreaScope,

  formatFullAreaName,
  formatRelativeTime,
  isReadByFieldOfficer,
  isRegencyLevel,
  type MapIntelItem,
  type PaginatedJaringResponse,
  type PaginatedReportResponse,
  type PeriodPreset,
  type RawJaringItem,
  type ReportCategoryResponse,
  resolveCoordinates,
  SAMPLE_MOCK_REPORTS,
} from "./maps-intelijen-types";

export function MapsIntelijenNetworkClient() {
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [categories, setCategories] = useState<ReportCategoryOption[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dataRequestInFlight = useRef(false);

  // OSIRIS Zulu Live Clock
  const [zuluTime, setZuluTime] = useState<string>("");
  const [wibTime, setWibTime] = useState<string>("");

  // Map Card Ref & Fullscreen State
  const mapCardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Map Navigation & Pitch/3D State
  const [mapCenter, setMapCenter] = useState<[number, number]>([106.8456, -6.2088]);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [mapPitch, setMapPitch] = useState<number>(0);

  // Marker Hover & Active Popup State
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // OSIRIS Floating Panel & Drawers State
  const [panelOpen, setPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [tickerOpen, setTickerOpen] = useState(true);

  // Map Layer State
  const [mapLayer, setMapLayer] = useState<"dark" | "satellite" | "terrain" | "light" | "osm">("dark");

  // Unified Filter State
  const [activeTab, setActiveTab] = useState<"ALL" | "LAPORAN" | "BAKET">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [readFilter, setReadFilter] = useState<"ALL" | "READ" | "UNREAD">("ALL");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Hierarchical Area Filters
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");

  // Period / Date Range Filter State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<MapIntelItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const matchingJaring = useMemo(() => {
    if (!selectedItem) return null;
    return jaringList.find(
      (j) => j.id === selectedItem.report.jaringId,
    );
  }, [selectedItem, jaringList]);

  const jaringPhotoUrl = useMemo(() => {
    if (!selectedItem) return null;
    const rep = selectedItem.report as any;
    const directPhoto =
      rep.jaringProfilePhotoUrl ||
      rep.jaringPhotoUrl ||
      (rep.jaringProfilePhotoFileId ? `/api/files/${rep.jaringProfilePhotoFileId}` : null);
    if (directPhoto) return directPhoto;

    if (matchingJaring) {
      if ((matchingJaring as any).profilePhotoUrl) return (matchingJaring as any).profilePhotoUrl;
      if ((matchingJaring as any).profilePhotoFileId)
        return `/api/files/${(matchingJaring as any).profilePhotoFileId}`;
    }

    return null;
  }, [selectedItem, matchingJaring]);

  const gaswilName = selectedItem?.report.gaswilName || "Petugas Gaswil (Wilayah)";

  const gaswilPhotoUrl = useMemo(() => {
    if (!selectedItem) return null;
    const rep = selectedItem.report as any;
    const directPhoto =
      rep.gaswilProfilePhotoUrl ||
      rep.gaswilPhotoUrl ||
      (rep.gaswilProfilePhotoFileId ? `/api/files/${rep.gaswilProfilePhotoFileId}` : null);
    if (directPhoto) return directPhoto;

    return null;
  }, [selectedItem]);

  // Live UTC+7 (WIB) Live Clock effect
  useEffect(() => {
    function updateClock() {
      const d = new Date();
      const formattedWib = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(d);

      setZuluTime(`UTC+7 ${formattedWib}`);
      setWibTime(`${formattedWib} WIB`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen Change Listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleMapFullscreen() {
    if (!document.fullscreenElement) {
      void mapCardRef.current?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }

  // Fetch Data
  async function fetchAllData(silent = false) {
    if (dataRequestInFlight.current) return;
    dataRequestInFlight.current = true;
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const [reportsRes, jaringRes, categoryRes, areaScopesRes] = await Promise.allSettled([
        apiBrowserFetch<PaginatedReportResponse | JaringReportSessionDetail[]>("/jaring/reports?limit=100"),
        apiBrowserFetch<PaginatedJaringResponse | RawJaringItem[]>("/jaring?limit=100"),
        apiBrowserFetch<ReportCategoryResponse>("/jaring/report-categories"),
        apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", { query: { includeDescendants: true } }),
      ]);

      let fetchedReports: JaringReportSessionDetail[] = [];
      if (reportsRes.status === "fulfilled" && reportsRes.value) {
        const val = reportsRes.value;
        fetchedReports = Array.isArray(val) ? val : val.items || [];
      }

      let fetchedJaring: RawJaringItem[] = [];
      if (jaringRes.status === "fulfilled" && jaringRes.value) {
        const val = jaringRes.value;
        fetchedJaring = Array.isArray(val) ? val : val.items || [];
      }

      let fetchedCategories: ReportCategoryOption[] = [];
      if (categoryRes.status === "fulfilled" && categoryRes.value) {
        const val = categoryRes.value;
        if (Array.isArray(val)) {
          fetchedCategories = val;
        } else if (val && "items" in val && Array.isArray(val.items)) {
          fetchedCategories = val.items;
        }
      }

      let fetchedScopes: AdministrativeAreaScope[] = [];
      if (areaScopesRes.status === "fulfilled" && Array.isArray(areaScopesRes.value)) {
        fetchedScopes = areaScopesRes.value;
      }

      setReports(fetchedReports);
      setJaringList(fetchedJaring);
      setCategories(fetchedCategories);
      setAreaScopes(fetchedScopes);
    } catch (err) {
      console.error("Gagal memuat data maps intelijen network:", err);
      setLoadError("Terjadi kendala memuat data server.");
      setReports([]);
    } finally {
      dataRequestInFlight.current = false;
      if (!silent) setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial mount fetch
  useEffect(() => {
    void fetchAllData();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchAllData(true);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  // Compute unified MapIntelItem list
  const allIntelItems = useMemo<MapIntelItem[]>(() => {
    return reports.map((r) => {
      const isBaket = r.verificationStatus === "METADATA_RECORDED";
      const coords = resolveCoordinates(r);
      const urgency: PriorityLevel = (r.urgency as PriorityLevel) || "NORMAL";
      const jaringName = r.jaringAlias || r.jaringId || "Jaring Sembunyi";
      const jaringCode = r.jaringAlias || r.jaringId || "-";
      const locationName = formatFullAreaName(r.resolvedArea);
      const submittedAt = r.reportedAt || r.submittedAt || r.createdAt;
      const displayTitle = r.displayTitle || r.content?.slice(0, 60) || (isBaket ? "Baket" : "Laporan Jaring");
      const content = r.content || r.normalizedContent || "-";
      const hasBeenRead = isReadByFieldOfficer(r);

      return {
        id: r.id,
        report: r,
        isBaket,
        coordinates: coords,
        displayTitle,
        content,
        urgency,
        verificationStatus: r.verificationStatus,
        jaringName,
        jaringCode,
        locationName,
        submittedAt,
        categoryId: r.reportCategory?.id ?? null,
        hasBeenRead,
      };
    });
  }, [reports]);

  // Options for Jaring Popover
  const popoverJaringOptions: JaringOption[] = useMemo(() => {
    return jaringList.map((j) => ({
      id: j.id,
      code: j.aliasName || j.fullName || j.id,
      aliasName: j.aliasName || j.fullName || j.id,
      fullName: j.fullName,
      registrationStatus: j.registrationStatus,
    }));
  }, [jaringList]);

  // Options for Regency / District / Village filters
  const regencyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const area of areaScopes) {
      if (isRegencyLevel(area.level)) {
        map.set(area.areaId, { id: area.areaId, name: area.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes]);

  const districtOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    if (regencyFilter !== "ALL") {
      const selectedRegency = areaScopes.find((a) => a.areaId === regencyFilter);
      const selectedCode = selectedRegency?.officialCode || selectedRegency?.code;

      for (const area of areaScopes) {
        if (area.level === "DISTRICT" || area.level === "KECAMATAN") {
          if (area.parentAreaId === regencyFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
            map.set(area.areaId, { id: area.areaId, name: area.name });
          }
        }
      }
    } else {
      for (const area of areaScopes) {
        if (area.level === "DISTRICT" || area.level === "KECAMATAN") {
          map.set(area.areaId, { id: area.areaId, name: area.name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, regencyFilter]);

  const villageOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    if (districtFilter !== "ALL") {
      const selectedDistrict = areaScopes.find((a) => a.areaId === districtFilter);
      const selectedCode = selectedDistrict?.officialCode || selectedDistrict?.code;

      for (const area of areaScopes) {
        if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE" || area.level === "DESA" || area.level === "KELURAHAN") {
          if (area.parentAreaId === districtFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
            map.set(area.areaId, { id: area.areaId, name: area.name });
          }
        }
      }
    } else {
      for (const area of areaScopes) {
        if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE" || area.level === "DESA" || area.level === "KELURAHAN") {
          map.set(area.areaId, { id: area.areaId, name: area.name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, districtFilter]);

  // Base filtered items
  const baseFilteredItems = useMemo(() => {
    const now = new Date();

    return allIntelItems.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const refNum = (item.report.referenceNumber || "").toLowerCase();
        const matchTitle = item.displayTitle.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchJaring = item.jaringName.toLowerCase().includes(q) || item.jaringCode.toLowerCase().includes(q);
        const matchLocation = item.locationName.toLowerCase().includes(q);
        const matchRef = refNum.includes(q);

        if (!matchTitle && !matchContent && !matchJaring && !matchLocation && !matchRef) {
          return false;
        }
      }

      if (urgencyFilter !== "ALL" && item.urgency !== urgencyFilter) return false;
      if (statusFilter !== "ALL" && item.verificationStatus !== statusFilter) return false;
      if (readFilter === "READ" && !item.hasBeenRead) return false;
      if (readFilter === "UNREAD" && item.hasBeenRead) return false;
      if (jaringFilter !== "ALL" && item.report.jaringId !== jaringFilter) return false;
      if (categoryFilter !== "ALL" && item.categoryId !== categoryFilter) return false;

      if (regencyFilter !== "ALL") {
        const selectedRegency = regencyOptions.find((r) => r.id === regencyFilter);
        if (selectedRegency) {
          const regName = selectedRegency.name.toLowerCase();
          const locStr = item.locationName.toLowerCase();
          if (!locStr.includes(regName)) {
            let areaObj = item.report.resolvedArea;
            let matched = false;
            while (areaObj) {
              if (areaObj.id === regencyFilter || areaObj.name?.toLowerCase().includes(regName)) {
                matched = true;
                break;
              }
              areaObj = areaObj.parent ?? null;
            }
            if (!matched) return false;
          }
        }
      }

      if (districtFilter !== "ALL") {
        const selectedDistrict = districtOptions.find((d) => d.id === districtFilter);
        if (selectedDistrict) {
          const distName = selectedDistrict.name.toLowerCase();
          const locStr = item.locationName.toLowerCase();
          if (!locStr.includes(distName)) {
            let areaObj = item.report.resolvedArea;
            let matched = false;
            while (areaObj) {
              if (areaObj.id === districtFilter || areaObj.name?.toLowerCase().includes(distName)) {
                matched = true;
                break;
              }
              areaObj = areaObj.parent ?? null;
            }
            if (!matched) return false;
          }
        }
      }

      if (villageFilter !== "ALL") {
        const selectedVillage = villageOptions.find((v) => v.id === villageFilter);
        if (selectedVillage) {
          const villName = selectedVillage.name.toLowerCase();
          const locStr = item.locationName.toLowerCase();
          if (!locStr.includes(villName)) {
            let areaObj = item.report.resolvedArea;
            let matched = false;
            while (areaObj) {
              if (areaObj.id === villageFilter || areaObj.name?.toLowerCase().includes(villName)) {
                matched = true;
                break;
              }
              areaObj = areaObj.parent ?? null;
            }
            if (!matched) return false;
          }
        }
      }

      const itemTime = new Date(item.submittedAt).getTime();
      if (periodPreset === "TODAY") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (itemTime < startOfDay) return false;
      } else if (periodPreset === "LAST_7_DAYS") {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
        if (itemTime < sevenDaysAgo) return false;
      } else if (periodPreset === "LAST_30_DAYS") {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 3600 * 1000;
        if (itemTime < thirtyDaysAgo) return false;
      } else if (periodPreset === "THIS_MONTH") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (itemTime < startOfMonth) return false;
      } else if (periodPreset === "CUSTOM") {
        if (startDate) {
          const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
          if (itemTime < startTimestamp) return false;
        }
        if (endDate) {
          const endTimestamp = new Date(`${endDate}T23:59:59`).getTime();
          if (itemTime > endTimestamp) return false;
        }
      }

      return true;
    });
  }, [
    allIntelItems,
    search,
    urgencyFilter,
    statusFilter,
    readFilter,
    jaringFilter,
    categoryFilter,
    regencyFilter,
    regencyOptions,
    districtFilter,
    districtOptions,
    villageFilter,
    villageOptions,
    periodPreset,
    startDate,
    endDate,
  ]);

  const filteredItems = useMemo(() => {
    return baseFilteredItems.filter((item) => {
      if (activeTab === "LAPORAN" && item.isBaket) return false;
      if (activeTab === "BAKET" && !item.isBaket) return false;
      return true;
    });
  }, [baseFilteredItems, activeTab]);

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredItems.slice(startIndex, startIndex + limit);
  }, [filteredItems, page, limit]);

  const metrics = useMemo(() => {
    const total = baseFilteredItems.length;
    const totalLaporan = baseFilteredItems.filter((i) => !i.isBaket).length;
    const totalBaket = baseFilteredItems.filter((i) => i.isBaket).length;
    const unverifiedCount = baseFilteredItems.filter(
      (i) => !i.isBaket && i.verificationStatus !== "VERIFIED_BY_FIELD_OFFICER"
    ).length;
    return { total, totalLaporan, totalBaket, unverifiedCount };
  }, [baseFilteredItems]);

  const tickerItems = useMemo(() => {
    if (filteredItems.length === 0) return [];
    const sorted = [...filteredItems].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    const newestList = sorted.slice(0, 10);

    let list = [...newestList];
    while (list.length < 6) {
      list = [...list, ...newestList];
    }
    return list.map((item, idx) => ({
      ...item,
      tickerKey1: `tk1-${item.id}-${idx}`,
      tickerKey2: `tk2-${item.id}-${idx}`,
      relativeTime: formatRelativeTime(item.submittedAt),
    }));
  }, [filteredItems]);

  function handleFocusOnMap(item: MapIntelItem) {
    setMapCenter(item.coordinates);
    setMapZoom(14);
    setSelectedItemId(item.id);

    const mapElement = document.getElementById("intel-map-section");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleOpenDetail(item: MapIntelItem) {
    setSelectedItem(item);
    setDetailModalOpen(true);
  }

  function resetAllFilters() {
    setSearch("");
    setUrgencyFilter("ALL");
    setStatusFilter("ALL");
    setReadFilter("ALL");
    setJaringFilter("ALL");
    setCategoryFilter("ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPeriodPreset("ALL");
    setStartDate("");
    setEndDate("");
    setActiveTab("ALL");
    setPage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 md:p-6 lg:p-8">
      {/* Ticker Keyframes */}
      <style>{`
        @keyframes ticker-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-continuous {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker-marquee 75s linear infinite;
        }
        .animate-ticker-continuous:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 1. Header */}
      <MapsIntelijenHeader loading={loading} onRefresh={() => void fetchAllData()} />

      {loadError ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-700 text-sm dark:text-amber-300">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-amber-500" />
            <span>{loadError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void fetchAllData()}>
            Coba Lagi
          </Button>
        </div>
      ) : null}

      {/* 2. Stats Bar */}
      <MapsIntelijenStats
        total={metrics.total}
        totalLaporan={metrics.totalLaporan}
        totalBaket={metrics.totalBaket}
        unverifiedCount={metrics.unverifiedCount}
      />

      {/* 3. Map View with Controls */}
      <MapsIntelijenMapView
        mapCardRef={mapCardRef}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleMapFullscreen}
        zuluTime={zuluTime}
        wibTime={wibTime}
        filteredItems={filteredItems}
        panelOpen={panelOpen}
        setPanelOpen={setPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        tickerOpen={tickerOpen}
        setTickerOpen={setTickerOpen}
        mapLayer={mapLayer}
        setMapLayer={setMapLayer}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        setMapZoom={setMapZoom}
        mapPitch={mapPitch}
        setMapPitch={setMapPitch}
        hoveredItemId={hoveredItemId}
        setHoveredItemId={setHoveredItemId}
        selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId}
        search={search}
        setSearch={setSearch}
        urgencyFilter={urgencyFilter}
        setUrgencyFilter={setUrgencyFilter}
        periodPreset={periodPreset}
        setPeriodPreset={setPeriodPreset}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        readFilter={readFilter}
        setReadFilter={setReadFilter}
        jaringFilter={jaringFilter}
        setJaringFilter={setJaringFilter}
        popoverJaringOptions={popoverJaringOptions}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
        regencyFilter={regencyFilter}
        setRegencyFilter={setRegencyFilter}
        regencyOptions={regencyOptions}
        districtFilter={districtFilter}
        setDistrictFilter={setDistrictFilter}
        districtOptions={districtOptions}
        villageFilter={villageFilter}
        setVillageFilter={setVillageFilter}
        villageOptions={villageOptions}
        onResetFilters={resetAllFilters}
        setPage={setPage}
        tickerItems={tickerItems}
        onFocusOnMap={handleFocusOnMap}
        onOpenDetail={handleOpenDetail}
      />

      {/* 4. Table / Card Grid View */}
      {!isFullscreen && (
        <MapsIntelijenTableView
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filteredItems={filteredItems}
          paginatedItems={paginatedItems}
          metrics={metrics}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          onFocusOnMap={handleFocusOnMap}
          onOpenDetail={handleOpenDetail}
          onResetFilters={resetAllFilters}
          search={search}
          setSearch={setSearch}
          urgencyFilter={urgencyFilter}
          setUrgencyFilter={setUrgencyFilter}
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          readFilter={readFilter}
          setReadFilter={setReadFilter}
          jaringFilter={jaringFilter}
          setJaringFilter={setJaringFilter}
          popoverJaringOptions={popoverJaringOptions}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          regencyFilter={regencyFilter}
          setRegencyFilter={setRegencyFilter}
          regencyOptions={regencyOptions}
          districtFilter={districtFilter}
          setDistrictFilter={setDistrictFilter}
          districtOptions={districtOptions}
          villageFilter={villageFilter}
          setVillageFilter={setVillageFilter}
          villageOptions={villageOptions}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      )}

      {/* 5. Detail Inspection Modal */}
      <MapsIntelijenDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        selectedItem={selectedItem}
        jaringPhotoUrl={jaringPhotoUrl}
        matchingJaring={matchingJaring}
        gaswilName={gaswilName}
        gaswilPhotoUrl={gaswilPhotoUrl}
        onFocusOnMap={handleFocusOnMap}
      />
    </div>
  );
}
