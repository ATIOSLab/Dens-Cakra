"use client";

import { useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  KeyRound,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReportClassification = "Sangat Rahasia" | "Rahasia" | "Terbatas";
type ReportStatus = "Menunggu Tindakan" | "Disetujui" | "Dikembalikan";

interface AssessmentMatrix {
  sourceReliability: "A" | "B" | "C" | "D" | "E" | "F";
  infoAccuracy: "1" | "2" | "3" | "4" | "5" | "6";
}

interface ApprovalLog {
  role: string;
  actor: string;
  action: string;
  time: string;
  note?: string;
}

interface DistributionStatus {
  target: string;
  status: "Menunggu Pengesahan" | "Siap Didistribusikan" | "Terkirim";
  time?: string;
}

interface ApprovalReport {
  id: string;
  title: string;
  classification: ReportClassification;
  status: ReportStatus;
  date: string;
  sender: string;
  analystNotes: string;
  assessment: AssessmentMatrix;
  v10Content: string;
  v11Content: string;
  v10Summary: string;
  v11Summary: string;
  history: ApprovalLog[];
  distribution: DistributionStatus[];
  revisionNote?: string;
}

const classificationClass: Record<ReportClassification, string> = {
  "Sangat Rahasia": "border-red-500/25 bg-red-500/10 text-red-500 font-bold",
  Rahasia: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
  Terbatas: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
};

const statusClass: Record<ReportStatus, string> = {
  "Menunggu Tindakan": "border-amber-500/25 bg-amber-500/10 text-amber-500 animate-pulse",
  Disetujui: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
  Dikembalikan: "border-rose-500/25 bg-rose-500/10 text-rose-500",
};

// Deskripsi untuk Neraca Penilaian Intelijen (A-F & 1-6)
const sourceReliabilityText: Record<string, string> = {
  A: "Dapat Dipercaya Sepenuhnya (Sangat handal, memiliki rekam jejak integritas tinggi)",
  B: "Biasanya Dapat Dipercaya (Informan handal, mayoritas laporan sebelumnya terbukti akurat)",
  C: "Agak Dapat Dipercaya (Pernah memberikan info akurat, namun ada keraguan rekam jejak)",
  D: "Tidak Biasanya Dapat Dipercaya (Sering diragukan, rekam jejak info kurang konsisten)",
  E: "Tidak Dapat Dipercaya (Tidak handal, rekam jejak buruk)",
  F: "Keandalan Tidak Dapat Dinilai (Sumber baru atau tidak memiliki riwayat evaluasi)",
};

const infoAccuracyText: Record<string, string> = {
  "1": "Dikonfirmasi Sumber Lain (Info terverifikasi oleh jaring/metode intelijen independen)",
  "2": "Sangat Mungkin Benar (Sangat cocok dengan fakta lapangan atau tren analisis)",
  "3": "Mungkin Benar (Logis dan masuk akal, namun belum ada bukti penguat yang kuat)",
  "4": "Diragukan Kebenarannya (Kurang logis, bertentangan dengan data intelijen lain)",
  "5": "Tidak Mungkin Benar (Sangat tidak masuk akal, bertentangan dengan fakta primer)",
  "6": "Kebenaran Tidak Dapat Dinilai (Tidak ada pembanding, tidak dapat diuji silang)",
};

const initialReports: ApprovalReport[] = [
  {
    id: "REP-2026-0711-042",
    title: "Penyelundupan Senjata Api Taktis Skala Menengah Lintas Batas Entikong",
    classification: "Sangat Rahasia",
    status: "Menunggu Tindakan",
    date: "11 Jul 2026",
    sender: "Deputi II / Dalam Negeri",
    analystNotes:
      "Laporan telah diverifikasi silang dengan satgas perbatasan TNI dan jaring intelijen Sarawak. Rekomendasi tindakan adalah pengetatan pemeriksaan logistik kontainer kargo dan penempatan satuan khusus.",
    assessment: {
      sourceReliability: "A",
      infoAccuracy: "1",
    },
    v10Summary:
      "Laporan awal mendeteksi adanya aktivitas mencurigakan di pelabuhan darat Entikong berupa bongkar muat logistik ilegal skala menengah tanpa manifes bea cukai.",
    v11Summary:
      "Deteksi spesifik adanya penyelundupan 14 unit senjata api taktis otomatis laras panjang tipe serbu beserta 1.200 butir amunisi yang disembunyikan di dalam kompartemen ganda truk semen lintas batas.",
    v10Content:
      "Terjadi pemindahan logistik tidak terdaftar di titik koordinat 1.0543 LU dan 110.1245 BT pada malam hari menggunakan kendaraan niaga non-manifes. Diduga kuat merupakan komoditas ilegal selundupan daerah perbatasan.",
    v11Content:
      "Telah teridentifikasi bongkar muat 14 unit senjata serbu jenis karbin otomatis kaliber 5.56mm buatan pabrikan asing di bawah semen karungan. Pengiriman terafiliasi dengan jaringan kriminal bersenjata regional.",
    history: [
      {
        role: "Satgas Intelijen Perbatasan",
        actor: "FO-14 / Kapten inf Yudi",
        action: "Submit Draft Laporan Awal (v1.0)",
        time: "10 Jul 2026, 21.00 WIB",
      },
      {
        role: "Koordinator Perbatasan Binda",
        actor: "Letkol Edi S.",
        action: "Pembaruan detail tipe senjata & amunisi (v1.1)",
        time: "11 Jul 2026, 06.30 WIB",
      },
      {
        role: "Deputi II BIN",
        actor: "Mayjen Joko W.",
        action: "Verifikasi & Penerusan ke Eksekutif",
        time: "11 Jul 2026, 08.45 WIB",
        note: "Rekomendasi persetujuan prioritas tinggi.",
      },
    ],
    distribution: [
      { target: "Presiden RI", status: "Menunggu Pengesahan" },
      { target: "Menko Polhukam", status: "Menunggu Pengesahan" },
      { target: "Panglima TNI", status: "Menunggu Pengesahan" },
    ],
  },
  {
    id: "REP-2026-0710-039",
    title: "Kajian Taktis Pengamanan Jalur Distribusi Gas Medis Wilayah Jabodetabek",
    classification: "Rahasia",
    status: "Menunggu Tindakan",
    date: "10 Jul 2026",
    sender: "Korwil DKI Jakarta",
    analystNotes:
      "Mencegah potensi sabotase atau gejolak penjarahan depo gas medis industri oleh kelompok spekulan akibat kelangkaan pasokan regional triwulan ini.",
    assessment: {
      sourceReliability: "B",
      infoAccuracy: "2",
    },
    v10Summary:
      "Pengecekan keamanan alur distribusi tabung oksigen dan gas medis di wilayah industri Tangerang dan Bekasi menjelang lonjakan permintaan kesehatan.",
    v11Summary:
      "Pengamanan preventif stasiun pengisian gas sekunder dan depo utama Pertamina Tanjung Priok menggunakan pengawalan melekat personel militer gabungan.",
    v10Content:
      "Distribusi gas medis berjalan melalui rute tol utama Jakarta-Cikampek tanpa pengamanan khusus. Risiko hambatan dinilai rendah.",
    v11Content:
      "Distribusi dialihkan menggunakan pengawalan ketat Yon POM TNI guna menghindari penjarahan di pintu tol keluar serta stasiun pengisian depo utama Tanjung Priok.",
    history: [
      {
        role: "Analis Utama DKI",
        actor: "AKBP Fajar",
        action: "Drafting Kajian Keamanan (v1.0)",
        time: "10 Jul 2026, 11.00 WIB",
      },
      {
        role: "Kabinda DKI Jakarta",
        actor: "Brigjen Teddy",
        action: "Revisi skema pengamanan rute konvoi (v1.1)",
        time: "10 Jul 2026, 15.20 WIB",
      },
    ],
    distribution: [
      { target: "Menko Polhukam", status: "Menunggu Pengesahan" },
      { target: "Menteri Kesehatan", status: "Menunggu Pengesahan" },
    ],
  },
  {
    id: "REP-2026-0709-021",
    title: "Deteksi Aktivitas Siber Anomali pada Server Utama Pusat Data Pemerintah Provinsi",
    classification: "Terbatas",
    status: "Disetujui",
    date: "09 Jul 2026",
    sender: "Satgas Siber BIN",
    analystNotes:
      "Indikasi serangan pemindaian porta (*port scanning*) terstruktur berskala masif dari subnet IP luar negeri. Patching keamanan firewall harus segera diterapkan.",
    assessment: {
      sourceReliability: "C",
      infoAccuracy: "3",
    },
    v10Summary:
      "Adanya aktivitas lalu lintas data mencurigakan pada sub-server pemerintah provinsi yang sedikit meningkat dari rata-rata harian.",
    v11Summary:
      "Serangan brute-force terstruktur yang menargetkan kredensial administrator database utama daerah, melonjak hingga 400% dari biasanya.",
    v10Content:
      "Trafik server mengalami kenaikan berkala sejak awal Juli 2026. Laporan awal menyarankan pemantauan biasa.",
    v11Content:
      "Telah diblokir IP eksternal mencurigakan sejumlah 4.200 alamat IP asing yang mencoba masuk ke port administrasi server daerah secara serentak.",
    history: [
      {
        role: "Analis Siber BIN",
        actor: "Aris K.",
        action: "Drafting Laporan Insiden Siber (v1.0)",
        time: "08 Jul 2026, 22.00 WIB",
      },
      {
        role: "Direktur Siber BIN",
        actor: "Kolonel Budi",
        action: "Otorisasi teknis & rekomendasi mitigasi (v1.1)",
        time: "09 Jul 2026, 09.00 WIB",
      },
      {
        role: "Eksekutif Demo",
        actor: "Executive Demo",
        action: "Disetujui & TTD Elektronik",
        time: "09 Jul 2026, 14.00 WIB",
        note: "Segera koordinasikan dengan BSSN.",
      },
    ],
    distribution: [
      { target: "Presiden RI", status: "Terkirim", time: "09 Jul 2026, 14.05 WIB" },
      { target: "Kepala BSSN", status: "Terkirim", time: "09 Jul 2026, 14.05 WIB" },
    ],
  },
];

export function PersetujuanPage() {
  const [reports, setReports] = useState<ApprovalReport[]>(initialReports);
  const [selectedReportId, setSelectedReportId] = useState<string>(initialReports[0]?.id);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Tabs di dalam Viewer Detail
  const [detailTab, setDetailTab] = useState<"detail" | "compare" | "distribution">("detail");

  // State untuk Otorisasi PIN / Tanda Tangan Elektronik
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // State untuk Kembalikan (Revision)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? reports[0];

  // Filtering list
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sender.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "pending") {
      return matchesSearch && r.status === "Menunggu Tindakan";
    }
    return matchesSearch && (r.status === "Disetujui" || r.status === "Dikembalikan");
  });

  // Action Handlers
  const handleOpenApproveModal = () => {
    setIsPinModalOpen(true);
    setPinInput("");
    setPinError("");
  };

  const handleVerifyPinAndApprove = () => {
    // Simulasi verifikasi PIN keamanan taktis BIN (PIN default: 123456)
    if (pinInput === "123456") {
      setReports((current) =>
        current.map((r) => {
          if (r.id !== selectedReport.id) return r;
          return {
            ...r,
            status: "Disetujui",
            history: [
              {
                role: "Eksekutif",
                actor: "Executive Demo",
                action: "Persetujuan Akhir & Tanda Tangan Elektronik Tersemat",
                time: "Sekarang",
              },
              ...r.history,
            ],
            distribution: r.distribution.map((d) => ({
              ...d,
              status: "Terkirim",
              time: "Sekarang",
            })),
          };
        }),
      );
      setIsPinModalOpen(false);
      setPinInput("");
    } else {
      setPinError("PIN Otorisasi salah. Silakan coba lagi.");
    }
  };

  const handleReturnSubmit = () => {
    if (!revisionNote.trim()) return;

    setReports((current) =>
      current.map((r) => {
        if (r.id !== selectedReport.id) return r;
        return {
          ...r,
          status: "Dikembalikan",
          revisionNote: revisionNote.trim(),
          history: [
            {
              role: "Eksekutif",
              actor: "Executive Demo",
              action: `Dikembalikan untuk revisi. Catatan: ${revisionNote.trim()}`,
              time: "Sekarang",
            },
            ...r.history,
          ],
        };
      }),
    );

    setIsReturnModalOpen(false);
    setRevisionNote("");
  };

  return (
    <div className="@container/main flex flex-col gap-6 p-1">
      {/* Title Header */}
      <div className="flex flex-col gap-4 border-border/40 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Otorisasi & Persetujuan</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Kendali otorisasi dokumen intelijen strategis, perbandingan draf versi, verifikasi keandalan sumber, dan
            pembubuhan tanda tangan digital.
          </p>
        </div>
      </div>

      {/* Main Approval Grid Console */}
      <div className="grid gap-6 xl:grid-cols-[400px_1fr] xl:items-stretch">
        {/* Left Column: Sidebar Queue List */}
        <div className="flex flex-col gap-4 h-full">
          <Card className="flex flex-col h-full flex-1">
            <CardHeader className="pb-3 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari laporan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Segmented Queue Filter */}
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/30 p-1">
                <button
                  onClick={() => {
                    setActiveTab("pending");
                    const list = reports.filter((r) => r.status === "Menunggu Tindakan");
                    if (list.length > 0) setSelectedReportId(list[0].id);
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200",
                    activeTab === "pending"
                      ? "bg-amber-500/10 text-amber-500 shadow-sm border border-amber-500/15"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  type="button"
                >
                  Menunggu Tindakan ({reports.filter((r) => r.status === "Menunggu Tindakan").length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab("history");
                    const list = reports.filter((r) => r.status !== "Menunggu Tindakan");
                    if (list.length > 0) setSelectedReportId(list[0].id);
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200",
                    activeTab === "history"
                      ? "bg-emerald-500/10 text-emerald-500 shadow-sm border border-emerald-500/15"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  type="button"
                >
                  Riwayat Selesai ({reports.filter((r) => r.status !== "Menunggu Tindakan").length})
                </button>
              </div>
            </CardHeader>

            {/* Queue List Scrollable Container */}
            <CardContent className="p-4 flex-1 overflow-y-auto h-0 space-y-2">
              <div className="flex flex-col gap-2">
                {filteredReports.map((r) => {
                  const isSelected = r.id === selectedReportId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReportId(r.id)}
                      className={cn(
                        "w-full flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all duration-200",
                        isSelected
                          ? "border-sky-500 bg-sky-500/[0.02] ring-1 ring-sky-500/25"
                          : "border-border bg-card hover:bg-muted/40",
                      )}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                        <Badge
                          className={cn("text-[9px] py-0 px-1.5", classificationClass[r.classification])}
                          variant="outline"
                        >
                          {r.classification}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground leading-snug line-clamp-2">{r.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                          <span>Asal: {r.sender}</span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-1">
                        <span className="text-[9px] text-muted-foreground">{r.date}</span>
                        <Badge className={cn("text-[9px] py-0 px-1.5", statusClass[r.status])} variant="outline">
                          {r.status}
                        </Badge>
                      </div>
                    </button>
                  );
                })}

                {filteredReports.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada antrian persetujuan yang cocok.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Approval Detail & Workstation */}
        <div className="flex flex-col gap-6 h-full">
          {selectedReport ? (
            <Card className="flex flex-col h-full flex-1">
              {/* Card Header (Details & Status) */}
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4 space-y-0 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-500 font-bold">{selectedReport.id}</span>
                    <Badge className={classificationClass[selectedReport.classification]} variant="outline">
                      {selectedReport.classification}
                    </Badge>
                    <Badge className={statusClass[selectedReport.status]} variant="outline">
                      {selectedReport.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-1 leading-snug">{selectedReport.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-3">
                    <span>
                      Pengirim: <strong className="text-foreground">{selectedReport.sender}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Tanggal Diajukan: <strong className="text-foreground">{selectedReport.date}</strong>
                    </span>
                  </CardDescription>
                </div>
              </CardHeader>

              {/* Tab Selector inside Detail Viewer */}
              <div className="flex border-b border-border/60 bg-muted/20 px-6 shrink-0">
                {[
                  { id: "detail", label: "Detail & Catatan Analis" },
                  { id: "compare", label: "Perbandingan Versi (v1.0 vs v1.1)" },
                  { id: "distribution", label: "Alur Persetujuan & Distribusi" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={cn(
                      "border-b-2 px-4 py-3 text-xs font-semibold transition-all duration-200 -mb-px",
                      detailTab === tab.id
                        ? "border-sky-500 text-sky-500"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Display */}
              <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto h-0">
                {/* 1. Detail & Catatan Analis Tab */}
                {detailTab === "detail" && (
                  <div className="space-y-6">
                    {/* Catatan Analis (Penting) */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                        <FileText className="size-4 text-sky-500" /> Catatan Analis Operasional
                      </h3>
                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-xs leading-relaxed text-muted-foreground">
                        {selectedReport.analystNotes}
                      </div>
                    </div>

                    {/* Neraca Penilaian Intelijen Read-Only */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-500" /> Neraca Penilaian Laporan (Read-Only)
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Keandalan Sumber */}
                        <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                              Keandalan Sumber
                            </span>
                            <Badge className="font-mono bg-sky-500/10 text-sky-500 font-bold text-xs">
                              Klasifikasi {selectedReport.assessment.sourceReliability}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-foreground">
                            {sourceReliabilityText[selectedReport.assessment.sourceReliability]}
                          </p>
                        </div>

                        {/* Kebenaran Informasi */}
                        <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                              Kebenaran Informasi
                            </span>
                            <Badge className="font-mono bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                              Derajat {selectedReport.assessment.infoAccuracy}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-foreground">
                            {infoAccuracyText[selectedReport.assessment.infoAccuracy]}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Isi Laporan Utama */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                        <Users className="size-4 text-sky-500" /> Dokumen Analisis Lengkap (v1.1)
                      </h3>
                      <div className="rounded-lg border bg-muted/10 p-4 text-xs leading-relaxed text-muted-foreground space-y-3">
                        <p className="font-semibold text-foreground text-xs">Ringkasan:</p>
                        <p className="bg-muted/20 p-3 rounded italic">{selectedReport.v11Summary}</p>
                        <p className="font-semibold text-foreground text-xs mt-4">Isi Pembahasan:</p>
                        <p>{selectedReport.v11Content}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Perbandingan Versi Tab */}
                {detailTab === "compare" && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-500 flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      <span>
                        Eksekutif membandingkan modifikasi naskah draf awal (v1.0) dengan perbaikan analis (v1.1).
                      </span>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Versi 1.0 (Draf Awal) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-xs text-muted-foreground">Draft Asal (v1.0)</span>
                          <span className="text-[10px] text-muted-foreground">Drafted by Analyst</span>
                        </div>
                        <div className="rounded-lg border bg-muted/25 p-4 text-xs leading-relaxed text-muted-foreground space-y-3 min-h-64">
                          <p className="font-bold text-foreground opacity-60">Ringkasan:</p>
                          <p className="bg-background/40 p-2.5 rounded italic opacity-70">
                            {selectedReport.v10Summary}
                          </p>
                          <p className="font-bold text-foreground opacity-60 mt-4">Isi Draf:</p>
                          <p className="opacity-70 line-through decoration-rose-500/50">{selectedReport.v10Content}</p>
                        </div>
                      </div>

                      {/* Versi 1.1 (Perbaikan / Terbaru) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-xs text-sky-500">Revisi Terbaru (v1.1)</span>
                          <Badge
                            variant="outline"
                            className="border-sky-500/30 bg-sky-500/10 text-sky-500 font-mono text-[9px]"
                          >
                            Aktif / Pengajuan
                          </Badge>
                        </div>
                        <div className="rounded-lg border border-sky-500/15 bg-muted/5 p-4 text-xs leading-relaxed text-muted-foreground space-y-3 min-h-64">
                          <p className="font-bold text-foreground">Ringkasan Terbaru:</p>
                          <p className="bg-sky-500/[0.03] border border-sky-500/10 p-2.5 rounded italic text-foreground">
                            {selectedReport.v11Summary}
                          </p>
                          <p className="font-bold text-foreground mt-4">Isi Terbaru:</p>
                          <p className="text-foreground bg-emerald-500/[0.03] p-2.5 rounded border border-emerald-500/10">
                            {selectedReport.v11Content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Alur Persetujuan & Distribusi Tab */}
                {detailTab === "distribution" && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Riwayat Persetujuan Berjenjang */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                        <Clock3 className="size-4 text-sky-500" /> Riwayat Persetujuan & Tanda Tangan
                      </h3>
                      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                        {selectedReport.history.map((log, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3 text-xs leading-relaxed border-l-2 border-border/70 pl-3 relative ml-1"
                          >
                            <span className="absolute -left-1.5 top-1.5 size-2.5 rounded-full border bg-background flex items-center justify-center shrink-0">
                              <span className="size-1 rounded-full bg-sky-500" />
                            </span>
                            <div className="space-y-1">
                              <p className="font-bold text-foreground">{log.action}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {log.time} — {log.actor} ({log.role})
                              </p>
                              {log.note && (
                                <p className="text-[11px] italic text-muted-foreground bg-background px-2.5 py-1.5 rounded border">
                                  "{log.note}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Distribusi Target */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                        <Send className="size-4 text-purple-500" /> Distribusi Naskah Intelijen
                      </h3>
                      <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-xs">
                        {selectedReport.distribution.map((dist, idx) => (
                          <div key={idx} className="flex flex-col gap-2 rounded-xl border bg-background p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                              <span className="font-semibold text-foreground text-xs">{dist.target}</span>
                            </div>
                            <div className="pl-4 flex items-center justify-between gap-2">
                              <Badge
                                className={cn(
                                  "text-[9px] py-0.5 px-2 font-medium shrink-0",
                                  dist.status === "Terkirim"
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                )}
                                variant="outline"
                              >
                                {dist.status}
                              </Badge>
                              {dist.time && (
                                <span className="text-[9px] text-muted-foreground font-mono">{dist.time}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Khusus jika Produk Disetujui / Dikembalikan */}
                {selectedReport.status === "Disetujui" && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-500 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="size-4" />
                      Laporan Disetujui & Tanda Tangan Elektronik Tersemat secara Aman
                    </div>
                    <span className="font-mono text-[9px] opacity-75">TTD-CRYPT-VERIFIED-7889A</span>
                  </div>
                )}

                {selectedReport.status === "Dikembalikan" && selectedReport.revisionNote && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-500">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="size-4" />
                      Laporan Dikembalikan untuk Revisi (Catatan Terkirim)
                    </div>
                    <p className="mt-2 pl-6 leading-relaxed italic">"{selectedReport.revisionNote}"</p>
                  </div>
                )}
              </CardContent>

              {/* Bottom Action Footer */}
              {selectedReport.status === "Menunggu Tindakan" && (
                <div className="flex items-center justify-end gap-3 border-t bg-card px-6 py-4 shrink-0">
                  <Button
                    onClick={() => setIsReturnModalOpen(true)}
                    className="h-9 text-xs"
                    variant="warning"
                    size="sm"
                  >
                    <RotateCcw className="size-3.5" />
                    Kembalikan untuk Revisi
                  </Button>
                  <Button onClick={handleOpenApproveModal} className="h-9 text-xs" variant="success" size="sm">
                    <UserCheck className="size-3.5" />
                    Setujui & Sahkan Laporan
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm flex items-center justify-center min-h-[400px]">
              Silakan pilih laporan untuk melihat detail persetujuan.
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Tanda Tangan Elektronik (Tactical PIN Verification) */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm border border-border shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="size-4 text-emerald-500" /> Verifikasi Tanda Tangan Elektronik
                </CardTitle>
                <CardDescription className="text-[11px] mt-1">
                  Masukkan PIN Otorisasi Taktis Anda untuk menandatangani secara sah produk intelijen ini.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinInput("");
                }}
                className="size-8"
                type="button"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  PIN Keamanan (Kunci Demo: 123456):
                </span>
                <Input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError("");
                  }}
                  placeholder="• • • • • •"
                  className="text-center tracking-widest text-lg font-bold h-10"
                  maxLength={6}
                />
                {pinError && <p className="text-[10px] text-rose-500 font-semibold">{pinError}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPinInput("");
                  }}
                  className="text-xs"
                  type="button"
                >
                  Batal
                </Button>
                <Button
                  disabled={pinInput.length !== 6}
                  onClick={handleVerifyPinAndApprove}
                  size="sm"
                  className="text-xs"
                  variant="success"
                  type="button"
                >
                  Verifikasi & TTD
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal 2: Kembalikan (Revision) */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border border-border shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-rose-500 flex items-center gap-2">
                  <RotateCcw className="size-4" /> Kembalikan untuk Revisi
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Catatan revisi wajib diisi untuk memberikan arahan perbaikan teknis/taktis naskah kepada jaring
                  analis.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  setRevisionNote("");
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
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Contoh: Harap lampirkan data pendukung alur kargo serta koordinat jalur darat lebih lengkap..."
                  className="min-h-32 text-xs resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsReturnModalOpen(false);
                    setRevisionNote("");
                  }}
                  className="text-xs"
                  type="button"
                >
                  Batal
                </Button>
                <Button
                  disabled={!revisionNote.trim()}
                  onClick={handleReturnSubmit}
                  size="sm"
                  className="text-xs"
                  variant="warning"
                  type="button"
                >
                  <Send className="size-3.5" />
                  Kirim Catatan Revisi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
