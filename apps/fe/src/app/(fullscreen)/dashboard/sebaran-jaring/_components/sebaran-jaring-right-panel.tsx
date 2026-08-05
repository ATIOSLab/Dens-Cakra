"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Search, User, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  type JaringDistributionEntry,
  STATUS_COLORS,
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
}: Props) {
  const [detailTab, setDetailTab] = useState<"info" | "reports" | "activities" | "documents">("info");

  if (!isOpen) return null;

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col h-full z-10 shrink-0 shadow-2xl transition-all">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">DAFTAR JARING</h2>
        </div>
        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
          {filteredAgents.length} Total
        </span>
      </div>

      {/* Search & Tabs */}
      <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
          <Input
            placeholder="Cari jaring atau kode..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-8 text-xs h-8.5 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center text-xs font-mono border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          <button
            onClick={() => onTabChange("ALL")}
            className={cn(
              "flex-1 py-1.5 border-b-2 text-center transition-colors cursor-pointer",
              activeTab === "ALL" ? "border-cyan-500 text-cyan-600 dark:text-cyan-300 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Semua
          </button>
          <button
            onClick={() => onTabChange("VERIFIED")}
            className={cn(
              "flex-1 py-1.5 border-b-2 text-center transition-colors cursor-pointer",
              activeTab === "VERIFIED" ? "border-emerald-500 text-emerald-600 dark:text-emerald-300 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Terverifikasi
          </button>
          <button
            onClick={() => onTabChange("PENDING")}
            className={cn(
              "flex-1 py-1.5 border-b-2 text-center transition-colors cursor-pointer",
              activeTab === "PENDING" ? "border-blue-500 text-blue-600 dark:text-blue-300 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Belum Verifikasi
          </button>
        </div>
      </div>

      {/* Scrollable Agent List */}
      <div className="flex-1 overflow-y-auto pb-24 divide-y divide-slate-200 dark:divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        {filteredAgents.map((agent) => {
          const isSelected = selectedJaring?.id === agent.id;
          const statusMeta = STATUS_COLORS[agent.status] || STATUS_COLORS.PENDING;
          const primaryDisplayCode = agent.aliasName || agent.fullName || agent.id;

          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={cn(
                "p-3 flex items-start gap-3 cursor-pointer transition-colors group",
                isSelected ? "bg-cyan-50 dark:bg-cyan-950/40 border-l-2 border-l-cyan-500" : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
              )}
            >
              {/* Profile Photo Avatar */}
              <div className="relative size-10 rounded-full shrink-0 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden mt-0.5">
                {agent.profilePhotoFileId ? (
                  <img
                    src={`/api/files/${agent.profilePhotoFileId}`}
                    alt={agent.fullName || agent.aliasName || agent.id}
                    className="size-full object-cover"
                  />
                ) : (
                  <User className="size-5 text-slate-400 dark:text-slate-500" />
                )}
                {/* Status Dot */}
                <span
                  className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white dark:border-slate-900"
                  style={{ backgroundColor: statusMeta.bg }}
                />
              </div>

              {/* Jaring Details */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                      {primaryDisplayCode}
                    </span>
                    <Badge
                      className={cn(
                        "text-[9px] px-1.5 py-0 border-none font-semibold text-slate-950",
                        statusMeta.dotClass || "bg-emerald-500"
                      )}
                    >
                      {statusMeta.label}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[9px] px-1.5 py-0 border-none font-semibold text-white",
                        agent.isActive ? "bg-emerald-600" : "bg-red-600"
                      )}
                    >
                      {agent.isActive ? "Aktif" : "Tidak Aktif"}
                    </Badge>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">{agent.lastActivityTime}</span>
                </div>

                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {agent.fullName || "Tanpa Nama"}
                </p>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {agent.villageName}, {agent.districtName}
                </p>
              </div>
            </div>
          );
        })}

        <div className="p-3 text-center">
          <button className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer">
            Muat lebih banyak
          </button>
        </div>
      </div>

      {/* Selected Jaring Info Drawer */}
      {selectedJaring && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 p-3.5 space-y-3 shrink-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">{selectedJaring.aliasName || selectedJaring.fullName || selectedJaring.id}</span>
              <Badge className={cn("text-[10px] px-1.5 py-0 border-none font-semibold text-slate-950", STATUS_COLORS[selectedJaring.status]?.dotClass || "bg-emerald-500")}>
                {STATUS_COLORS[selectedJaring.status]?.label || "Terverifikasi"}
              </Badge>
              <Badge className={cn("text-[10px] px-1.5 py-0 border-none font-semibold text-white", selectedJaring.isActive ? "bg-emerald-600" : "bg-red-600")}>
                {selectedJaring.isActive ? "Aktif" : "Tidak Aktif"}
              </Badge>
            </div>
            <button onClick={onDeselectAgent} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">
              <X className="size-4" />
            </button>
          </div>

          {/* Underline Sub-Tabs */}
          <div className="flex items-center gap-4 text-xs font-medium border-b border-slate-200 dark:border-slate-800 pb-1.5 text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setDetailTab("info")}
              className={cn("pb-1 border-b-2 transition-colors cursor-pointer", detailTab === "info" ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200")}
            >
              Informasi
            </button>
            <button
              onClick={() => setDetailTab("reports")}
              className={cn("pb-1 border-b-2 transition-colors cursor-pointer", detailTab === "reports" ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200")}
            >
              Riwayat Laporan
            </button>
            <button
              onClick={() => setDetailTab("activities")}
              className={cn("pb-1 border-b-2 transition-colors cursor-pointer", detailTab === "activities" ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200")}
            >
              Aktivitas
            </button>
            <button
              onClick={() => setDetailTab("documents")}
              className={cn("pb-1 border-b-2 transition-colors cursor-pointer", detailTab === "documents" ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold" : "border-transparent hover:text-slate-900 dark:hover:text-slate-200")}
            >
              Dokumen
            </button>
          </div>

          {/* Key-Value Details */}
          {detailTab === "info" && (
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">👤 Nama Jaring</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedJaring.fullName || "-"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">👥 Alias</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedJaring.aliasName || "-"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">📍 Domisili</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedJaring.villageName}, {selectedJaring.districtName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">👮 Gaswil</span>
                <span className="font-semibold text-amber-600 dark:text-amber-300">{selectedJaring.fieldOfficerName || "Belum ada petugas"}</span>
              </div>

              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-sans">📍 Koordinat</span>
                <span className="text-cyan-700 dark:text-cyan-300 font-mono text-[11px]">{selectedJaring.latitude.toFixed(4)}, {selectedJaring.longitude.toFixed(4)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">⚡ Kinerja</span>
                <Badge className={cn("text-[10px] px-2 py-0.5 border-none font-semibold text-white", selectedJaring.isActive ? "bg-emerald-600" : "bg-red-600")}>
                  {selectedJaring.isActive ? "Aktif" : "Tidak Aktif"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">🕒 Laporan Terakhir</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedJaring.lastReportDate}</span>
              </div>
            </div>
          )}

          {detailTab === "reports" && (
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Total Laporan</span>
                  <span>{selectedJaring.lastReportDate}</span>
                </div>
                <p className="font-medium text-slate-900 dark:text-slate-200">{selectedJaring.reportCount} Laporan Tersimpan</p>
              </div>
            </div>
          )}

          {detailTab === "activities" && (
            <div className="text-xs text-slate-700 dark:text-slate-300 py-1 space-y-1">
              <div>Aktivitas Terakhir: <span className="font-mono text-cyan-700 dark:text-cyan-300">{selectedJaring.lastActivityTime}</span></div>
            </div>
          )}

          {detailTab === "documents" && (
            <div className="text-xs text-slate-500 dark:text-slate-400 py-1">
              <div>Dokumen Terlampir: Dokumen Registrasi Terverifikasi</div>
            </div>
          )}

          {/* Primary Action Button */}
          <a
            href={`/dashboard/daftar-jaring/${selectedJaring.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full pt-1"
          >
            <Button className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-semibold text-xs h-9 shadow-sm cursor-pointer">
              Lihat Detail Lengkap
            </Button>
          </a>
        </div>
      )}
    </aside>
  );
}
