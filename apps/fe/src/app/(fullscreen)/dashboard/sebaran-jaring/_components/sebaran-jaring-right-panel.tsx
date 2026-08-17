"use client";

import { useState } from "react";

import Link from "next/link";

import { Search, X } from "lucide-react";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_CONTROLS, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  type CoordinateSourceMode,
  DISTRIBUTION_ENTITY_COPY,
  type DistributionEntityMode,
  type JaringDistributionEntry,
  signalLabelForMode,
  statusPresentationForMode,
} from "./sebaran-jaring-types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  filteredAgents: JaringDistributionEntry[];
  selectedJaring: JaringDistributionEntry | null;
  onSelectAgent: (agent: JaringDistributionEntry) => void;
  onDeselectAgent: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  activeTab: "ALL" | "VERIFIED" | "PENDING";
  onTabChange: (tab: "ALL" | "VERIFIED" | "PENDING") => void;
  coordinateSourceMode: CoordinateSourceMode;
  mode?: DistributionEntityMode;
};

export function SebaranJaringRightPanel({
  isOpen,
  onClose,
  filteredAgents,
  selectedJaring,
  onSelectAgent,
  onDeselectAgent,
  searchQuery,
  onSearchQueryChange,
  activeTab,
  onTabChange,
  coordinateSourceMode,
  mode = "jaring",
}: Props) {
  const [detailTab, setDetailTab] = useState<"info" | "reports" | "activities">("info");
  const copy = DISTRIBUTION_ENTITY_COPY[mode];
  const isGaswilMode = mode === "gaswil";
  const visual = isGaswilMode ? DOMAIN_VISUALS.gaswil : DOMAIN_VISUALS.jaring;

  if (!isOpen) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex h-full w-[min(26rem,calc(100vw-2rem))] shrink-0 flex-col border-slate-200 border-l bg-white/95 shadow-2xl backdrop-blur-md transition-all lg:relative dark:border-slate-800 dark:bg-slate-900/95">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <visual.Icon className={cn("size-4", visual.iconClass)} />
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {copy.rightPanelTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold font-mono text-[10px] text-slate-500 dark:bg-slate-800">
            {filteredAgents.length.toLocaleString("id-ID")} Total
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={`Sembunyikan daftar ${copy.plural}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
          <Input
            placeholder={copy.rightSearchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className={cn(DC_CONTROLS.input, "h-9 bg-slate-50 pl-8 text-xs dark:bg-slate-950")}
          />
        </div>

        <div className="flex items-center text-xs font-mono border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onTabChange("ALL")}
            className={cn(
              "flex-1 py-1.5 border-b-2 text-center transition-colors cursor-pointer",
              activeTab === "ALL"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-300 font-semibold"
                : "border-transparent hover:text-slate-900 dark:hover:text-slate-200",
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => onTabChange("VERIFIED")}
            className={cn(
              "flex-1 py-1.5 border-b-2 text-center transition-colors cursor-pointer",
              activeTab === "VERIFIED"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-300 font-semibold"
                : "border-transparent hover:text-slate-900 dark:hover:text-slate-200",
            )}
          >
            {copy.statusLabels.VERIFIED}
          </button>
          <button
            type="button"
            onClick={() => onTabChange("PENDING")}
            className={cn(
              "flex-1 py-1.5 border-b-2 text-center transition-colors cursor-pointer",
              activeTab === "PENDING"
                ? mode === "gaswil"
                  ? "border-slate-500 text-slate-600 dark:text-slate-300 font-semibold"
                  : "border-blue-500 text-blue-600 dark:text-blue-300 font-semibold"
                : "border-transparent hover:text-slate-900 dark:hover:text-slate-200",
            )}
          >
            {copy.statusLabels.PENDING}
          </button>
        </div>
      </div>

      {/* Scrollable Agent List */}
      <div className="flex-1 overflow-y-auto pb-24 divide-y divide-slate-200 dark:divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        {filteredAgents.map((agent) => {
          const isSelected = selectedJaring?.id === agent.id;
          const statusMeta = statusPresentationForMode(mode, agent.status);
          return (
            <button
              type="button"
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={cn(
                "group flex w-full items-start gap-3 p-3 text-left transition-colors",
                isSelected
                  ? "bg-cyan-50 dark:bg-cyan-950/40 border-l-2 border-l-cyan-500"
                  : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50",
              )}
            >
              {/* Jaring Details */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "max-w-full whitespace-normal border-none px-1.5 py-0 text-[9px] text-slate-950 leading-3 font-semibold",
                        statusMeta.dotClass || "bg-emerald-500",
                      )}
                    >
                      {copy.statusLabels[agent.status] || statusMeta.label}
                    </Badge>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">{agent.lastActivityTime}</span>
                </div>

                {mode === "jaring" ? (
                  <JaringIdentitySummary
                    compact
                    source={{
                      id: agent.id,
                      fullName: agent.fullName,
                      aliasName: agent.aliasName,
                      whatsappNumber: agent.whatsappNumber,
                      profilePhotoFileId: agent.profilePhotoFileId,
                      fieldOfficerName: agent.fieldOfficerName,
                      villageName: agent.villageName,
                      districtName: agent.districtName,
                      cityName: agent.cityName,
                      provinceName: agent.provinceName,
                    }}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 space-y-0.5">
                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {agent.fullName || agent.fieldOfficerName || "Gaswil tanpa nama"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {(agent.assignmentAreaNames ?? []).join(" / ") || "Cakupan penugasan"}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {agent.villageName}, {agent.districtName}
                </p>
                {isGaswilMode ? (
                  agent.jaringCount != null ? (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {agent.jaringCount.toLocaleString("id-ID")} Jaring binaan
                    </p>
                  ) : null
                ) : (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {agent.reportCount.toLocaleString("id-ID")} Laporan Jaring -{" "}
                    {agent.baketCount.toLocaleString("id-ID")} Baket
                  </p>
                )}
                {!isGaswilMode &&
                coordinateSourceMode === "laporan" &&
                (agent.latestReportLat == null || agent.latestReportLng == null) ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">Lokasi laporan belum tersedia</p>
                ) : null}
              </div>
            </button>
          );
        })}

        {filteredAgents.length === 0 ? (
          <div className="grid min-h-40 place-items-center p-5 text-center text-slate-500 text-xs">
            <span>
              {copy.emptyListText}
              <br />
              Ubah filter untuk melihat data lainnya.
            </span>
          </div>
        ) : null}
      </div>

      {/* Selected Jaring Info Drawer */}
      {selectedJaring && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 p-3.5 space-y-3 shrink-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                {isGaswilMode
                  ? (selectedJaring.fullName ?? selectedJaring.fieldOfficerName ?? "Gaswil tanpa nama")
                  : (selectedJaring.aliasName ?? selectedJaring.fullName ?? selectedJaring.id)}
              </span>
              <Badge
                className={cn(
                  "max-w-full whitespace-normal border-none px-1.5 py-0 text-[10px] text-slate-950 leading-3 font-semibold",
                  statusPresentationForMode(mode, selectedJaring.status).dotClass,
                )}
              >
                {copy.statusLabels[selectedJaring.status] ||
                  statusPresentationForMode(mode, selectedJaring.status).label}
              </Badge>
            </div>
            <button
              type="button"
              onClick={onDeselectAgent}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>

          {!isGaswilMode ? (
            <div className="flex items-center gap-4 text-xs font-medium border-b border-slate-200 dark:border-slate-800 pb-1.5 text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setDetailTab("info")}
                className={cn(
                  "pb-1 border-b-2 transition-colors cursor-pointer",
                  detailTab === "info"
                    ? "border-cyan-600 text-cyan-600 dark:text-cyan-400 font-semibold"
                    : "border-transparent hover:text-slate-900 dark:hover:text-slate-200",
                )}
              >
                Informasi
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("reports")}
                className={cn(
                  "pb-1 border-b-2 transition-colors cursor-pointer",
                  detailTab === "reports"
                    ? "border-cyan-600 text-cyan-600 dark:text-cyan-400 font-semibold"
                    : "border-transparent hover:text-slate-900 dark:hover:text-slate-200",
                )}
              >
                Riwayat Laporan
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("activities")}
                className={cn(
                  "pb-1 border-b-2 transition-colors cursor-pointer",
                  detailTab === "activities"
                    ? "border-cyan-600 text-cyan-600 dark:text-cyan-400 font-semibold"
                    : "border-transparent hover:text-slate-900 dark:hover:text-slate-200",
                )}
              >
                Aktivitas
              </button>
            </div>
          ) : null}

          {/* Key-Value Details */}
          {isGaswilMode ? (
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="rounded-md border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Wilayah Penugasan
                </p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {(selectedJaring.assignmentAreaNames ?? []).join(" / ") ||
                    selectedJaring.districtName ||
                    "Cakupan penugasan"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status Sinyal</span>
                <Badge
                  className={cn(
                    "border-none px-2 py-0.5 text-[10px] font-semibold",
                    selectedJaring.isActive
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
                  )}
                >
                  {signalLabelForMode(mode, selectedJaring.isActive)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Lokasi Terakhir</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedJaring.lastReportDate}</span>
              </div>
              {selectedJaring.jaringCount != null ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Jaring Binaan</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedJaring.jaringCount.toLocaleString("id-ID")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : detailTab === "info" ? (
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
              <JaringIdentitySummary
                compact
                source={{
                  id: selectedJaring.id,
                  fullName: selectedJaring.fullName,
                  aliasName: selectedJaring.aliasName,
                  whatsappNumber: selectedJaring.whatsappNumber,
                  profilePhotoFileId: selectedJaring.profilePhotoFileId,
                  fieldOfficerName: selectedJaring.fieldOfficerName,
                  villageName: selectedJaring.villageName,
                  districtName: selectedJaring.districtName,
                  cityName: selectedJaring.cityName,
                  provinceName: selectedJaring.provinceName,
                }}
              />

              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-sans">
                  Koordinat
                </span>
                <span className="text-cyan-700 dark:text-cyan-300 font-mono text-[11px]">
                  {coordinateSourceMode === "laporan"
                    ? selectedJaring.latestReportLat != null && selectedJaring.latestReportLng != null
                      ? `${selectedJaring.latestReportLat.toFixed(4)}, ${selectedJaring.latestReportLng.toFixed(4)}`
                      : "Tidak tersedia"
                    : `${selectedJaring.latitude.toFixed(4)}, ${selectedJaring.longitude.toFixed(4)}`}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {DOMAIN_TERMS.jaringActivity90Days}
                </span>
                <Badge
                  className={cn(
                    "text-[10px] px-2 py-0.5 border-none font-semibold",
                    "text-white",
                    selectedJaring.isActive ? "bg-emerald-600" : "bg-slate-600",
                  )}
                >
                  {signalLabelForMode(mode, selectedJaring.isActive)}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">Laporan Terakhir</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedJaring.lastReportDate}</span>
              </div>
            </div>
          ) : null}

          {!isGaswilMode && detailTab === "reports" && (
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Aktivitas Pelaporan</span>
                  <span>{selectedJaring.lastReportDate}</span>
                </div>
                <p className="font-medium text-slate-900 dark:text-slate-200">
                  {selectedJaring.reportCount.toLocaleString("id-ID")} Laporan Jaring -{" "}
                  {selectedJaring.baketCount.toLocaleString("id-ID")} Baket
                </p>
              </div>
            </div>
          )}

          {!isGaswilMode && detailTab === "activities" && (
            <div className="text-xs text-slate-700 dark:text-slate-300 py-1 space-y-1">
              <div>
                Aktivitas Terakhir:{" "}
                <span className="font-mono text-cyan-700 dark:text-cyan-300">{selectedJaring.lastActivityTime}</span>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <Button
            asChild
            className="mt-1 h-9 w-full cursor-pointer bg-slate-900 font-semibold text-white text-xs shadow-sm hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            <Link
              href={
                selectedJaring.detailHref ??
                (isGaswilMode ? "/dashboard/daftar-petugas-wilayah" : `/dashboard/daftar-jaring/${selectedJaring.id}`)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.detailLinkLabel}
            </Link>
          </Button>
        </div>
      )}
    </aside>
  );
}
