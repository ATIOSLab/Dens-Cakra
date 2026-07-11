"use client";

import { type ComponentType, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Filter,
  MapPin,
  MessageSquareText,
  Search,
  ShieldQuestion,
  Sparkles,
  User,
  UserRoundCheck,
  Video,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldAnswerStatus = "Baru" | "Diproses" | "Perlu Pengembangan" | "Terverifikasi" | "Ditolak";

type FieldAnswerSource = "Aplikasi" | "WA Center" | "Laporan Cepat";

type FieldAnswer = {
  id: string;
  title: string;
  source: FieldAnswerSource;
  status: FieldAnswerStatus;
  completeness: number;
  verification: string;
  evidence: {
    photos: number;
    videos: number;
    documents: number;
    gps: boolean;
  };
  sourceCode: string;
  uukPir: string;
  location: string;
  submittedBy: string;
  submittedAt: string;
  aiSummary: string;
  developmentNote: string;
  lastActivity: string[];
};

const initialAnswers: FieldAnswer[] = [
  {
    id: "JL-2026-001",
    title: "Kepadatan massa sekitar kantor penyelenggara daerah",
    source: "Aplikasi",
    status: "Baru",
    completeness: 86,
    verification: "Menunggu telaah awal regional",
    evidence: { photos: 4, videos: 1, documents: 1, gps: true },
    sourceCode: "SRC-A17",
    uukPir: "UUK-02 / PIR-03",
    location: "Kota Bandung, Jawa Barat",
    submittedBy: "Korwil Tengah",
    submittedAt: "11 Jul 2026, 09:35",
    aiSummary:
      "Jawaban memuat waktu, lokasi, aktor, estimasi massa, dan bukti visual. Perlu penajaman pada indikasi penggerak dan dampak terhadap agenda daerah.",
    developmentNote: "Minta pemetaan aktor lapangan dan jalur mobilisasi.",
    lastActivity: [
      "Baket dikirim dari aplikasi oleh petugas lapangan.",
      "Lampiran foto dan GPS tervalidasi.",
      "Menunggu keputusan tindak lanjut regional.",
    ],
  },
  {
    id: "JL-2026-002",
    title: "Informasi jaring terkait distribusi logistik tidak resmi",
    source: "WA Center",
    status: "Diproses",
    completeness: 72,
    verification: "Incoming information sudah dikonversi menjadi BAKET oleh Field Officer",
    evidence: { photos: 2, videos: 0, documents: 2, gps: true },
    sourceCode: "JRG-M29",
    uukPir: "UUK-04 / PIR-01",
    location: "Kabupaten Bekasi, Jawa Barat",
    submittedBy: "Korwil Barat",
    submittedAt: "11 Jul 2026, 08:20",
    aiSummary:
      "Informasi menunjukkan pola distribusi yang berulang. Bukti dokumen tersedia, tetapi kronologi dan pembanding lapangan masih perlu dipertegas.",
    developmentNote: "Lengkapi kronologi per titik dan validasi ulang sumber pembanding.",
    lastActivity: [
      "WA Center menerima incoming information dari jaring.",
      "Field Officer memvalidasi dan membuat BAKET.",
      "OIM sedang menelaah kelengkapan awal.",
    ],
  },
  {
    id: "JL-2026-003",
    title: "Perubahan rute pergerakan kelompok prioritas",
    source: "Aplikasi",
    status: "Perlu Pengembangan",
    completeness: 58,
    verification: "Kelengkapan bukti terbatas",
    evidence: { photos: 1, videos: 0, documents: 0, gps: true },
    sourceCode: "SRC-C08",
    uukPir: "UUK-01 / PIR-05",
    location: "Tasikmalaya, Jawa Barat",
    submittedBy: "Korwil Selatan",
    submittedAt: "10 Jul 2026, 21:10",
    aiSummary:
      "Jawaban menjawab unsur lokasi dan waktu, namun belum cukup kuat untuk analisis karena aktor, motif, dan bukti pendukung masih lemah.",
    developmentNote: "Minta foto tambahan, identifikasi aktor, dan validasi rute alternatif.",
    lastActivity: [
      "OIM meminta pengembangan bukti.",
      "Regional memberi catatan penguatan sasaran.",
      "Petugas lapangan menunggu instruksi lanjutan.",
    ],
  },
  {
    id: "JL-2026-004",
    title: "Konfirmasi isu hoaks pengamanan objek vital",
    source: "WA Center",
    status: "Terverifikasi",
    completeness: 94,
    verification: "Terverifikasi oleh OIM",
    evidence: { photos: 3, videos: 1, documents: 3, gps: true },
    sourceCode: "JRG-H44",
    uukPir: "UUK-03 / PIR-02",
    location: "Kota Cirebon, Jawa Barat",
    submittedBy: "Korwil Timur",
    submittedAt: "10 Jul 2026, 18:45",
    aiSummary:
      "Jawaban lengkap dan konsisten dengan bukti. Informasi layak menjadi sumber kompilasi draft laporan intelijen.",
    developmentNote: "Siap masuk kompilasi OIM.",
    lastActivity: [
      "Incoming information divalidasi Field Officer.",
      "BAKET diverifikasi oleh OIM.",
      "Siap digunakan sebagai sumber draft report.",
    ],
  },
  {
    id: "JL-2026-005",
    title: "Klaim gangguan komunikasi wilayah pesisir",
    source: "Aplikasi",
    status: "Ditolak",
    completeness: 41,
    verification: "Tidak relevan dengan UUK/PIR aktif",
    evidence: { photos: 0, videos: 0, documents: 1, gps: false },
    sourceCode: "SRC-R12",
    uukPir: "Tidak tertaut",
    location: "Pesisir Utara Jawa Barat",
    submittedBy: "Korwil Utara",
    submittedAt: "10 Jul 2026, 14:00",
    aiSummary:
      "Jawaban tidak memiliki keterkaitan memadai dengan kebutuhan intelijen aktif dan tidak menyertakan titik GPS pendukung.",
    developmentNote: "Ditutup sebagai tidak relevan. Simpan jejak audit.",
    lastActivity: [
      "Kelengkapan tidak memenuhi standar.",
      "Hubungan ke UUK/PIR tidak ditemukan.",
      "Ditolak dengan alasan relevansi.",
    ],
  },
  {
    id: "JL-2026-006",
    title: "Deteksi dini pergerakan logistik mencurigakan perbatasan",
    source: "Laporan Cepat",
    status: "Baru",
    completeness: 90,
    verification: "Menunggu verifikasi darurat regional",
    evidence: { photos: 5, videos: 2, documents: 1, gps: true },
    sourceCode: "LPC-X02",
    uukPir: "UUK-01 / PIR-02",
    location: "Sebatik Barat, Kalimantan Utara",
    submittedBy: "Korwil Utara",
    submittedAt: "11 Jul 2026, 11:20",
    aiSummary:
      "Laporan cepat dari pos perbatasan terindikasi memuat bukti visual pergerakan logistik tanpa manifes. Sangat direkomendasikan eskalasi segera.",
    developmentNote: "Validasi nomor registrasi kendaraan pada manifes siber.",
    lastActivity: ["Laporan Cepat diterima melalui jalur komunikasi satelit.", "Validasi GPS berhasil diselesaikan."],
  },
  {
    id: "JL-2026-007",
    title: "Laporan flash intelijen aksi demonstrasi daerah industri",
    source: "Laporan Cepat",
    status: "Diproses",
    completeness: 65,
    verification: "Diteruskan ke tim analis regional",
    evidence: { photos: 2, videos: 1, documents: 0, gps: true },
    sourceCode: "LPC-Y09",
    uukPir: "UUK-03 / PIR-04",
    location: "Karawang, Jawa Barat",
    submittedBy: "Korwil Barat",
    submittedAt: "11 Jul 2026, 09:10",
    aiSummary:
      "Informasi awal unjuk rasa buruh terkait penyesuaian UMR. Bukti video menunjukkan eskalasi massa sedang, namun koordinasi aparat masih kondusif.",
    developmentNote: "Pantau potensi mobilisasi massa tambahan dari luar kota.",
    lastActivity: ["Laporan cepat masuk sistem.", "Analis regional mulai memproses telaah awal."],
  },
];

const statusOptions: Array<FieldAnswerStatus | "Semua"> = [
  "Semua",
  "Baru",
  "Diproses",
  "Perlu Pengembangan",
  "Terverifikasi",
  "Ditolak",
];

const sourceOptions: Array<FieldAnswerSource | "Semua Sumber"> = [
  "Semua Sumber",
  "Aplikasi",
  "WA Center",
  "Laporan Cepat",
];

const statusTone: Record<FieldAnswerStatus, string> = {
  Baru: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  Diproses: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "Perlu Pengembangan": "border-orange-500/30 bg-orange-500/10 text-orange-400",
  Terverifikasi: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Ditolak: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

const statusIcon: Record<FieldAnswerStatus, ComponentType<{ className?: string }>> = {
  Baru: MessageSquareText,
  Diproses: ClipboardCheck,
  "Perlu Pengembangan": ShieldQuestion,
  Terverifikasi: CheckCircle2,
  Ditolak: XCircle,
};

const borderAccentColors: Record<FieldAnswerStatus, string> = {
  Baru: "border-l-sky-500",
  Diproses: "border-l-amber-500",
  "Perlu Pengembangan": "border-l-orange-500",
  Terverifikasi: "border-l-emerald-500",
  Ditolak: "border-l-rose-500",
};

function StatusBadge({ status }: { status: FieldAnswerStatus }) {
  const Icon = statusIcon[status];

  return (
    <Badge className={cn("gap-1 border font-bold text-[10px]", statusTone[status])} variant="outline">
      <Icon className="size-3" />
      {status}
    </Badge>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  active,
  onClick,
  themeClass,
  iconTheme,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
  themeClass: string;
  iconTheme: string;
}) {
  return (
    <button
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
        themeClass,
        active ? "ring-1 ring-primary/30" : "border-border/50 bg-card/40",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full items-start justify-between">
        <div className="space-y-1">
          <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="font-bold font-mono text-3xl text-white tracking-tight">{value}</p>
        </div>
        <div className={cn("rounded-lg border p-2.5 transition-all duration-300", iconTheme)}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 font-medium text-muted-foreground text-xs leading-none">{helper}</p>
    </button>
  );
}

function EvidenceBadge({
  icon: Icon,
  label,
  theme,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  theme?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border bg-muted/20 px-2 py-1 font-semibold text-[11px] text-neutral-300",
        theme,
      )}
    >
      <Icon className="size-3 text-muted-foreground" />
      {label}
    </span>
  );
}

