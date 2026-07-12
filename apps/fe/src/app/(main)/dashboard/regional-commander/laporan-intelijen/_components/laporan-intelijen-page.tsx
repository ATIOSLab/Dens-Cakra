"use client";

import { useMemo, useState } from "react";

import {
  Archive,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FileClock,
  FileText,
  History,
  Link2,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReportStatus = "Draft" | "Menunggu Persetujuan" | "Disahkan" | "Dikembalikan" | "Ditolak" | "Arsip";

type Report = {
  id: string;
  title: string;
  type: "Laporan Intelijen" | "Laporan Informasi";
  status: ReportStatus;
  classification: "RAHASIA" | "TERBATAS";
  region: string;
  author: string;
  submittedAt: string;
  updatedAt: string;
  version: string;
  progress: number;
  urgency: "Prioritas" | "Rutin";
  uuk: string;
  executiveSummary: string;
  facts: string;
  analysis: string;
  impact: string;
  recommendation: string;
  sources: Array<{
    id: string;
    title: string;
    assessment: string;
    note: string;
  }>;
  attachments: Array<{ name: string; type: string; size: string }>;
  versions: Array<{ version: string; actor: string; date: string; note: string }>;
  distribution: string[];
  copies: string[];
  reviewerNote?: string;
};

const initialReports: Report[] = [
  {
    id: "LI-REG/017/VII/2026",
    title: "Perkembangan konsolidasi kelompok dan potensi eskalasi wilayah utara",
    type: "Laporan Intelijen",
    status: "Menunggu Persetujuan",
    classification: "RAHASIA",
    region: "Wilayah Utara",
    author: "OIM Regional Utara",
    submittedAt: "11 Jul 2026, 08.40",
    updatedAt: "11 Jul 2026, 08.40",
    version: "v1.3",
    progress: 100,
    urgency: "Prioritas",
    uuk: "UUK-REG/041/VI/2026",
    executiveSummary:
      "Terdapat peningkatan intensitas konsolidasi pada tiga titik wilayah utara. Pola komunikasi dan mobilisasi menunjukkan potensi eskalasi dalam 48-72 jam, namun belum ditemukan indikasi tindakan terbuka.",
    facts:
      "Tiga pertemuan terkonfirmasi berlangsung pada 8-10 Juli 2026. Pergerakan terpantau di sektor Alfa dan Bravo dengan jumlah peserta yang meningkat pada setiap kegiatan.",
    analysis:
      "Korelasi antar-BAKET menunjukkan kegiatan memiliki keterkaitan operasional. Peningkatan frekuensi dan perpindahan lokasi dinilai sebagai upaya mengurangi keterpantauan.",
    impact:
      "Potensi gangguan ketertiban bersifat lokal dan dapat meluas apabila konsolidasi berlanjut tanpa langkah mitigasi wilayah.",
    recommendation:
      "Meningkatkan pemantauan pada sektor Alfa dan Bravo, memperbarui pemetaan simpul komunikasi, serta menyiapkan laporan perkembangan setiap 12 jam.",
    sources: [
      {
        id: "BAKET-2026-0711-014",
        title: "Kegiatan pertemuan sektor Alfa",
        assessment: "A2",
        note: "Sumber sepenuhnya dipercaya; isi sangat mungkin benar.",
      },
      {
        id: "BAKET-2026-0710-032",
        title: "Pergerakan personel sektor Bravo",
        assessment: "B2",
        note: "Sumber biasanya dipercaya; isi sangat mungkin benar.",
      },
      {
        id: "BAKET-2026-0709-021",
        title: "Pola komunikasi lintas sektor",
        assessment: "B3",
        note: "Sumber biasanya dipercaya; isi mungkin benar.",
      },
    ],
    attachments: [
      { name: "Peta-sebaran-sektor.pdf", type: "PDF", size: "2,4 MB" },
      { name: "Dokumentasi-kegiatan.zip", type: "ZIP", size: "8,7 MB" },
      { name: "Matriks-korelasi.xlsx", type: "XLSX", size: "684 KB" },
    ],
    versions: [
      {
        version: "v1.3",
        actor: "OIM Regional Utara",
        date: "11 Jul 2026, 08.40",
        note: "Melengkapi dampak dan saran tindak sebelum diajukan.",
      },
      {
        version: "v1.2",
        actor: "Analis OIM",
        date: "10 Jul 2026, 20.15",
        note: "Menambahkan BAKET sektor Bravo dan matriks korelasi.",
      },
      {
        version: "v1.0",
        actor: "OIM Regional Utara",
        date: "10 Jul 2026, 14.30",
        note: "Draft awal dibuat.",
      },
    ],
    distribution: ["Direktur Utama", "Regional Commander"],
    copies: ["OIM Regional Utara"],
  },
  {
    id: "LI-REG/016/VII/2026",
    title: "Evaluasi dinamika tuntutan kelompok pekerja kawasan industri",
    type: "Laporan Intelijen",
    status: "Dikembalikan",
    classification: "RAHASIA",
    region: "Wilayah Barat",
    author: "OIM Regional Barat",
    submittedAt: "10 Jul 2026, 13.05",
    updatedAt: "10 Jul 2026, 16.20",
    version: "v2.0",
    progress: 84,
    urgency: "Prioritas",
    uuk: "UUK-REG/038/VI/2026",
    executiveSummary:
      "Tuntutan kelompok pekerja mengerucut pada tiga isu utama. Rencana aksi masih dalam tahap koordinasi dan belum memiliki waktu pelaksanaan yang disepakati.",
    facts: "Koordinasi berlangsung melalui pertemuan terbatas dan kanal komunikasi internal pada 6-9 Juli 2026.",
    analysis:
      "Data jumlah peserta antar-sumber belum konsisten sehingga skala potensi aksi belum dapat disimpulkan secara memadai.",
    impact:
      "Aksi dapat menghambat akses kawasan industri dan memengaruhi aktivitas produksi apabila melibatkan lebih dari dua simpul pekerja.",
    recommendation:
      "Lakukan pengembangan sumber untuk memastikan jumlah massa, koordinator lapangan, dan jadwal konsolidasi berikutnya.",
    sources: [
      {
        id: "BAKET-2026-0709-018",
        title: "Pertemuan pengurus kelompok pekerja",
        assessment: "B3",
        note: "Sumber biasanya dipercaya; isi mungkin benar.",
      },
      {
        id: "BAKET-2026-0708-044",
        title: "Rangkuman tuntutan kawasan industri",
        assessment: "C3",
        note: "Kepercayaan sumber belum dapat dinilai; isi mungkin benar.",
      },
    ],
    attachments: [{ name: "Rangkuman-tuntutan.pdf", type: "PDF", size: "1,2 MB" }],
    versions: [
      {
        version: "v2.0",
        actor: "OIM Regional Barat",
        date: "10 Jul 2026, 13.05",
        note: "Pengajuan ulang setelah melengkapi fakta utama.",
      },
      {
        version: "v1.0",
        actor: "OIM Regional Barat",
        date: "9 Jul 2026, 18.10",
        note: "Draft awal dibuat.",
      },
    ],
    distribution: ["Regional Commander"],
    copies: ["OIM Regional Barat"],
    reviewerNote: "Lengkapi validasi estimasi massa dan jelaskan perbedaan angka pada BAKET-018 dan BAKET-044.",
  },
  {
    id: "LI-REG/015/VII/2026",
    title: "Pemetaan kerawanan jalur distribusi logistik wilayah timur",
    type: "Laporan Intelijen",
    status: "Disahkan",
    classification: "TERBATAS",
    region: "Wilayah Timur",
    author: "OIM Regional Timur",
    submittedAt: "9 Jul 2026, 09.25",
    updatedAt: "9 Jul 2026, 14.12",
    version: "v1.1",
    progress: 100,
    urgency: "Rutin",
    uuk: "UUK-REG/031/VI/2026",
    executiveSummary:
      "Dua jalur distribusi memiliki tingkat kerawanan menengah akibat hambatan akses dan peningkatan aktivitas kelompok lokal.",
    facts:
      "Hambatan akses tercatat pada dua ruas utama selama tujuh hari terakhir dengan durasi antara 30 hingga 90 menit.",
    analysis:
      "Gangguan bersifat berulang tetapi belum menunjukkan pola terkoordinasi. Jalur alternatif dapat digunakan dengan tambahan waktu tempuh.",
    impact: "Keterlambatan distribusi dapat terjadi pada jam padat dengan dampak terbatas pada pasokan wilayah timur.",
    recommendation: "Koordinasikan pemantauan jam rawan dan siapkan jalur alternatif untuk distribusi prioritas.",
    sources: [
      {
        id: "BAKET-2026-0708-007",
        title: "Hambatan akses jalur utama",
        assessment: "A2",
        note: "Sumber sepenuhnya dipercaya; isi sangat mungkin benar.",
      },
      {
        id: "BAKET-2026-0707-029",
        title: "Aktivitas kelompok lokal",
        assessment: "B3",
        note: "Sumber biasanya dipercaya; isi mungkin benar.",
      },
    ],
    attachments: [
      { name: "Peta-jalur-logistik.pdf", type: "PDF", size: "3,1 MB" },
      { name: "Rekap-hambatan.xlsx", type: "XLSX", size: "510 KB" },
    ],
    versions: [
      {
        version: "v1.1",
        actor: "Regional Commander",
        date: "9 Jul 2026, 14.12",
        note: "Disahkan dan diteruskan untuk distribusi.",
      },
      {
        version: "v1.0",
        actor: "OIM Regional Timur",
        date: "9 Jul 2026, 09.25",
        note: "Draft diajukan untuk persetujuan.",
      },
    ],
    distribution: ["Direktur Utama", "Regional Commander", "OIM Regional Timur"],
    copies: ["Koordinator Lapangan Timur", "Arsip Regional"],
  },
  {
    id: "LIN-REG/044/VII/2026",
    title: "Laporan perkembangan situasi kegiatan publik wilayah tengah",
    type: "Laporan Informasi",
    status: "Draft",
    classification: "TERBATAS",
    region: "Wilayah Tengah",
    author: "OIM Regional Tengah",
    submittedAt: "Belum diajukan",
    updatedAt: "8 Jul 2026, 17.45",
    version: "v0.4",
    progress: 62,
    urgency: "Rutin",
    uuk: "UUK-REG/035/VI/2026",
    executiveSummary: "Draft masih disusun oleh OIM dan belum masuk ke ruang persetujuan Regional Commander.",
    facts: "Data fakta dan kronologi sedang dilengkapi oleh penyusun.",
    analysis: "Analisis awal belum final.",
    impact: "Dampak masih dalam penilaian.",
    recommendation: "Saran tindak belum difinalkan.",
    sources: [
      {
        id: "BAKET-2026-0708-031",
        title: "Situasi kegiatan publik",
        assessment: "B2",
        note: "Sumber biasanya dipercaya; isi sangat mungkin benar.",
      },
    ],
    attachments: [],
    versions: [
      {
        version: "v0.4",
        actor: "OIM Regional Tengah",
        date: "8 Jul 2026, 17.45",
        note: "Penyusunan analisis awal.",
      },
    ],
    distribution: [],
    copies: [],
  },
  {
    id: "LI-REG/012/VI/2026",
    title: "Analisis perkembangan isu lintas wilayah periode Juni",
    type: "Laporan Intelijen",
    status: "Arsip",
    classification: "RAHASIA",
    region: "Lintas Wilayah",
    author: "OIM Regional",
    submittedAt: "28 Jun 2026, 10.00",
    updatedAt: "30 Jun 2026, 16.00",
    version: "v1.2",
    progress: 100,
    urgency: "Rutin",
    uuk: "UUK-REG/022/VI/2026",
    executiveSummary: "Produk intelijen periode Juni telah selesai didistribusikan dan dipindahkan ke arsip regional.",
    facts: "Fakta lengkap tersedia pada versi final laporan.",
    analysis: "Analisis mencakup korelasi perkembangan isu pada empat wilayah.",
    impact: "Dampak telah menjadi dasar evaluasi akhir periode.",
    recommendation: "Pemantauan dilanjutkan melalui UUK periode berikutnya.",
    sources: [
      {
        id: "BAKET-2026-0627-011",
        title: "Rekap perkembangan wilayah",
        assessment: "A2",
        note: "Sumber sepenuhnya dipercaya; isi sangat mungkin benar.",
      },
    ],
    attachments: [{ name: "Laporan-final-juni.pdf", type: "PDF", size: "4,8 MB" }],
    versions: [
      {
        version: "v1.2",
        actor: "Regional Commander",
        date: "30 Jun 2026, 16.00",
        note: "Dipindahkan ke arsip setelah distribusi selesai.",
      },
    ],
    distribution: ["Direktur Utama", "Regional Commander"],
    copies: ["OIM Regional", "Arsip Regional"],
  },
];

const filterTabs = ["Semua", "Draft", "Menunggu Persetujuan", "Disahkan", "Dikembalikan", "Arsip"] as const;

const statusStyle: Record<ReportStatus, string> = {
  Draft: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  "Menunggu Persetujuan": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Disahkan: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Dikembalikan: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Ditolak: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  Arsip: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const _statusDot: Record<ReportStatus, string> = {
  Draft: "bg-slate-500",
  "Menunggu Persetujuan": "bg-amber-500",
  Disahkan: "bg-emerald-500",
  Dikembalikan: "bg-orange-500",
  Ditolak: "bg-red-500",
  Arsip: "bg-violet-500",
};

const inactiveStatusMessage: Record<ReportStatus, string> = {
  Draft: "Laporan masih disusun oleh OIM",
  "Menunggu Persetujuan": "Laporan menunggu keputusan Regional Commander",
  Disahkan: "Laporan telah disahkan",
  Dikembalikan: "Laporan sedang diperbaiki oleh OIM",
  Ditolak: "Laporan telah ditutup sebagai ditolak",
  Arsip: "Laporan tersimpan di arsip regional",
};

type Decision = "approve" | "return" | "reject" | null;

export function LaporanIntelijenPage() {
  const [reports, setReports] = useState(initialReports);
  const [activeFilter, setActiveFilter] = useState<(typeof filterTabs)[number]>("Semua");
  const [selectedId, setSelectedId] = useState(initialReports[0].id);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Produk");
  const [detailTab, setDetailTab] = useState("ringkasan");
  const [internalNote, setInternalNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [decision, setDecision] = useState<Decision>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedReport = reports.find((report) => report.id === selectedId) ?? reports[0];

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesTab =
        activeFilter === "Semua" ||
        report.status === activeFilter ||
        (activeFilter === "Arsip" && report.status === "Ditolak");
      const matchesType = typeFilter === "Semua Produk" || report.type === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        report.title.toLowerCase().includes(normalizedQuery) ||
        report.id.toLowerCase().includes(normalizedQuery) ||
        report.region.toLowerCase().includes(normalizedQuery);

      return matchesTab && matchesType && matchesQuery;
    });
  }, [activeFilter, query, reports, typeFilter]);

  const counts = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((report) => report.status === "Menunggu Persetujuan").length,
      returned: reports.filter((report) => report.status === "Dikembalikan").length,
      approved: reports.filter((report) => report.status === "Disahkan").length,
    }),
    [reports],
  );

  const selectReport = (id: string) => {
    setSelectedId(id);
    setDetailTab("ringkasan");
    setInternalNote("");
    setSavedNote("");
    setNotice("");
  };

  const openDecision = (value: Exclude<Decision, null>) => {
    setDecision(value);
    setDecisionNote("");
    setDecisionError("");
  };

  const confirmDecision = () => {
    if (!decision) return;
    if (decision !== "approve" && !decisionNote.trim()) {
      setDecisionError("Catatan wajib diisi untuk pengembalian atau penolakan.");
      return;
    }

    const decisionResult: Record<Exclude<Decision, null>, { status: ReportStatus; label: string }> = {
      approve: { status: "Disahkan", label: "disahkan" },
      return: { status: "Dikembalikan", label: "dikembalikan ke OIM" },
      reject: { status: "Ditolak", label: "ditolak" },
    };
    const { status: nextStatus, label: actionLabel } = decisionResult[decision];

    setReports((current) =>
      current.map((report) =>
        report.id === selectedReport.id
          ? {
              ...report,
              status: nextStatus,
              reviewerNote: decisionNote.trim() || "Disetujui tanpa catatan tambahan.",
              versions: [
                {
                  version: report.version,
                  actor: "Regional Commander",
                  date: "11 Jul 2026, sekarang",
                  note: `Laporan ${actionLabel}.`,
                },
                ...report.versions,
              ],
            }
          : report,
      ),
    );
    setNotice(`Keputusan tersimpan. Laporan ${actionLabel}.`);
    setDecision(null);
  };

  const saveInternalNote = () => {
    if (!internalNote.trim()) return;
    setSavedNote(internalNote.trim());
    setInternalNote("");
    setNotice("Catatan internal tersimpan tanpa mengubah status laporan.");
  };

  const archiveReport = () => {
    setReports((current) =>
      current.map((report) => (report.id === selectedReport.id ? { ...report, status: "Arsip" } : report)),
    );
    setNotice("Laporan dipindahkan ke arsip regional.");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="border-b px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>KOMANDAN REGIONAL</span>
              <span className="text-border">/</span>
              <span>PRODUK INTELIJEN</span>
            </div>
            <h1 className="font-semibold text-2xl tracking-normal">Laporan Intelijen</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
              Review produk intelijen wilayah, putuskan persetujuan, dan pantau distribusi.
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock3 className="size-4" />
            <span>Diperbarui 11 Jul 2026, 09.15 WIB</span>
          </div>
        </div>
      </header>

      <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FileText}
          label="Total produk"
          value={counts.total}
          helper="Dalam wilayah akses"
          active={activeFilter === "Semua"}
          onClick={() => setActiveFilter("Semua")}
        />
        <Metric
          icon={FileClock}
          label="Menunggu persetujuan"
          value={counts.pending}
          helper="Memerlukan keputusan"
          tone="amber"
          active={activeFilter === "Menunggu Persetujuan"}
          onClick={() => setActiveFilter("Menunggu Persetujuan")}
        />
        <Metric
          icon={RotateCcw}
          label="Dikembalikan"
          value={counts.returned}
          helper="Dalam perbaikan OIM"
          tone="orange"
          active={activeFilter === "Dikembalikan"}
          onClick={() => setActiveFilter("Dikembalikan")}
        />
        <Metric
          icon={FileCheck2}
          label="Disahkan"
          value={counts.approved}
          helper="Siap didistribusikan"
          tone="emerald"
          active={activeFilter === "Disahkan"}
          onClick={() => setActiveFilter("Disahkan")}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nomor, judul, atau wilayah..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-full border-border/60 bg-background/50 text-xs sm:w-52">
                <FileText className="mr-1.5 size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Pilih Jenis Produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Produk" className="text-xs">
                  Semua Produk
                </SelectItem>
                <SelectItem value="Laporan Intelijen" className="text-xs">
                  Laporan Intelijen
                </SelectItem>
                <SelectItem value="Laporan Informasi" className="text-xs">
                  Laporan Informasi
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-muted-foreground text-xs">
            {filteredReports.length} dari {reports.length} produk
          </span>
        </div>

        <div className="scrollbar-none mb-4 overflow-x-auto border-b">
          <div className="flex min-w-max shrink-0 flex-nowrap gap-6 whitespace-nowrap">
            {filterTabs.map((tab) => {
              const count =
                tab === "Semua"
                  ? reports.length
                  : reports.filter(
                      (report) => report.status === tab || (tab === "Arsip" && report.status === "Ditolak"),
                    ).length;
              return (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={cn(
                    "relative flex h-10 items-center gap-2 pb-2 font-bold text-muted-foreground text-xs transition-colors hover:text-white",
                    activeFilter === tab && "text-white",
                  )}
                >
                  {tab}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">{count}</span>
                  {activeFilter === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(520px,1.45fr)]">
          {/* Left Column: Daftar Produk */}
          <Card className="flex min-h-[650px] flex-col border-border/60 bg-card/45">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b bg-muted/10 px-4 py-3">
              <CardTitle className="font-bold text-sm text-white">Daftar Produk Intelijen</CardTitle>
              <Badge variant="outline" className="font-bold text-[10px]">
                {filteredReports.length} produk
              </Badge>
            </CardHeader>

            <CardContent className="max-h-[610px] flex-1 space-y-3 overflow-y-auto p-4 xl:max-h-none">
              {filteredReports.length ? (
                filteredReports.map((report) => {
                  const isSelected = selectedReport.id === report.id;
                  return (
                    <button
                      type="button"
                      key={report.id}
                      onClick={() => selectReport(report.id)}
                      className={cn(
                        "group relative flex w-full flex-col gap-2 rounded-lg border border-l-4 p-3 text-left transition-all duration-200 hover:shadow-sm",
                        report.status === "Draft" && "border-l-slate-500",
                        report.status === "Menunggu Persetujuan" && "border-l-amber-500",
                        report.status === "Disahkan" && "border-l-emerald-500",
                        report.status === "Dikembalikan" && "border-l-orange-500",
                        report.status === "Ditolak" && "border-l-red-500",
                        report.status === "Arsip" && "border-l-violet-500",
                        isSelected
                          ? "border-y-primary/40 border-r-primary/40 bg-muted/65 shadow"
                          : "border-y-border/40 border-r-border/40 bg-card/30 hover:bg-muted/20",
                      )}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <span className="font-bold font-mono text-[11px] text-sky-400">{report.id}</span>
                        {report.urgency === "Prioritas" && (
                          <span className="rounded border border-red-500/20 bg-red-500/10 px-1 py-0.5 font-bold text-[9px] text-red-500 uppercase tracking-wide">
                            Prioritas
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 font-bold text-white text-xs leading-normal transition-colors group-hover:text-primary">
                        {report.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{report.region}</span>
                        <span>•</span>
                        <span>{report.version}</span>
                        <span>•</span>
                        <span>{report.updatedAt.split(",")[0]}</span>
                      </div>
                      <div className="mt-2 flex w-full items-center justify-between border-border/20 border-t pt-2">
                        <Badge
                          variant="outline"
                          className={cn("h-5 py-0 font-bold text-[10px]", statusStyle[report.status])}
                        >
                          {report.status}
                        </Badge>
                        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <FileArchive className="mb-3 size-8 text-muted-foreground" />
                  <p className="font-medium text-sm">Produk tidak ditemukan</p>
                  <p className="mt-1 text-muted-foreground text-xs">Ubah kata pencarian atau filter status.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Detail View */}
          <Card className="flex min-w-0 flex-col border-border/60 bg-card">
            <div className="border-b p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("font-medium", statusStyle[selectedReport.status])}>
                      {selectedReport.status}
                    </Badge>
                    <Badge variant="outline" className="font-medium">
                      <ShieldCheck className="size-3" />
                      {selectedReport.classification}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{selectedReport.version}</span>
                  </div>
                  <h2 className="max-w-3xl font-semibold text-lg leading-6">{selectedReport.title}</h2>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {selectedReport.id} · {selectedReport.type} · {selectedReport.region}
                  </p>
                </div>
                <Button variant="outline" size="sm" title="Unduh laporan">
                  <Download />
                  Unduh
                </Button>
              </div>

              {selectedReport.status === "Draft" && (
                <div className="mt-4 flex items-center gap-3 rounded-md border border-slate-500/20 bg-slate-500/5 px-3 py-2.5">
                  <FileClock className="size-4 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="font-medium">Kelengkapan draft oleh OIM</span>
                      <span className="tabular-nums">{selectedReport.progress}%</span>
                    </div>
                    <Progress value={selectedReport.progress} className="mt-2 h-1.5" />
                  </div>
                </div>
              )}

              {selectedReport.reviewerNote && (
                <div className="mt-4 flex gap-3 rounded-md border border-orange-500/25 bg-orange-500/5 px-3 py-3">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-orange-600" />
                  <div>
                    <p className="font-semibold text-xs">Catatan keputusan terakhir</p>
                    <p className="mt-1 text-muted-foreground text-xs leading-5">{selectedReport.reviewerNote}</p>
                  </div>
                </div>
              )}
            </div>

            <Tabs value={detailTab} onValueChange={setDetailTab} className="gap-0">
              <div className="overflow-x-auto border-b px-4 sm:px-5">
                <TabsList variant="line" className="h-11 min-w-max gap-5 p-0">
                  <TabsTrigger value="ringkasan" className="px-0">
                    Ringkasan & Analisis
                  </TabsTrigger>
                  <TabsTrigger value="sumber" className="px-0">
                    Neraca & Sumber
                    <span className="rounded bg-muted px-1.5 text-[10px]">{selectedReport.sources.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="lampiran" className="px-0">
                    Lampiran
                    <span className="rounded bg-muted px-1.5 text-[10px]">{selectedReport.attachments.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="riwayat" className="px-0">
                    Riwayat & Distribusi
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="max-h-[550px] overflow-y-auto p-4 sm:p-5 xl:h-[550px]">
                <TabsContent value="ringkasan" className="m-0 space-y-6">
                  <section>
                    <SectionTitle title="Ringkasan eksekutif" />
                    <p className="text-foreground/85 text-sm leading-6">{selectedReport.executiveSummary}</p>
                  </section>
                  <Separator />
                  <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
                    <ReportSection title="Indikasi dan fakta" text={selectedReport.facts} />
                    <ReportSection title="Catatan analisis" text={selectedReport.analysis} />
                    <ReportSection title="Dampak" text={selectedReport.impact} />
                    <ReportSection title="Saran tindak" text={selectedReport.recommendation} />
                  </div>
                  <Separator />
                  <section>
                    <SectionTitle title="Keterlacakan direktif" />
                    <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Link2 className="mt-0.5 size-4 shrink-0 text-sky-600" />
                        <div>
                          <p className="font-medium text-sm">{selectedReport.uuk}</p>
                          <p className="mt-0.5 text-muted-foreground text-xs">
                            Kebutuhan informasi strategis terkait laporan
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Tertaut</Badge>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="sumber" className="m-0 space-y-5">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                      <SectionTitle title="Detail Neraca Penilaian" />
                      <p className="text-muted-foreground text-xs">
                        Kepercayaan sumber A-F dan kebenaran informasi 1-6 dari OIM.
                      </p>
                    </div>
                    <Badge variant="outline">
                      <ShieldCheck className="size-3" />
                      {selectedReport.sources.length} BAKET assessed
                    </Badge>
                  </div>

                  <div className="overflow-hidden rounded-md border">
                    {selectedReport.sources.map((source, index) => (
                      <div
                        key={source.id}
                        className={cn("grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_72px]", index > 0 && "border-t")}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sky-700 text-xs dark:text-sky-400">{source.id}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Sesuai clearance</span>
                          </div>
                          <p className="mt-1 font-medium text-sm">{source.title}</p>
                          <p className="mt-2 text-muted-foreground text-xs leading-5">{source.note}</p>
                        </div>
                        <div className="flex size-14 items-center justify-center self-center rounded-md border bg-muted/40 font-bold text-lg md:justify-self-end">
                          {source.assessment}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border-sky-500 border-l-2 pl-3">
                      <p className="font-semibold text-xs">Huruf A-F</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Tingkat kepercayaan terhadap sumber informasi.
                      </p>
                    </div>
                    <div className="border-emerald-500 border-l-2 pl-3">
                      <p className="font-semibold text-xs">Angka 1-6</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Tingkat kebenaran isi informasi yang dilaporkan.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="lampiran" className="m-0 space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <SectionTitle title="Lampiran pendukung" />
                      <p className="text-muted-foreground text-xs">
                        Bukti dan dokumen yang disertakan oleh penyusun laporan.
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">{selectedReport.attachments.length} berkas</span>
                  </div>
                  {selectedReport.attachments.length ? (
                    <div className="overflow-hidden rounded-md border">
                      {selectedReport.attachments.map((attachment, index) => (
                        <div
                          key={attachment.name}
                          className={cn("flex items-center gap-3 p-3", index > 0 && "border-t")}
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Paperclip className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">{attachment.name}</p>
                            <p className="mt-0.5 text-muted-foreground text-xs">
                              {attachment.type} · {attachment.size}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon-sm" title="Unduh lampiran">
                            <Download />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
                      <Paperclip className="mb-2 size-6 text-muted-foreground" />
                      <p className="font-medium text-sm">Belum ada lampiran</p>
                      <p className="mt-1 text-muted-foreground text-xs">Penyusun belum menambahkan berkas pendukung.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="riwayat" className="m-0 space-y-7">
                  <section>
                    <SectionTitle title="Riwayat versi" />
                    <div className="mt-4 space-y-0">
                      {selectedReport.versions.map((version, index) => (
                        <div key={`${version.version}-${version.date}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="mt-1.5 size-2.5 rounded-full border-2 border-background bg-sky-600 ring-1 ring-sky-600" />
                            {index < selectedReport.versions.length - 1 && (
                              <span className="min-h-14 w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="min-w-0 pb-5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold text-sm">{version.version}</span>
                              <span className="text-muted-foreground text-xs">{version.date}</span>
                            </div>
                            <p className="mt-1 font-medium text-xs">{version.actor}</p>
                            <p className="mt-1 text-muted-foreground text-xs leading-5">{version.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <Separator />

                  <div className="grid gap-6 lg:grid-cols-2">
                    <RecipientList
                      icon={Send}
                      title="Distribusi"
                      items={selectedReport.distribution}
                      empty="Belum didistribusikan"
                    />
                    <RecipientList
                      icon={Users}
                      title="Tembusan"
                      items={selectedReport.copies}
                      empty="Belum ada tembusan"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <footer className="border-t bg-muted/20 p-4 sm:p-5">
              {notice && (
                <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-emerald-700 text-xs dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {selectedReport.status === "Menunggu Persetujuan" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                        Catatan Internal Reviewer
                      </span>
                      {savedNote && (
                        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-bold text-[10px] text-emerald-400">
                          Tersimpan
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      placeholder="Tulis catatan internal atau evaluasi penting reviewer di sini tanpa mengubah status laporan..."
                      className="max-h-32 min-h-[85px] resize-y border-border/60 bg-background/50 text-xs focus:bg-background"
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 font-bold text-xs"
                        onClick={saveInternalNote}
                        disabled={!internalNote.trim()}
                      >
                        Simpan Catatan
                      </Button>
                    </div>
                  </div>
                  {savedNote && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-neutral-300 text-xs">
                      <span className="block font-semibold text-[10px] text-muted-foreground uppercase">
                        Draf Catatan Review:
                      </span>
                      <p className="mt-0.5">{savedNote}</p>
                    </div>
                  )}
                  <div className="flex flex-col justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center">
                    <p className="text-muted-foreground text-xs">Keputusan akan tercatat pada riwayat dan audit log.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => openDecision("reject")}>
                        <X />
                        Tolak
                      </Button>
                      <Button variant="outline" onClick={() => openDecision("return")}>
                        <RotateCcw />
                        Kembalikan
                      </Button>
                      <Button onClick={() => openDecision("approve")}>
                        <Check />
                        Setujui
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {selectedReport.status === "Disahkan" && (
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">Laporan telah disahkan</p>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        Tersedia untuk Executive dan penerima sesuai daftar distribusi.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={archiveReport}>
                    <Archive />
                    Arsipkan
                  </Button>
                </div>
              )}
              {selectedReport.status !== "Menunggu Persetujuan" && selectedReport.status !== "Disahkan" && (
                <div className="flex items-start gap-2">
                  <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{inactiveStatusMessage[selectedReport.status]}</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Aksi persetujuan tersedia setelah laporan diajukan kembali untuk review.
                    </p>
                  </div>
                </div>
              )}
            </footer>
          </Card>
        </div>
      </div>

      <DecisionDialog
        decision={decision}
        note={decisionNote}
        error={decisionError}
        report={selectedReport}
        onOpenChange={(open) => !open && setDecision(null)}
        onNoteChange={(value) => {
          setDecisionNote(value);
          setDecisionError("");
        }}
        onConfirm={confirmDecision}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
  active,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  helper: string;
  tone?: "default" | "amber" | "orange" | "emerald";
  active?: boolean;
  onClick?: () => void;
}) {
  const themeClass = {
    default: active
      ? "border-sky-500 bg-sky-500/[0.08] ring-1 ring-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.08)]"
      : "border-sky-500/30 bg-sky-500/[0.03] hover:border-sky-500/50 hover:bg-sky-500/[0.06] hover:shadow-[0_0_15px_rgba(14,165,233,0.05)]",
    amber: active
      ? "border-amber-500 bg-amber-500/[0.08] ring-1 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
      : "border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/50 hover:bg-amber-500/[0.06] hover:shadow-[0_0_15px_rgba(245,158,11,0.05)]",
    orange: active
      ? "border-orange-500 bg-orange-500/[0.08] ring-1 ring-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.08)]"
      : "border-orange-500/30 bg-orange-500/[0.03] hover:border-orange-500/50 hover:bg-orange-500/[0.06] hover:shadow-[0_0_15px_rgba(249,115,22,0.05)]",
    emerald: active
      ? "border-emerald-500 bg-emerald-500/[0.08] ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
      : "border-emerald-500/30 bg-emerald-500/[0.03] hover:border-emerald-500/50 hover:bg-emerald-500/[0.06] hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]",
  }[tone];

  const iconTone = {
    default: active
      ? "bg-sky-500/30 text-sky-300 border border-sky-500/40"
      : "bg-sky-500/20 text-sky-400 border border-sky-500/30",
    amber: active
      ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
      : "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    orange: active
      ? "bg-orange-500/30 text-orange-300 border border-orange-500/40"
      : "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    emerald: active
      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  }[tone];

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "group relative flex min-h-24 w-full cursor-pointer items-center justify-between gap-4 rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
        themeClass,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-bold font-mono text-3xl text-white tracking-tight">{value}</span>
        </div>
        <p className="font-medium text-muted-foreground text-xs leading-none">{helper}</p>
      </div>
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
          iconTone,
        )}
      >
        <Icon className="size-5.5" />
      </div>
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase">{title}</h3>;
}

function ReportSection({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <SectionTitle title={title} />
      <p className="text-foreground/85 text-sm leading-6">{text}</p>
    </section>
  );
}

function RecipientList({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: typeof Send;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {items.length ? (
        <div className="divide-y rounded-md border">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-2 px-3 py-2.5 text-sm">
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-4 text-muted-foreground text-xs">{empty}</p>
      )}
    </section>
  );
}

function DecisionDialog({
  decision,
  note,
  error,
  report,
  onOpenChange,
  onNoteChange,
  onConfirm,
}: {
  decision: Decision;
  note: string;
  error: string;
  report: Report;
  onOpenChange: (open: boolean) => void;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
}) {
  const content = {
    approve: {
      title: "Setujui laporan?",
      description: "Status berubah menjadi Disahkan dan laporan tersedia untuk Executive sesuai kewenangan.",
      label: "Catatan persetujuan (opsional)",
      action: "Setujui Laporan",
      icon: CheckCircle2,
      buttonVariant: "default" as const,
    },
    return: {
      title: "Kembalikan untuk perbaikan?",
      description: "OIM akan menerima laporan beserta catatan revisi yang Anda berikan.",
      label: "Catatan revisi",
      action: "Kembalikan ke OIM",
      icon: RotateCcw,
      buttonVariant: "default" as const,
    },
    reject: {
      title: "Tolak laporan?",
      description: "Laporan akan ditutup sebagai Ditolak dan hanya dapat dilanjutkan melalui versi baru.",
      label: "Alasan penolakan",
      action: "Tolak Laporan",
      icon: CircleAlert,
      buttonVariant: "destructive" as const,
    },
  };

  const current = decision ? content[decision] : null;
  const Icon = current?.icon ?? CheckCircle2;

  return (
    <Dialog open={Boolean(decision)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {current && (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-muted">
                <Icon className="size-5" />
              </div>
              <DialogTitle>{current.title}</DialogTitle>
              <DialogDescription>{current.description}</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="font-semibold text-sky-700 text-xs dark:text-sky-400">{report.id}</p>
              <p className="mt-1 line-clamp-2 font-medium text-sm">{report.title}</p>
            </div>
            <div>
              <label htmlFor="decision-note" className="mb-2 block font-medium text-sm">
                {current.label}
                {decision !== "approve" && <span className="ml-1 text-red-500">*</span>}
              </label>
              <Textarea
                id="decision-note"
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder={
                  decision === "approve"
                    ? "Tambahkan catatan bila diperlukan..."
                    : "Tuliskan catatan yang jelas dan dapat ditindaklanjuti..."
                }
                className="min-h-24"
              />
              {error && <p className="mt-2 text-red-600 text-xs">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button variant={current.buttonVariant} onClick={onConfirm}>
                <Icon />
                {current.action}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
