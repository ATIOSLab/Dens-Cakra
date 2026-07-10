"use client";

import { useState } from "react";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  FolderOpen,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProductType = "Laporan Informasi" | "Laporan Intelijen" | "Memorandum Strategis" | "Telaahan Staf";
type ProductClassification = "Sangat Rahasia" | "Rahasia" | "Terbatas";
type ProductStatus = "Menunggu Tindakan" | "Disahkan" | "Dikembalikan" | "Arsip";

interface VersionLog {
  version: string;
  date: string;
  actor: string;
  description: string;
}

interface IntelligenceProduct {
  id: string;
  title: string;
  type: ProductType;
  classification: ProductClassification;
  status: ProductStatus;
  date: string;
  origin: string;
  executiveSummary: string;
  content: string;
  evidence: string[];
  sources: string[];
  versions: VersionLog[];
  distribution: string[];
  cc: string[];
  revisionNote?: string;
}

const classificationClass: Record<ProductClassification, string> = {
  "Sangat Rahasia": "border-red-500/25 bg-red-500/10 text-red-500 font-bold",
  Rahasia: "border-orange-500/25 bg-orange-500/10 text-orange-500",
  Terbatas: "border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
};

const statusClass: Record<ProductStatus, string> = {
  "Menunggu Tindakan": "border-amber-500/25 bg-amber-500/10 text-amber-500 animate-pulse",
  Disahkan: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
  Dikembalikan: "border-rose-500/25 bg-rose-500/10 text-rose-500",
  Arsip: "border-slate-500/25 bg-slate-500/10 text-slate-500",
};

