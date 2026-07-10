"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Building,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileDown,
  FileText,
  MapPin,
  ShieldAlert,
  Target,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Interface data unit untuk evaluasi & drill-down
interface PersonnelPerformance {
  id: string;
  name: string;
  role: string;
  reportsCount: number;
  accuracyRate: number;
  avgResponseTime: number; // menit
  revisionCount: number;
  activeAssets: number; // jumlah jaring
}

interface UnitPerformance {
  id: string;
  name: string;
  region: string;
  uukFulfillment: number; // % pemenuhan UUK/PIR
  activePersonnel: number;
  totalReports: number;
  accuracyRate: number; // % validasi laporan
  avgResponseTime: number; // menit
  revisionCount: number; // jumlah revisi
  personnelList: PersonnelPerformance[];
}

interface BlindSpotArea {
  id: string;
  areaName: string;
  riskLevel: "Tinggi" | "Sedang" | "Rendah";
  reason: string;
  activeAssets: number;
  avgResponseTime: number; // menit
  recommendation: string;
}

// Data Dummy Taktis BIN
const initialUnitsData: UnitPerformance[] = [
  {
    id: "UNIT-BIN-01",
    name: "Binda Jawa Barat",
    region: "Jawa Barat",
    uukFulfillment: 96.5,
    activePersonnel: 18,
    totalReports: 142,
    accuracyRate: 98.2,
    avgResponseTime: 14.2,
    revisionCount: 3,
    personnelList: [
      { id: "PERS-011", name: "Kapten Inf Yudi S.", role: "Analang Perbatasan", reportsCount: 42, accuracyRate: 99.0, avgResponseTime: 12.5, revisionCount: 1, activeAssets: 14 },
      { id: "PERS-012", name: "Letnan Dua H. Heru", role: "Field Officer Taktis", reportsCount: 35, accuracyRate: 97.5, avgResponseTime: 15.0, revisionCount: 2, activeAssets: 9 },
      { id: "PERS-013", name: "Siti Rahma M.Si", role: "Analis Sosio-Ekonomi", reportsCount: 65, accuracyRate: 98.0, avgResponseTime: 14.5, revisionCount: 0, activeAssets: 20 },
    ],
  },
  {
    id: "UNIT-BIN-02",
    name: "Binda DKI Jakarta",
    region: "DKI Jakarta",
    uukFulfillment: 94.8,
    activePersonnel: 22,
    totalReports: 189,
    accuracyRate: 97.4,
    avgResponseTime: 11.8,
    revisionCount: 5,
    personnelList: [
      { id: "PERS-021", name: "AKBP Fajar S.", role: "Analis Utama Keamanan", reportsCount: 88, accuracyRate: 97.8, avgResponseTime: 10.5, revisionCount: 2, activeAssets: 25 },
      { id: "PERS-022", name: "Kompol Rian K.", role: "Penyidik Siber Daerah", reportsCount: 61, accuracyRate: 96.2, avgResponseTime: 13.2, revisionCount: 3, activeAssets: 12 },
      { id: "PERS-023", name: "Dr. Adrian W.", role: "Kajian Konflik Politik", reportsCount: 40, accuracyRate: 98.5, avgResponseTime: 12.0, revisionCount: 0, activeAssets: 8 },
    ],
  },
  {
    id: "UNIT-BIN-03",
    name: "Binda Banten",
    region: "Banten",
    uukFulfillment: 89.2,
    activePersonnel: 12,
    totalReports: 94,
    accuracyRate: 95.8,
    avgResponseTime: 22.4,
    revisionCount: 7,
    personnelList: [
      { id: "PERS-031", name: "Mayor Inf Hendra", role: "Field Coordinator", reportsCount: 49, accuracyRate: 96.0, avgResponseTime: 20.2, revisionCount: 4, activeAssets: 11 },
      { id: "PERS-032", name: "Ipda Dian R.", role: "Satgas Obvitnas", reportsCount: 45, accuracyRate: 95.5, avgResponseTime: 24.5, revisionCount: 3, activeAssets: 7 },
    ],
  },
  {
    id: "UNIT-BIN-04",
    name: "Binda Kepulauan Riau",
    region: "Kepulauan Riau",
    uukFulfillment: 91.5,
    activePersonnel: 15,
    totalReports: 112,
    accuracyRate: 96.9,
    avgResponseTime: 18.6,
    revisionCount: 4,
    personnelList: [
      { id: "PERS-041", name: "Syamsul Bahri M.A", role: "Analis Geopolitik Laut", reportsCount: 68, accuracyRate: 97.2, avgResponseTime: 17.5, revisionCount: 2, activeAssets: 18 },
      { id: "PERS-042", name: "Lettu Laut D. Prasetyo", role: "Intelijen Maritim", reportsCount: 44, accuracyRate: 96.5, avgResponseTime: 19.8, revisionCount: 2, activeAssets: 10 },
    ],
  },
];