export function JawabanLapanganPage() {
  const [answers, setAnswers] = useState<FieldAnswer[]>(initialAnswers);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<(typeof statusOptions)[number]>("Semua");
  const [source, setSource] = useState<(typeof sourceOptions)[number]>("Semua Sumber");
  const [selectedId, setSelectedId] = useState(initialAnswers[0].id);
  const [noteInput, setNoteInput] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  const filteredAnswers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return answers.filter((answer) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [answer.id, answer.title, answer.sourceCode, answer.uukPir, answer.location]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = activeStatus === "Semua" || answer.status === activeStatus;
      const matchesSource = source === "Semua Sumber" || answer.source === source;

      return matchesQuery && matchesStatus && matchesSource;
    });
  }, [activeStatus, answers, query, source]);

  const selectedAnswer = answers.find((answer) => answer.id === selectedId) ?? filteredAnswers[0] ?? answers[0];

  const metrics = useMemo(() => {
    const completeCount = answers.filter((answer) => answer.completeness >= 80).length;
    const developmentCount = answers.filter((answer) => answer.status === "Perlu Pengembangan").length;
    const verifiedCount = answers.filter((answer) => answer.status === "Terverifikasi").length;
    const incomingCount = answers.filter((answer) => answer.source !== "Aplikasi").length;

    return { completeCount, developmentCount, verifiedCount, incomingCount };
  }, [answers]);

  function selectAnswer(answerId: string) {
    setSelectedId(answerId);
    setNoteInput("");
    setRejectReason("");
    setSystemMessage(null);
  }

  function updateSelectedAnswer(updates: Partial<FieldAnswer>, activity: string, message: string) {
    setAnswers((current) =>
      current.map((answer) =>
        answer.id === selectedAnswer.id
          ? {
              ...answer,
              ...updates,
              lastActivity: [activity, ...answer.lastActivity],
            }
          : answer,
      ),
    );
    setSystemMessage(message);
  }

  function handleAddDevelopmentNote() {
    if (!noteInput.trim()) {
      setSystemMessage("Catatan pengembangan wajib diisi sebelum dikirim.");
      return;
    }

    updateSelectedAnswer(
      {
        status: "Perlu Pengembangan",
        developmentNote: noteInput.trim(),
        verification: "Perlu pengembangan tambahan dari lapangan",
      },
      `Catatan pengembangan ditambahkan: ${noteInput.trim()}`,
      `Catatan pengembangan untuk ${selectedAnswer.id} berhasil disimpan.`,
    );
    setActiveStatus("Perlu Pengembangan");
    setNoteInput("");
  }

  // Eskalasi ke Manajer Intelijen Operasional (OIM)
  function handleEscalateToOim() {
    updateSelectedAnswer(
      {
        status: "Diproses",
        verification: "Dieskalasikan ke Manajer Intelijen Operasional (OIM)",
      },
      "Eskalasi ke Manajer Intelijen Operasional dikirim dari Komandan Regional.",
      `${selectedAnswer.id} sudah dieskalasikan ke OIM untuk verifikasi lanjutan.`,
    );
    setActiveStatus("Diproses");
  }

  function handleVerify() {
    updateSelectedAnswer(
      {
        status: "Terverifikasi",
        verification: "Terverifikasi untuk kompilasi laporan intelijen",
      },
      "Jawaban ditandai terverifikasi pada workspace regional.",
      `${selectedAnswer.id} ditandai terverifikasi.`,
    );
    setActiveStatus("Terverifikasi");
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      setSystemMessage("Alasan penolakan wajib diisi agar keputusan dapat diaudit.");
      return;
    }

    updateSelectedAnswer(
      {
        status: "Ditolak",
        verification: "Ditolak pada telaah regional",
        developmentNote: rejectReason.trim(),
      },
      `Jawaban ditolak: ${rejectReason.trim()}`,
      `${selectedAnswer.id} ditolak dan alasan tersimpan.`,
    );
    setActiveStatus("Ditolak");
    setRejectReason("");
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Komandan Regional</Badge>
            <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" variant="outline">
              Review Jawaban Lapangan (BAKET)
            </Badge>
          </div>
          <h1 className="mt-1.5 font-bold text-2xl tracking-tight">Jawaban Lapangan</h1>
          <p className="mt-1 max-w-4xl text-muted-foreground text-sm">
            Tinjau seluruh jawaban lapangan (BAKET) dari Aplikasi, WA Center, dan Laporan Cepat. Validasi kelengkapan
            bukti, tautan UUK/PIR, serta lakukan tindak verifikasi, eskalasi ke OIM, atau minta pengembangan.
          </p>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          active={activeStatus === "Semua"}
          helper="Total arsip masuk wilayah"
          icon={MessageSquareText}
          label="Total Jawaban"
          onClick={() => setActiveStatus("Semua")}
          value={String(answers.length)}
          themeClass={
            activeStatus === "Semua"
              ? "border-sky-500/50 bg-sky-500/[0.04] ring-1 ring-sky-500/20"
              : "hover:border-sky-500/30 hover:bg-sky-500/[0.02] border-border/50 bg-card/40"
          }
          iconTheme={
            activeStatus === "Semua"
              ? "bg-sky-500/20 border-sky-500/30 text-sky-400"
              : "bg-muted/40 border-border/50 text-muted-foreground group-hover:bg-sky-500/10 group-hover:text-sky-400 group-hover:border-sky-500/20"
          }
        />
        <MetricCard
          active={activeStatus === "Perlu Pengembangan"}
          helper="Menunggu tindak lapangan"
          icon={AlertTriangle}
          label="Perlu Pengembangan"
          onClick={() => setActiveStatus("Perlu Pengembangan")}
          value={String(metrics.developmentCount)}
          themeClass={
            activeStatus === "Perlu Pengembangan"
              ? "border-orange-500/50 bg-orange-500/[0.04] ring-1 ring-orange-500/20"
              : "hover:border-orange-500/30 hover:bg-orange-500/[0.02] border-border/50 bg-card/40"
          }
          iconTheme={
            activeStatus === "Perlu Pengembangan"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
              : "bg-muted/40 border-border/50 text-muted-foreground group-hover:bg-orange-500/10 group-hover:text-orange-400 group-hover:border-orange-500/20"
          }
        />
        <MetricCard
          active={activeStatus === "Terverifikasi"}
          helper={`${metrics.completeCount} lengkap (>= 80%)`}
          icon={BadgeCheck}
          label="Terverifikasi"
          onClick={() => setActiveStatus("Terverifikasi")}
          value={String(metrics.verifiedCount)}
          themeClass={
            activeStatus === "Terverifikasi"
              ? "border-emerald-500/50 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20"
              : "hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] border-border/50 bg-card/40"
          }
          iconTheme={
            activeStatus === "Terverifikasi"
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              : "bg-muted/40 border-border/50 text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:border-emerald-500/20"
          }
        />
        <MetricCard
          active={source === "WA Center" || source === "Laporan Cepat"}
          helper="WA Center & Laporan Cepat"
          icon={UserRoundCheck}
          label="Jalur Non-Aplikasi"
          onClick={() => setSource(source === "WA Center" ? "Semua Sumber" : "WA Center")}
          value={String(metrics.incomingCount)}
          themeClass={
            source === "WA Center" || source === "Laporan Cepat"
              ? "border-violet-500/50 bg-violet-500/[0.04] ring-1 ring-violet-500/20"
              : "hover:border-violet-500/30 hover:bg-violet-500/[0.02] border-border/50 bg-card/40"
          }
          iconTheme={
            source === "WA Center" || source === "Laporan Cepat"
              ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
              : "bg-muted/40 border-border/50 text-muted-foreground group-hover:bg-violet-500/10 group-hover:text-violet-400 group-hover:border-violet-500/20"
          }
        />
      </div>

      {/* Main Workspace Layout */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* Left Column: Inbox List */}
        <Card className="flex min-w-0 flex-col border-border/60">
          <CardHeader className="gap-3.5 border-b bg-muted/10">
            {/* Row 1: Title and Description */}
            <div className="space-y-0.5">
              <CardTitle className="font-bold text-base text-white">Inbox Jawaban Lapangan</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Saring status tab di bawah untuk melihat entri.
              </CardDescription>
            </div>

            {/* Row 2: Tabs Selection (Horizontal scrolling scrollbar-none to prevent wrapping on sidebar toggle) */}
            <Tabs
              onValueChange={(value) => setActiveStatus(value as (typeof statusOptions)[number])}
              value={activeStatus}
              className="w-full"
            >
              <TabsList className="scrollbar-none flex h-9 w-full shrink-0 flex-nowrap justify-start overflow-x-auto whitespace-nowrap rounded-lg bg-muted/20 p-1">
                {statusOptions.map((status) => (
                  <TabsTrigger
                    className="shrink-0 whitespace-nowrap px-3 py-1 font-bold text-xs"
                    key={status}
                    value={status}
                  >
                    {status === "Perlu Pengembangan" ? "Kembangkan" : status}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Row 3: Search and Filter Inputs */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative min-w-0 flex-1">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 border-border/60 bg-background/50 pl-8 text-xs focus:bg-background"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari ID, UUK/PIR, lokasi..."
                  value={query}
                />
              </div>
              {/* Source Filter */}
              <Select onValueChange={(value) => setSource(value as (typeof sourceOptions)[number])} value={source}>
                <SelectTrigger className="h-8 w-full border-border/60 bg-background/50 text-xs sm:w-44">
                  <Filter className="mr-1.5 size-3 text-muted-foreground" />
                  <SelectValue placeholder="Pilih Sumber" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 pt-4">
            <div className="grid gap-3">
              {filteredAnswers.length > 0 ? (
                filteredAnswers.map((answer) => {
                  const isSelected = selectedAnswer.id === answer.id;
                  return (
                    <button
                      className={cn(
                        "group rounded-lg border border-l-4 p-4 text-left transition-all duration-200",
                        borderAccentColors[answer.status],
                        isSelected
                          ? "border-y-primary/40 border-r-primary/40 bg-muted/65 shadow-md"
                          : "border-y-border/40 border-r-border/40 bg-card hover:bg-muted/20 hover:shadow",
                      )}
                      key={answer.id}
                      onClick={() => selectAnswer(answer.id)}
                      type="button"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold font-mono text-[11px] text-primary uppercase tracking-wider">
                              {answer.id}
                            </span>

                            {/* Source Pills with Icons */}
                            <Badge
                              variant="outline"
                              className={cn(
                                "flex h-5 items-center gap-1 py-0 font-bold text-[10px]",
                                answer.source === "Aplikasi" && "border-sky-500/20 bg-sky-500/10 text-sky-400",
                                answer.source === "WA Center" &&
                                  "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                                answer.source === "Laporan Cepat" && "border-rose-500/20 bg-rose-500/10 text-rose-400",
                              )}
                            >
                              {answer.source === "WA Center" && <MessageSquareText className="size-2.5" />}
                              {answer.source === "Aplikasi" && <Camera className="size-2.5" />}
                              {answer.source === "Laporan Cepat" && <Zap className="size-2.5" />}
                              {answer.source}
                            </Badge>

                            <StatusBadge status={answer.status} />
                          </div>

                          <p className="pt-1 font-bold text-neutral-200 text-sm leading-snug transition-colors group-hover:text-white">
                            {answer.title}
                          </p>

                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <span>{answer.uukPir}</span>
                            <span>•</span>
                            <span className="truncate">{answer.location}</span>
                          </div>
                        </div>

                        {/* Progress display */}
                        <div className="w-full min-w-32 space-y-1 sm:w-36">
                          <div className="flex items-center justify-between font-semibold text-[11px]">
                            <span className="text-muted-foreground">Kelengkapan</span>
                            <span className="text-neutral-200">{answer.completeness}%</span>
                          </div>
                          <Progress className="h-1.5" value={answer.completeness} />
                        </div>
                      </div>

                      {/* Evidence Pill Icons */}
                      <div className="mt-3.5 flex flex-wrap gap-1.5 border-border/20 border-t pt-2.5">
                        {answer.evidence.photos > 0 && (
                          <EvidenceBadge icon={Camera} label={`${answer.evidence.photos} Foto`} />
                        )}
                        {answer.evidence.videos > 0 && (
                          <EvidenceBadge icon={Video} label={`${answer.evidence.videos} Video`} />
                        )}
                        {answer.evidence.documents > 0 && (
                          <EvidenceBadge icon={FileText} label={`${answer.evidence.documents} Dok`} />
                        )}
                        <EvidenceBadge
                          icon={MapPin}
                          label={answer.evidence.gps ? "GPS Terverifikasi" : "GPS Tidak Ada"}
                          theme={
                            answer.evidence.gps
                              ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                              : "text-rose-400 border-rose-500/20 bg-rose-500/5"
                          }
                        />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="font-semibold text-sm">Tidak ada jawaban pada filter ini.</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Ubah tab status, filter sumber, atau kata kunci pencarian.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Detail Workstation Panel */}
        <Card className="h-fit border-border/60 bg-card/85 xl:sticky xl:top-4">
          <CardHeader className="gap-3 border-b bg-muted/10">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold font-mono text-[10px] text-sky-400 uppercase tracking-wider">
                  Lembar Kerja
                </span>
                <CardTitle className="font-bold text-base text-white">{selectedAnswer.id}</CardTitle>
              </div>
              <StatusBadge status={selectedAnswer.status} />
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Title & Sub */}
            <div>
              <h2 className="font-bold text-neutral-100 text-sm leading-snug">{selectedAnswer.title}</h2>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-neutral-300">{selectedAnswer.submittedBy}</span>
                <span>•</span>
                <span>{selectedAnswer.submittedAt}</span>
              </div>
            </div>

            {/* Glowing AI Summary Box */}
            <div className="space-y-1.5 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="size-3.5" />
                <p className="font-bold text-xs uppercase tracking-wider">Ringkasan AI Taktis</p>
              </div>
              <p className="text-neutral-300 text-xs leading-relaxed">{selectedAnswer.aiSummary}</p>
            </div>

            {/* Completeness Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-semibold text-xs">
                <span className="text-muted-foreground">Kualitas Kelengkapan BAKET</span>
                <span className="text-neutral-200">{selectedAnswer.completeness}%</span>
              </div>
              <Progress className="h-1.5" value={selectedAnswer.completeness} />
            </div>

            {/* Segmented Information Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1 rounded-lg border border-border/40 bg-muted/10 p-2.5">
                <span className="flex items-center gap-1 font-semibold text-[10px] text-muted-foreground uppercase">
                  <User className="size-3" /> Kode Sumber
                </span>
                <span className="block truncate font-bold font-mono text-neutral-200">{selectedAnswer.sourceCode}</span>
              </div>
              <div className="space-y-1 rounded-lg border border-border/40 bg-muted/10 p-2.5">
                <span className="flex items-center gap-1 font-semibold text-[10px] text-muted-foreground uppercase">
                  <Building2 className="size-3" /> Relasi UUK/PIR
                </span>
                <span className="block truncate font-bold text-neutral-200">{selectedAnswer.uukPir}</span>
              </div>
              <div className="col-span-2 space-y-1 rounded-lg border border-border/40 bg-muted/10 p-2.5">
                <span className="flex items-center gap-1 font-semibold text-[10px] text-muted-foreground uppercase">
                  <MapPin className="size-3" /> Lokasi Sasaran
                </span>
                <span className="block truncate font-medium text-neutral-200">{selectedAnswer.location}</span>
              </div>
            </div>

            {/* Evidence Badges Grid */}
            <div className="space-y-1.5">
              <span className="block font-semibold text-[10px] text-muted-foreground uppercase">
                Berkas Lampiran Bukti
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <EvidenceBadge icon={Camera} label={`${selectedAnswer.evidence.photos} Foto Valid`} />
                <EvidenceBadge icon={Video} label={`${selectedAnswer.evidence.videos} Rekaman Video`} />
                <EvidenceBadge icon={FileText} label={`${selectedAnswer.evidence.documents} Dokumen`} />
                <EvidenceBadge
                  icon={MapPin}
                  label={selectedAnswer.evidence.gps ? "GPS Terintegrasi" : "GPS Belum Ada"}
                  theme={
                    selectedAnswer.evidence.gps
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                      : "text-rose-400 border-rose-500/20 bg-rose-500/5"
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Tabbed Action Center (VERIFY, DEVELOP, REJECT) */}
            <div className="space-y-2">
              <span className="block font-semibold text-[10px] text-muted-foreground uppercase">
                Tindakan Komandan Regional
              </span>

              <Tabs defaultValue="verify" className="w-full">
                <TabsList className="grid h-8 w-full grid-cols-3 rounded-md bg-muted/30 p-0.5">
                  <TabsTrigger value="verify" className="py-1 font-bold text-[10px]">
                    Verifikasi
                  </TabsTrigger>
                  <TabsTrigger value="develop" className="py-1 font-bold text-[10px]">
                    Kembangkan
                  </TabsTrigger>
                  <TabsTrigger value="reject" className="py-1 font-bold text-[10px]">
                    Tolak
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Verifikasi & Eskalasi */}
                <TabsContent value="verify" className="space-y-3 pt-2">
                  <div className="space-y-2.5 rounded-lg border border-border/40 bg-muted/10 p-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Komandan dapat menandai BAKET sebagai terverifikasi atau langsung meneruskan laporan ini
                      (eskalasi) ke Manajer Intelijen Operasional (OIM) untuk kompilasi.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleVerify}
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 border-emerald-500/30 font-bold text-emerald-400 text-xs hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="size-3.5" /> Verifikasi
                      </Button>
                      <Button
                        onClick={handleEscalateToOim}
                        size="sm"
                        className="h-8 gap-1 bg-sky-600 font-bold text-xs hover:bg-sky-500"
                      >
                        <ArrowUpRight className="size-3.5" /> Eskalasi OIM
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Catatan Pengembangan */}
                <TabsContent value="develop" className="space-y-2.5 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between font-medium text-[11px] text-muted-foreground">
                      <span>Catatan saat ini:</span>
                      <span className="max-w-44 truncate font-bold text-neutral-300">
                        {selectedAnswer.developmentNote || "-"}
                      </span>
                    </div>
                    <Textarea
                      className="max-h-24 min-h-16 resize-none border-border/60 bg-background/50 text-xs focus:bg-background"
                      onChange={(event) => setNoteInput(event.target.value)}
                      placeholder="Masukkan poin/unsur yang harus dilengkapi oleh Field Officer..."
                      value={noteInput}
                    />
                    <Button
                      className="h-8 w-full gap-1.5 font-bold text-xs"
                      onClick={handleAddDevelopmentNote}
                      variant="outline"
                    >
                      <ShieldQuestion className="size-3.5" /> Kirim Instruksi Lapangan
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Tolak Laporan */}
                <TabsContent value="reject" className="space-y-2.5 pt-2">
                  <div className="space-y-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                    <span className="block font-bold text-[11px] text-rose-400">Batalkan / Tolak BAKET</span>
                    <Textarea
                      className="max-h-24 min-h-16 resize-none border-rose-500/20 bg-background text-xs focus:border-rose-500/40"
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Alasan penolakan wajib diisi untuk rekam audit..."
                      value={rejectReason}
                    />
                    <Button
                      className="h-8 w-full gap-1.5 font-bold text-xs"
                      onClick={handleReject}
                      variant="destructive"
                    >
                      <XCircle className="size-3.5" /> Tolak dengan Alasan
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {systemMessage && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 font-medium text-primary text-xs">
                {systemMessage}
              </p>
            )}

            <Separator />

            {/* Activity History Logs */}
            <div className="space-y-2">
              <span className="block flex items-center gap-1.5 font-semibold text-[10px] text-muted-foreground uppercase">
                <Calendar className="size-3" /> Jejak Audit & Aktivitas
              </span>
              <div className="space-y-2 pr-1">
                {selectedAnswer.lastActivity.map((activity, index) => (
                  <div className="rounded border border-border/40 bg-muted/10 p-2 text-xs" key={activity}>
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span className="font-bold">Langkah {selectedAnswer.lastActivity.length - index}</span>
                      <span>System Log</span>
                    </div>
                    <p className="mt-0.5 font-medium text-neutral-300 leading-relaxed">{activity}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