const initialProducts: IntelligenceProduct[] = [
  {
    id: "PROD-2026-INT-001",
    title: "Analisis Potensi Eskalasi Massa & Kerawanan Pilkada Serentak Jawa Barat",
    type: "Laporan Intelijen",
    classification: "Sangat Rahasia",
    status: "Menunggu Tindakan",
    date: "10 Jul 2026",
    origin: "Binda Jawa Barat",
    executiveSummary:
      "Laporan mendeteksi adanya konsolidasi aliansi ormas tertentu di wilayah penyangga ibu kota (Depok, Bekasi, Bogor) yang berpotensi memicu unjuk rasa besar-besaran apabila calon pilihan mereka tidak lolos seleksi berkas administratif. Pengamanan ketat KPU dan KPUD direkomendasikan.",
    content:
      "Berdasarkan UUK No. 22/2026, jaring intelijen lapangan melaporkan pergerakan logistik non-formal dari aktor politik regional untuk mendanai aksi demonstrasi terencana. Konsolidasi massa diprediksi mencapai puncak pada pertengahan Juli 2026 di depan kantor KPUD Jabar di Bandung.",
    evidence: ["foto_satelit_titik_kumpul_bandung.jpg", "rekaman_diskusi_konsolidasi_ormas.mp3", "daftar_pemodal_logistik_lapangan.pdf"],
    sources: ["BAKET-2026-0709-014 (Nilai A-1)", "Laporan Harian Korwil Bandung (Nilai B-2)", "Sinyal Penyadapan spektrum komunikasi taktis regional"],
    versions: [
      { version: "v1.2", date: "10 Jul 2026, 09.00 WIB", actor: "OIM Jabar / Heru K.", description: "Kompilasi final data logistik dan daftar ormas" },
      { version: "v1.1", date: "09 Jul 2026, 14.15 WIB", actor: "Analang Jabar / Dedi R.", description: "Penyusunan kerangka analisis ancaman taktis" },
    ],
    distribution: ["Presiden RI", "Seskab", "Menko Polhukam"],
    cc: ["Kepala BIN", "Kabinda Jawa Barat", "Deputi II BIN"],
  },
  {
    id: "PROD-2026-INT-002",
    title: "Rekomendasi Pengetatan Screening Manifes Jalur Laut Selat Malaka",
    type: "Memorandum Strategis",
    classification: "Rahasia",
    status: "Menunggu Tindakan",
    date: "10 Jul 2026",
    origin: "Binda Kepri",
    executiveSummary:
      "Ditemukan indikasi kuat penyusupan dokumen kepabeanan (*cargo manifest*) oleh jaringan transnasional untuk menyelundupkan bahan baku kimia sensitif ke wilayah barat Sumatera. Direkomendasikan audit mendadak pelabuhan tikus.",
    content:
      "Laporan intelijen maritim mengonfirmasi kapal kargo mini dengan rute pelayaran non-reguler sering singgah di pelabuhan rakyat wilayah Kepulauan Riau tanpa pelaporan bea cukai yang sah. Spektrum radar mengindikasikan adanya pemindahan muatan di laut lepas (*ship-to-ship transfer*).",
    evidence: ["koordinat_radar_sat-04.xlsx", "logbook_kapal_mini_kargo.pdf"],
    sources: ["BAKET-2026-0708-009 (Nilai A-2)", "Laporan Analis Maritim Kepri"],
    versions: [
      { version: "v1.1", date: "10 Jul 2026, 08.30 WIB", actor: "OIM Kepri / Syamsul B.", description: "Validasi data radar satelit kargo" },
    ],
    distribution: ["Menko Polhukam", "Menteri Perhubungan", "KSAL"],
    cc: ["Kepala BIN", "Kabinda Kepri", "Deputi I BIN"],
  },
  {
    id: "PROD-2026-INT-003",
    title: "Telaahan Kerawanan Pasokan Pangan Regional & Dampak Sosial-Ekonomi",
    type: "Telaahan Staf",
    classification: "Terbatas",
    status: "Disahkan",
    date: "09 Jul 2026",
    origin: "Deputi II / Dalam Negeri",
    executiveSummary:
      "Musim kering ekstrem di wilayah lumbung padi nasional (Jatim, Jateng) memicu penurunan panen hingga 14% dari target triwulan. Potensi gejolak harga beras di tingkat konsumen membutuhkan operasi pasar komprehensif.",
    content:
      "Analisis data komoditas pangan and sentimen pasar menunjukkan potensi kenaikan harga bahan pokok sebesar 22% pada awal Agustus. Potensi gangguan ketertiban terkonsentrasi di daerah perkotaan padat penduduk jika rantai distribusi terhambat.",
    evidence: ["tabel_produksi_lumbung_regional.xlsx", "data_sentimen_harga_pasar_rakyat.pdf"],
    sources: ["Data BPS Regional Jatim", "Laporan Khusus Ketahanan Pangan Deputi II"],
    versions: [
      { version: "v1.0", date: "09 Jul 2026, 16.00 WIB", actor: "Analis Utama Deputi II", description: "Pengesahan draft awal produk strategis pangan" },
    ],
    distribution: ["Presiden RI", "Menteri Pertanian", "Menteri Perdagangan"],
    cc: ["Kepala BIN", "Deputi II BIN"],
  },
  {
    id: "PROD-2026-INT-004",
    title: "Laporan Informasi Potensi Gangguan Keamanan Objek Vital Energi Banten",
    type: "Laporan Informasi",
    classification: "Rahasia",
    status: "Dikembalikan",
    date: "08 Jul 2026",
    origin: "Binda Banten",
    executiveSummary:
      "Laporan mengenai ancaman sabotase jaringan listrik gardu induk utama Banten oleh kelompok radikal. Memerlukan penyesuaian detail taktis koordinat titik rawan sebelum disahkan.",
    content:
      "Adanya pemantauan mencurigakan oleh 2 orang tidak dikenal di sekitar batas pagar Gardu Induk Suralaya selama 3 malam berturut-turut. Tim lapangan memerlukan backup intelijen taktis Kepolisian Daerah untuk penangkapan.",
    evidence: ["foto_cctv_pelaku_mencurigakan.png"],
    sources: ["BAKET-2026-0707-005 (Nilai B-2)", "Laporan Lapangan FO-09"],
    versions: [
      { version: "v1.1", date: "08 Jul 2026, 11.20 WIB", actor: "OIM Banten / Hendra W.", description: "Kompilasi berkas CCTV lapangan" },
    ],
    distribution: ["Kepala BIN"],
    cc: ["Kabinda Banten", "Deputi I BIN"],
    revisionNote: "Koordinat titik rawan penyerangan gardu induk harus dipastikan secara GPS agar unit Polda dapat langsung bergerak presisi. Mohon perbaiki dan ajukan ulang.",
  },
  {
    id: "PROD-2026-INT-005",
    title: "Arsip Analisis Geopolitik Perbatasan Utara Laut China Selatan",
    type: "Laporan Intelijen",
    classification: "Sangat Rahasia",
    status: "Arsip",
    date: "05 Jul 2026",
    origin: "Deputi I / Intelijen Luar Negeri",
    executiveSummary:
      "Kompilasi pemantauan kapal penjaga pantai asing di dekat garis landas kontinen Laut Natuna Utara selama semester I 2026. Laporan ditutup dan diarsipkan karena eskalasi sudah menurun.",
    content:
      "Pergerakan kapal penjaga pantai asing menunjukkan pola berulang setiap pergantian patroli maritim regional. Pengawasan berkala radar BIN luar negeri telah dialihkan ke koordinat lain.",
    evidence: ["peta_jalur_patroli_maritim_asing.pdf"],
    sources: ["Data Radar Luar Negeri BIN", "Laporan Atase Pertahanan"],
    versions: [
      { version: "v1.0", date: "05 Jul 2026, 10.00 WIB", actor: "OIM Deputi I", description: "Pengarsipan berkas operasi patroli asing" },
    ],
    distribution: ["Kepala BIN", "Panglima TNI"],
    cc: ["Deputi I BIN"],
  },
];