const blindSpotsData: BlindSpotArea[] = [
  {
    id: "BS-001",
    areaName: "Papua Pegunungan (Perbatasan Timur)",
    riskLevel: "Tinggi",
    reason: "Kepadatan sensor lapangan < 15%, jaring komunikasi minim, aset jaring lokal nihil.",
    activeAssets: 0,
    avgResponseTime: 92.5,
    recommendation: "Pengerahan tim infiltrasi taktis mobile (Satgas Mandiri) dan perekrutan jaring informan lokal baru.",
  },
  {
    id: "BS-002",
    areaName: "Kaltara (Garis Batas Liar Nunukan)",
    riskLevel: "Sedang",
    reason: "Waktu respons pelaporan awal > 60 menit karena kendala transportasi & koneksi satelit.",
    activeAssets: 2,
    avgResponseTime: 68.4,
    recommendation: "Instalasi pemancar radio komunikasi cadangan berkode enkripsi taktis dan penambahan 1 personel Binda.",
  },
];

export function KinerjaEvaluasiPage() {
  const [activeTab, setActiveTab] = useState<"kpi" | "unit" | "blindspot">("kpi");

  // State untuk Drill-Down Modal
  const [selectedUnit, setSelectedUnit] = useState<UnitPerformance | null>(null);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelPerformance | null>(null);

  // State Simulasi Unduh Laporan
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const handleDownload = (type: "triwulan" | "tahunan") => {
    setDownloadingType(type);
    setTimeout(() => {
      setDownloadingType(null);
      alert(`Laporan ${type === "triwulan" ? "Triwulan (Q2)" : "Tahunan (2026)"} berhasil diunduh ke folder Downloads.`);
    }, 1500);
  };

  return (
    <div className="@container/main flex flex-col gap-6 p-1">
      {/* Page Title & Controls */}
      <div className="flex flex-col gap-4 border-border/40 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Kinerja & Evaluasi</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Dasbor evaluasi produktivitas unit, cakupan wilayah, blind spot intelijen, dan audit pemenuhan UUK/PIR.
          </p>
        </div>

        {/* Laporan triwulan & tahunan Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => handleDownload("triwulan")}
            disabled={downloadingType !== null}
            variant="outline"
            className="h-9 text-xs"
            type="button"
          >
            {downloadingType === "triwulan" ? (
              <span className="animate-spin mr-1">•</span>
            ) : (
              <FileDown className="size-3.5 mr-1" />
            )}
            Laporan Triwulan
          </Button>
          <Button
            onClick={() => handleDownload("tahunan")}
            disabled={downloadingType !== null}
            variant="outline"
            className="h-9 text-xs"
            type="button"
          >
            {downloadingType === "tahunan" ? (
              <span className="animate-spin mr-1">•</span>
            ) : (
              <Download className="size-3.5 mr-1" />
            )}
            Laporan Tahunan
          </Button>
        </div>
      </div>

      {/* Segmented Header Tabs */}
      <div className="flex border-b border-border/60 bg-muted/20 p-1 rounded-lg gap-2 w-fit">
        {[
          { id: "kpi", label: "Pemenuhan & Ringkasan KPI" },
          { id: "unit", label: "Produktivitas Unit & Personel" },
          { id: "blindspot", label: "Cakupan Wilayah & Blind Spot" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "rounded-md px-4 py-2 text-xs font-semibold transition-all duration-200",
              activeTab === tab.id
                ? "bg-sky-500/10 text-sky-500 border border-sky-500/15 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Fulfillment & KPI Ringkasan Tab */}
      {activeTab === "kpi" && (
        <div className="space-y-6">
          {/* Top Row KPI Highlight Indicators */}
          <div className="grid gap-6 md:grid-cols-4">
            {/* UUK/PIR Fulfillment */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold">Pemenuhan UUK/PIR</CardDescription>
                <CardTitle className="text-3xl font-extrabold flex items-baseline gap-1 mt-1 text-sky-500">
                  93.0%
                  <span className="text-[10px] text-muted-foreground font-normal">Target: 90.0%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: "93%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  <TrendingUp className="size-3 text-emerald-500" />
                  Naik 2.1% dibanding triwulan lalu
                </p>
              </CardContent>
            </Card>

            {/* Kecepatan Respons */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold">Kecepatan Respons</CardDescription>
                <CardTitle className="text-3xl font-extrabold flex items-baseline gap-1 mt-1 text-emerald-500">
                  16.7 m
                  <span className="text-[10px] text-muted-foreground font-normal">Target: &lt; 30 m</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "80%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Clock className="size-3 text-emerald-500" />
                  Rata-rata respons unit regional sangat cepat
                </p>
              </CardContent>
            </Card>

            {/* Validasi Laporan */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold">Validasi Laporan</CardDescription>
                <CardTitle className="text-3xl font-extrabold flex items-baseline gap-1 mt-1 text-amber-500">
                  97.1%
                  <span className="text-[10px] text-muted-foreground font-normal">Target: 95.0%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "97.1%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Nilai BAKET dominan kategori A-1 & B-2
                </p>
              </CardContent>
            </Card>

            {/* Jumlah Revisi */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold">Rata-rata Revisi</CardDescription>
                <CardTitle className="text-3xl font-extrabold flex items-baseline gap-1 mt-1 text-rose-500">
                  3.8x
                  <span className="text-[10px] text-muted-foreground font-normal">Target: &lt; 5x</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: "68%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  <ShieldAlert className="size-3 text-rose-500" />
                  Turun 1.2% dari triwulan sebelumnya
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Details Explanation Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="size-4 text-sky-500" /> Audit Pemenuhan UUK/PIR
                </CardTitle>
                <CardDescription className="text-xs">Statistik pemenuhan target intelijen prioritas nasional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  Pemenuhan UUK (Upaya Utama Kinerja) dan PIR (Priority Intelligence Requirements) mengukur persentase arahan taktis eksekutif yang berhasil dipenuhi oleh jaring operasi intelijen regional di lapangan.
                </p>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-foreground">
                    <span>UUK Sektor Keamanan Perbatasan</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/20 bg-emerald-500/10 text-emerald-500">96% Tercapai</Badge>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-semibold text-foreground">
                    <span>UUK Siber & Perlindungan Infrastruktur Vital</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/20 bg-emerald-500/10 text-emerald-500">92% Tercapai</Badge>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-semibold text-foreground">
                    <span>UUK Deteksi Konflik Sosial-Politik Daerah</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/20 bg-emerald-500/10 text-emerald-500">91% Tercapai</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" /> Kecepatan Respons & Kualitas Laporan
                </CardTitle>
                <CardDescription className="text-xs">Rata-rata waktu tanggap darurat dan validasi akurasi laporan lapangan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  Evaluasi kecepatan respons mengukur jeda waktu dari pengiriman tanda *Panic Alert* di lapangan hingga pimpinan eksekutif merespons dan mengeluarkan instruksi bantuan taktis.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/10 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Akurasi Info A-1</p>
                    <p className="text-xl font-bold text-emerald-500 mt-1">84%</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Sangat tinggi & akurat</p>
                  </div>
                  <div className="rounded-lg border bg-muted/10 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tingkat Penolakan Info</p>
                    <p className="text-xl font-bold text-rose-500 mt-1">1.9%</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Penolakan draf di tingkat pusat</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Produktivitas Unit & Personel Tab */}
      {activeTab === "unit" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Daftar Produktivitas Unit Regional (Binda)</CardTitle>
            <CardDescription className="text-xs">
              Klik nama Binda untuk melakukan drill-down dan melihat kinerja personel lapangan serta jaring intelijen aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-4 font-semibold text-muted-foreground">ID Unit</th>
                    <th className="p-4 font-semibold text-muted-foreground">Nama Unit</th>
                    <th className="p-4 font-semibold text-muted-foreground">Pemenuhan UUK</th>
                    <th className="p-4 font-semibold text-muted-foreground">Personel Aktif</th>
                    <th className="p-4 font-semibold text-muted-foreground">Total Laporan</th>
                    <th className="p-4 font-semibold text-muted-foreground">Akurasi Validasi</th>
                    <th className="p-4 font-semibold text-muted-foreground">Rata-rata Respons</th>
                    <th className="p-4 font-semibold text-muted-foreground">Jumlah Revisi</th>
                    <th className="p-4 font-semibold text-muted-foreground text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {initialUnitsData.map((unit) => (
                    <tr key={unit.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-muted-foreground">{unit.id}</td>
                      <td className="p-4 font-bold text-foreground">{unit.name}</td>
                      <td className="p-4">
                        <span className={cn(
                          "font-bold",
                          unit.uukFulfillment >= 95 ? "text-emerald-500" :
                          unit.uukFulfillment >= 90 ? "text-sky-500" : "text-amber-500"
                        )}>{unit.uukFulfillment}%</span>
                      </td>
                      <td className="p-4 font-semibold">{unit.activePersonnel} Agen</td>
                      <td className="p-4">{unit.totalReports} Berkas</td>
                      <td className="p-4 font-semibold text-emerald-500">{unit.accuracyRate}%</td>
                      <td className="p-4 font-semibold">{unit.avgResponseTime} Menit</td>
                      <td className="p-4 font-semibold text-rose-500">{unit.revisionCount}x</td>
                      <td className="p-4 text-right">
                        <Button
                          onClick={() => setSelectedUnit(unit)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-sky-500 hover:text-sky-400 gap-1"
                          type="button"
                        >
                          Rincian Unit
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Coverage Wilayah & Blind Spot Tab */}
      {activeTab === "blindspot" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="size-4 text-sky-500" /> Analisis Coverage Wilayah Nasional
              </CardTitle>
              <CardDescription className="text-xs">Sebaran sensor deteksi dini dan aset intelijen regional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-muted-foreground">
              <p className="leading-relaxed">
                Platform **DENS CAKRA** membagi coverage wilayah nasional berdasarkan rasio kepadatan informan terdaftar serta kestabilan pemantauan infrastruktur kritis daerah.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-emerald-500/[0.03] border-emerald-500/20 p-4">
                  <p className="font-bold text-emerald-500 text-[11px] uppercase tracking-wider">Wilayah Hijau (Aman)</p>
                  <p className="text-lg font-bold text-foreground mt-2">12 Wilayah</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Coverage penuh & respons &lt; 15 menit</p>
                </div>
                <div className="rounded-lg border bg-amber-500/[0.03] border-amber-500/20 p-4">
                  <p className="font-bold text-amber-500 text-[11px] uppercase tracking-wider">Wilayah Kuning (Perhatian)</p>
                  <p className="text-lg font-bold text-foreground mt-2">6 Wilayah</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Kendala koneksi komunikasi radio cadangan</p>
                </div>
                <div className="rounded-lg border bg-rose-500/[0.03] border-rose-500/20 p-4">
                  <p className="font-bold text-rose-500 text-[11px] uppercase tracking-wider">Blind Spot (Kritis)</p>
                  <p className="text-lg font-bold text-foreground mt-2">2 Wilayah</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Ketiadaan aset intelijen aktif perbatasan</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blind Spots List */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-rose-500 flex items-center gap-2">
                <AlertTriangle className="size-4" /> Daftar Wilayah Blind Spot Terdeteksi
              </CardTitle>
              <CardDescription className="text-xs">
                Wilayah dengan cakupan informasi di bawah ambang batas minimum sistem komando BIN.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {blindSpotsData.map((bs) => (
                <div key={bs.id} className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-500">{bs.id}</span>
                      <p className="font-bold text-xs text-foreground">{bs.areaName}</p>
                    </div>
                    <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-500 text-[9px] font-bold">
                      Risiko {bs.riskLevel}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3 text-xs leading-relaxed text-muted-foreground">
                    <div className="col-span-2">
                      <p className="font-semibold text-foreground text-[10px] uppercase">Deskripsi Masalah:</p>
                      <p className="mt-1">{bs.reason}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-[10px] uppercase">Rata-rata Respons:</p>
                      <p className="mt-1 text-rose-500 font-bold">{bs.avgResponseTime} Menit</p>
                      <p className="text-[10px] mt-1">Aset Aktif: <strong className="text-foreground">{bs.activeAssets} Jaring</strong></p>
                    </div>
                  </div>
                  <div className="border-t border-rose-500/10 pt-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground text-[10px] uppercase">Rekomendasi Taktis Deputi:</p>
                    <p className="mt-1 leading-relaxed italic">"{bs.recommendation}"</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drill-Down Modal 1: Detail Unit (Binda) */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-4xl border border-border shadow-2xl flex flex-col max-h-[85vh]">
            <CardHeader className="flex flex-row items-start justify-between pb-3 shrink-0">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building className="size-4 text-sky-500" /> Rincian Kinerja Unit: {selectedUnit.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Cakupan Wilayah: <strong className="text-foreground">{selectedUnit.region}</strong> | ID Unit: <strong className="text-foreground font-mono">{selectedUnit.id}</strong>
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUnit(null)}
                className="size-8"
                type="button"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto space-y-6 flex-1 h-0">
              
              {/* Unit Metrics Overview */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4 text-xs">
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pemenuhan UUK</p>
                  <p className="text-lg font-bold text-sky-500 mt-1">{selectedUnit.uukFulfillment}%</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Akurasi Laporan</p>
                  <p className="text-lg font-bold text-emerald-500 mt-1">{selectedUnit.accuracyRate}%</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rata-rata Waktu Respons</p>
                  <p className="text-lg font-bold text-foreground mt-1">{selectedUnit.avgResponseTime} Menit</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Jumlah Revisi</p>
                  <p className="text-lg font-bold text-rose-500 mt-1">{selectedUnit.revisionCount}x</p>
                </div>
              </div>

              {/* Personnel List (Drill-Down level 2) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                  <Users className="size-4 text-sky-500" /> Daftar Personel / Agen Aktif di Unit Ini
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="p-3 font-semibold text-muted-foreground">ID Agen</th>
                        <th className="p-3 font-semibold text-muted-foreground">Nama Agen</th>
                        <th className="p-3 font-semibold text-muted-foreground">Jabatan / Peran</th>
                        <th className="p-3 font-semibold text-muted-foreground">Jumlah Berkas</th>
                        <th className="p-3 font-semibold text-muted-foreground">Aset Jaring</th>
                        <th className="p-3 font-semibold text-muted-foreground">Akurasi Info</th>
                        <th className="p-3 font-semibold text-muted-foreground">Rata-rata Respons</th>
                        <th className="p-3 font-semibold text-muted-foreground">Jumlah Revisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedUnit.personnelList.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-muted/10 transition-colors cursor-pointer"
                          onClick={() => setSelectedPersonnel(p)}
                        >
                          <td className="p-3 font-mono font-bold text-muted-foreground">{p.id}</td>
                          <td className="p-3 font-bold text-foreground">{p.name}</td>
                          <td className="p-3 font-medium">{p.role}</td>
                          <td className="p-3">{p.reportsCount} Berkas</td>
                          <td className="p-3 font-semibold text-sky-500">{p.activeAssets} Aset</td>
                          <td className="p-3 font-semibold text-emerald-500">{p.accuracyRate}%</td>
                          <td className="p-3 font-semibold">{p.avgResponseTime} Menit</td>
                          <td className="p-3 font-semibold text-rose-500">{p.revisionCount}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-4 border-t shrink-0 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUnit(null)}
                className="text-xs"
                type="button"
              >
                Tutup Rincian
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Drill-Down Modal 2: Detail Personel / Agen (Drill-Down Level 3) */}
      {selectedPersonnel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl border border-border shadow-2xl flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-3 shrink-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <User className="size-4 text-sky-500" /> Detail Aset Jaring: {selectedPersonnel.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Jabatan: <strong className="text-foreground">{selectedPersonnel.role}</strong> | ID Agen: <strong className="text-foreground font-mono">{selectedPersonnel.id}</strong>
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPersonnel(null)}
                className="size-8"
                type="button"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Aset Informan Binaan:</span>
                  <span className="font-bold text-foreground">{selectedPersonnel.activeAssets} Jaring</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rata-rata Akurasi Informasi:</span>
                  <span className="font-bold text-emerald-500">{selectedPersonnel.accuracyRate}%</span>
                </div>
              </div>

              {/* Jaring Informan Table */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Aset Jaring Terdaftar</p>
                <div className="border rounded-md overflow-hidden bg-background">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/20 text-[10px] text-muted-foreground font-semibold">
                        <th className="p-2.5">ID Jaring</th>
                        <th className="p-2.5">Lokasi Pos</th>
                        <th className="p-2.5">Keandalan</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {[...Array(3)].map((_, index) => (
                        <tr key={index} className="text-[11px]">
                          <td className="p-2.5 font-mono font-bold text-muted-foreground">{selectedPersonnel.id}-JAR-0{index + 1}</td>
                          <td className="p-2.5 font-medium">Sektor Pos 0{index + 1}</td>
                          <td className="p-2.5 font-semibold text-sky-500 font-mono">Nilai B-2</td>
                          <td className="p-2.5 text-right">
                            <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20" variant="outline">
                              Aktif
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPersonnel(null)}
                className="text-xs"
                type="button"
              >
                Tutup Detail Jaring
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