export function ProdukIntelijenPage() {
  const [products, setProducts] = useState<IntelligenceProduct[]>(initialProducts);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProducts[0]?.id);
  const [activeTab, setActiveTab] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("Semua");
  const [typeFilter, setTypeFilter] = useState("Semua");

  // State untuk Modal Kembalikan (Revision)
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionText, setRevisionText] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? products[0];

  // Filter logika
  const filteredProducts = products.filter((p) => {
    // 1. Search Query
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.origin.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Classification
    const matchesClassification = classificationFilter === "Semua" || p.classification === classificationFilter;

    // 3. Type
    const matchesType = typeFilter === "Semua" || p.type === typeFilter;

    // 4. Tab status
    if (activeTab === "menunggu") return matchesSearch && matchesClassification && matchesType && p.status === "Menunggu Tindakan";
    if (activeTab === "disahkan") return matchesSearch && matchesClassification && matchesType && p.status === "Disahkan";
    if (activeTab === "dikembalikan") return matchesSearch && matchesClassification && matchesType && p.status === "Dikembalikan";
    if (activeTab === "arsip") return matchesSearch && matchesClassification && matchesType && p.status === "Arsip";

    return matchesSearch && matchesClassification && matchesType;
  });

  // Action Handlers
  const handleApprove = () => {
    setProducts((current) =>
      current.map((p) => {
        if (p.id !== selectedProduct.id) return p;
        return {
          ...p,
          status: "Disahkan",
          versions: [
            {
              version: `v${(parseFloat(p.versions[0]?.version || "1.0") + 0.1).toFixed(1)}`,
              date: "Sekarang",
              actor: "Executive Demo",
              description: "Disahkan dan ditandatangani secara elektronik oleh Eksekutif",
            },
            ...p.versions,
          ],
        };
      })
    );
  };

  const handleArchive = () => {
    setProducts((current) =>
      current.map((p) => {
        if (p.id !== selectedProduct.id) return p;
        return {
          ...p,
          status: "Arsip",
          versions: [
            {
              version: p.versions[0]?.version || "1.0",
              date: "Sekarang",
              actor: "Executive Demo",
              description: "Produk dipindahkan ke folder arsip strategis",
            },
            ...p.versions,
          ],
        };
      })
    );
  };

  const handleReturnSubmit = () => {
    if (!revisionText.trim()) return;

    setProducts((current) =>
      current.map((p) => {
        if (p.id !== selectedProduct.id) return p;
        return {
          ...p,
          status: "Dikembalikan",
          revisionNote: revisionText.trim(),
          versions: [
            {
              version: `v${(parseFloat(p.versions[0]?.version || "1.0") + 0.1).toFixed(1)}`,
              date: "Sekarang",
              actor: "Executive Demo",
              description: `Dikembalikan untuk revisi. Catatan: ${revisionText.trim()}`,
            },
            ...p.versions,
          ],
        };
      })
    );

    setIsRevisionModalOpen(false);
    setRevisionText("");
  };

  const activeCount = products.filter((p) => p.status === "Menunggu Tindakan").length;
  const approvedCount = products.filter((p) => p.status === "Disahkan").length;

  return (
    <div className="@container/main flex flex-col gap-6 p-1">
      {/* Title Header */}
      <div className="flex flex-col gap-4 border-border/40 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Produk Intelijen</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Review, pengesahan, distribusi, dan manajemen arsip produk intelijen strategis regional dan pusat.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Menunggu Tindakan", value: activeCount, desc: "Butuh pengesahan segera", icon: AlertCircle, tone: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/[0.12]", tabId: "menunggu" },
          { label: "Disahkan", value: approvedCount, desc: "Produk siap didiseminasikan", icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.12]", tabId: "disahkan" },
          { label: "Dikembalikan", value: products.filter((p) => p.status === "Dikembalikan").length, desc: "Dalam proses revisi taktis", icon: RotateCcw, tone: "text-rose-500 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/[0.12]", tabId: "dikembalikan" },
          { label: "Total Arsip", value: products.filter((p) => p.status === "Arsip").length, desc: "Dokumen operasi selesai", icon: Archive, tone: "text-slate-500 bg-slate-500/10 border-slate-500/20 hover:border-slate-500/40 hover:bg-slate-500/[0.12]", tabId: "arsip" },
        ].map((metric, idx) => {
          const Icon = metric.icon;
          const isSelectedTab = activeTab === metric.tabId;
          return (
            <button
              key={idx}
              onClick={() => {
                setActiveTab(metric.tabId);
                const matched = products.filter((p) => {
                  if (metric.tabId === "menunggu") return p.status === "Menunggu Tindakan";
                  if (metric.tabId === "disahkan") return p.status === "Disahkan";
                  if (metric.tabId === "dikembalikan") return p.status === "Dikembalikan";
                  if (metric.tabId === "arsip") return p.status === "Arsip";
                  return true;
                });
                if (matched.length > 0) {
                  setSelectedProductId(matched[0].id);
                }
              }}
              className="text-left w-full focus:outline-none block"
              type="button"
            >
              <Card className={cn(
                "border transition-all duration-200 cursor-pointer",
                metric.tone,
                isSelectedTab ? "ring-2 ring-sky-500/50 border-sky-500/50" : ""
              )}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs opacity-80">{metric.label}</p>
                    <p className="mt-1.5 font-bold text-2xl leading-none">{metric.value}</p>
                    <p className="mt-2 text-[10px] opacity-75">{metric.desc}</p>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background/50">
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Main Console Grid */}
      <div className="grid gap-6 xl:grid-cols-[400px_1fr] xl:items-stretch">
        {/* Left Column: Sidebar Filters & Product Selector */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col h-full flex-1">
            <CardHeader className="pb-3 space-y-3">
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari ID, judul, atau asal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Filtering Controls Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <Filter className="size-3" /> Klasifikasi
                  </span>
                  <select
                    value={classificationFilter}
                    onChange={(e) => setClassificationFilter(e.target.value)}
                    className="w-full h-8 text-[11px] rounded-md border border-input bg-background px-2 py-1 outline-none ring-offset-background focus:ring-1 focus:ring-ring"
                  >
                    <option value="Semua">Semua Klasifikasi</option>
                    <option value="Sangat Rahasia">Sangat Rahasia</option>
                    <option value="Rahasia">Rahasia</option>
                    <option value="Terbatas">Terbatas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="size-3" /> Jenis Produk
                  </span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full h-8 text-[11px] rounded-md border border-input bg-background px-2 py-1 outline-none ring-offset-background focus:ring-1 focus:ring-ring"
                  >
                    <option value="Semua">Semua Jenis</option>
                    <option value="Laporan Informasi">Laporan Informasi</option>
                    <option value="Laporan Intelijen">Laporan Intelijen</option>
                    <option value="Memorandum Strategis">Memorandum Strategis</option>
                    <option value="Telaahan Staf">Telaahan Staf</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            {/* Segmented Pill Tabs */}
            <div className="px-4 border-b pb-2 flex flex-wrap gap-1">
              {[
                { id: "semua", label: "Semua" },
                { id: "menunggu", label: "Menunggu Tindakan" },
                { id: "disahkan", label: "Disahkan" },
                { id: "dikembalikan", label: "Dikembalikan" },
                { id: "arsip", label: "Arsip" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Reset selected product if not in the new tab's filtered list
                    const list = products.filter((p) => {
                      if (tab.id === "menunggu") return p.status === "Menunggu Tindakan";
                      if (tab.id === "disahkan") return p.status === "Disahkan";
                      if (tab.id === "dikembalikan") return p.status === "Dikembalikan";
                      if (tab.id === "arsip") return p.status === "Arsip";
                      return true;
                    });
                    if (list.length > 0 && !list.some((p) => p.id === selectedProductId)) {
                      setSelectedProductId(list[0].id);
                    }
                  }}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-sky-500/10 text-sky-500"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Products Scroll List */}
            <CardContent className="p-4 flex-1 flex flex-col justify-between overflow-y-auto max-h-[500px]">
              <div className="flex flex-col gap-2">
                {filteredProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className={cn(
                        "w-full flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all duration-200",
                        isSelected
                          ? "border-sky-500 bg-sky-500/[0.02] ring-1 ring-sky-500/25"
                          : "border-border bg-card hover:bg-muted/40"
                      )}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{p.id}</span>
                        <Badge className={cn("text-[9px] py-0 px-1.5", classificationClass[p.classification])} variant="outline">
                          {p.classification}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground leading-snug line-clamp-2">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                          <span>{p.type}</span>
                          <span>•</span>
                          <span>{p.origin}</span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-1">
                        <span className="text-[9px] text-muted-foreground">{p.date}</span>
                        <Badge className={cn("text-[9px] py-0 px-1.5", statusClass[p.status])} variant="outline">
                          {p.status}
                        </Badge>
                      </div>
                    </button>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada produk intelijen ditemukan.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Complete Product Details Drawer Workspace */}
        <div className="flex flex-col gap-6">
          {selectedProduct ? (
            <Card className="flex flex-col h-full flex-1">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b pb-4 space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-500 font-bold">{selectedProduct.id}</span>
                    <Badge className={classificationClass[selectedProduct.classification]} variant="outline">
                      {selectedProduct.classification}
                    </Badge>
                    <Badge className={statusClass[selectedProduct.status]} variant="outline">
                      {selectedProduct.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-1 leading-snug">{selectedProduct.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-3">
                    <span>Jenis: <strong className="text-foreground">{selectedProduct.type}</strong></span>
                    <span>•</span>
                    <span>Asal: <strong className="text-foreground">{selectedProduct.origin}</strong></span>
                    <span>•</span>
                    <span>Tanggal: <strong className="text-foreground">{selectedProduct.date}</strong></span>
                  </CardDescription>
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center gap-2">
                  {selectedProduct.status === "Menunggu Tindakan" && (
                    <>
                      <Button
                        onClick={handleApprove}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        <Check className="size-3.5" />
                        Sahkan & Otorisasi
                      </Button>
                      <Button
                        onClick={() => setIsRevisionModalOpen(true)}
                        className="h-8 text-xs border-rose-500/25 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10"
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="size-3.5" />
                        Kembalikan (Revisi)
                      </Button>
                    </>
                  )}
                  {selectedProduct.status !== "Arsip" && (
                    <Button
                      onClick={handleArchive}
                      variant="outline"
                      className="h-8 text-xs"
                      size="sm"
                    >
                      <Archive className="size-3.5" />
                      Arsipkan
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6 flex-1">
                {/* Sertifikasi Pengesahan Elektronik (jika disahkan) */}
                {selectedProduct.status === "Disahkan" && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-500 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="size-4" />
                      Terverifikasi: Produk Intelijen Telah Disahkan Elektronik
                    </div>
                    <span className="font-mono text-[9px] opacity-75">SHA256: 8f93e...</span>
                  </div>
                )}

                {/* Revisi Warning Note (jika dikembalikan) */}
                {selectedProduct.status === "Dikembalikan" && selectedProduct.revisionNote && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-500">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="size-4" />
                      Catatan Revisi Eksekutif (Wajib Tindak Lanjut)
                    </div>
                    <p className="mt-2 pl-6 leading-relaxed italic">{selectedProduct.revisionNote}</p>
                  </div>
                )}

                {/* Executive Summary Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                    <FileText className="size-4 text-sky-500" /> Ringkasan Eksekutif
                  </h3>
                  <div className="rounded-lg border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground font-medium">
                    {selectedProduct.executiveSummary}
                  </div>
                </div>

                {/* Content Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                    <ShieldAlert className="size-4 text-sky-500" /> Analisis Utama & Isi Laporan
                  </h3>
                  <div className="rounded-lg border bg-muted/10 p-4 text-xs leading-relaxed text-muted-foreground space-y-3">
                    <p>{selectedProduct.content}</p>
                  </div>
                </div>

                {/* Grid 2-Column: Bukti Pendukung & Sumber Laporan */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Bukti Pendukung */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                      <FileDown className="size-4 text-emerald-500" /> Bukti Pendukung & Lampiran
                    </h3>
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      {selectedProduct.evidence.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 rounded border bg-background p-2.5 text-[11px]">
                          <span className="font-mono text-muted-foreground truncate">{file}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-foreground" type="button">
                              <Eye className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-foreground" type="button">
                              <Download className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sumber Laporan (Audit Trail Baket) */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                      <Users className="size-4 text-amber-500" /> Sumber Laporan & Validasi Baket
                    </h3>
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      {selectedProduct.sources.map((src, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded border bg-background p-2.5 text-[11px] font-mono text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          <span>{src}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grid 2-Column: Riwayat Versi & Distribusi */}
                <div className="grid gap-4 md:grid-cols-2 border-t pt-6">
                  {/* Riwayat Versi */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                      <Clock3 className="size-4 text-sky-500" /> Riwayat Perubahan & Versi
                    </h3>
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                      {selectedProduct.versions.map((ver, idx) => (
                        <div key={idx} className="flex gap-2.5 text-[11px] leading-relaxed">
                          <span className="font-mono font-bold text-sky-500 shrink-0 bg-sky-500/10 px-1.5 py-0.5 rounded h-fit">
                            {ver.version}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{ver.description}</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">
                              {ver.date} — {ver.actor}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distribusi dan Tembusan */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                      <Send className="size-4 text-purple-500" /> Distribusi & Tembusan Resmi
                    </h3>
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-3.5 text-[11px]">
                      <div>
                        <span className="font-semibold text-foreground">Distribusi Utama:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedProduct.distribution.map((dist) => (
                            <Badge key={dist} variant="outline" className="border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400">
                              {dist}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-border/40 pt-2.5">
                        <span className="font-semibold text-foreground">Tembusan (CC):</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedProduct.cc.map((ccUser) => (
                            <Badge key={ccUser} variant="outline" className="border-slate-500/30 bg-slate-500/5 text-slate-600 dark:text-slate-400">
                              {ccUser}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm flex items-center justify-center min-h-[400px]">
              Silakan pilih produk intelijen untuk melihat detail.
            </div>
          )}
        </div>
      </div>

      {/* Modal Kembalikan (Revision) */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border border-border shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-rose-500 flex items-center gap-2">
                  <RotateCcw className="size-4" /> Kembalikan Produk Intelijen
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Anda wajib memberikan catatan revisi terperinci agar analis lapangan dapat menindaklanjutinya.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsRevisionModalOpen(false);
                  setRevisionText("");
                }}
                className="size-8"
                type="button"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-foreground">Catatan Revisi (Wajib):</span>
                <Textarea
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                  placeholder="Contoh: Lampirkan koordinat GPS taktis dan perbaiki data sentimen pasar di triwulan II..."
                  className="min-h-32 text-xs resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRevisionModalOpen(false);
                    setRevisionText("");
                  }}
                  className="text-xs"
                  type="button"
                >
                  Batal
                </Button>
                <Button
                  disabled={!revisionText.trim()}
                  onClick={handleReturnSubmit}
                  size="sm"
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                  type="button"
                >
                  <Send className="size-3.5" />
                  Kirim Revisi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
