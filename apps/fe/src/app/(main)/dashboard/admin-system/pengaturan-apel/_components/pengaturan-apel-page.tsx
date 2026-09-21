"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  Bot,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  MessageSquare,
  Play,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Timer,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type {
  ApelBroadcastArea,
  ApelBroadcastGaswil,
  ApelBroadcastJaring,
  ApelBroadcastTargetsResponse,
  ApelConfigItem,
  ApelSessionItem,
} from "@/server/apel-repository";
import type { WhatsappControlChannel } from "@/server/field-ops/types";

const DEFAULT_ATTENDANCE_REPLY_TEMPLATE = `*Call Center Merah Putih membalas:*

_"Terima kasih Bapak/Ibu. Respon kehadiran sudah kami perbarui. Selamat bertugas kembali dan salam untuk keluarga"_`;

export function PengaturanApelPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blasting, setBlasting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  const [configs, setConfigs] = useState<ApelConfigItem[]>([]);
  const [channels, setChannels] = useState<WhatsappControlChannel[]>([]);
  const [sessions, setSessions] = useState<ApelSessionItem[]>([]);
  const [targets, setTargets] = useState<ApelBroadcastTargetsResponse>({
    areas: [],
    gaswils: [],
    jarings: [],
  });

  // Selected config for editing / active form
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("Apel Pagi Nasional Jaring");
  const [description, setDescription] = useState("Penyiaran absensi apel rutin untuk seluruh jaring terverifikasi");

  // Sasaran Broadcast
  const [targetType, setTargetType] = useState<"ALL" | "AREA" | "GASWIL" | "JARING">("ALL");
  const [areaId, setAreaId] = useState<string>("");
  const [targetGaswilIds, setTargetGaswilIds] = useState<string[]>([]);
  const [targetJaringIds, setTargetJaringIds] = useState<string[]>([]);
  const [searchGaswil, setSearchGaswil] = useState("");
  const [searchJaring, setSearchJaring] = useState("");

  const [channelSelectionMode, setChannelSelectionMode] = useState<"MANUAL" | "LOAD_BALANCE">("LOAD_BALANCE");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [messageTemplate, setMessageTemplate] = useState(
    `{Selamat pagi|Salam hormat|Selamat bertugas}, Rekan {{nama_jaring}}.\n\nMohon konfirmasi kehadiran untuk *Apel Pagi {{wilayah}}* pada hari {{tanggal}}.\nBatas waktu absensi: *{{deadline}}*.\n\n⚠️ *KETENTUAN ABSENSI:*\nUntuk mencatat kehadiran, Anda WAJIB membalas dengan mengetik *HADIR* dan mengirimkan *Titik Koordinat Lokasi Terkini* melalui menu lampiran WhatsApp (Share Location).\n*(Catatan: Kehadiran tidak akan tercatat tanpa pengiriman titik lokasi).*`,
  );
  const [attendanceReplyTemplate, setAttendanceReplyTemplate] = useState(DEFAULT_ATTENDANCE_REPLY_TEMPLATE);
  const [scheduleTime, setScheduleTime] = useState("07:00");
  const [deadlineTime, setDeadlineTime] = useState("08:30");
  const [deadlineMinutes, setDeadlineMinutes] = useState(90);
  const [requireLocation, setRequireLocation] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Anti-Ban parameters
  const [minDelaySeconds, setMinDelaySeconds] = useState(8);
  const [maxDelaySeconds, setMaxDelaySeconds] = useState(20);
  const [batchSize, setBatchSize] = useState(5);
  const [batchPauseSeconds, setBatchPauseSeconds] = useState(30);

  // Trigger Blast Dialog
  const [blastDialogOpen, setBlastDialogOpen] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin-system/pengaturan-apel");
      if (!res.ok) throw new Error("Gagal mengambil data pengaturan apel.");
      const data = (await res.json()) as {
        configs: ApelConfigItem[];
        channels: WhatsappControlChannel[];
        sessions: ApelSessionItem[];
        targets?: ApelBroadcastTargetsResponse;
      };

      setConfigs(data.configs || []);
      setChannels(data.channels || []);
      setSessions(data.sessions || []);
      setTargets(data.targets ?? { areas: [], gaswils: [], jarings: [] });

      if (data.configs && data.configs.length > 0) {
        const first = data.configs[0];
        setSelectedConfigId(first.id);
        populateForm(first);
      } else {
        // Preset default channels if available
        if (data.channels && data.channels.length > 0) {
          const activeChannels = data.channels.filter((c) => c.status === "ACTIVE");
          if (activeChannels.length > 0) {
            setSelectedChannelId(activeChannels[0].id);
            setSelectedChannelIds(activeChannels.map((c) => c.id));
          }
        }
      }
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const populateForm = (cfg: ApelConfigItem) => {
    setTitle(cfg.title);
    setDescription(cfg.description || "");
    setTargetType(cfg.targetType || "ALL");
    setAreaId(cfg.areaId || "");
    setTargetGaswilIds(cfg.targetGaswilIds ?? []);
    setTargetJaringIds(cfg.targetJaringIds ?? []);
    setChannelSelectionMode(cfg.channelSelectionMode || "MANUAL");
    setSelectedChannelId(cfg.selectedChannelId || "");
    setSelectedChannelIds(cfg.selectedChannelIds ?? []);
    setMessageTemplate(cfg.messageTemplate);
    setAttendanceReplyTemplate(cfg.attendanceReplyTemplate || DEFAULT_ATTENDANCE_REPLY_TEMPLATE);
    setScheduleTime(cfg.scheduleTime || "07:00");
    setDeadlineTime(cfg.deadlineTime || "08:30");
    setDeadlineMinutes(cfg.deadlineMinutes || 90);
    setRequireLocation(cfg.requireLocation ?? true);
    setIsActive(cfg.isActive);
    setMinDelaySeconds(cfg.minDelaySeconds || 8);
    setMaxDelaySeconds(cfg.maxDelaySeconds || 20);
    setBatchSize(cfg.batchSize || 5);
    setBatchPauseSeconds(cfg.batchPauseSeconds || 30);
  };

  const handleSelectConfig = (cfg: ApelConfigItem) => {
    setSelectedConfigId(cfg.id);
    populateForm(cfg);
    setFeedback(null);
  };

  const handleCreateNew = () => {
    setSelectedConfigId(null);
    setTitle("Pengaturan Apel Baru");
    setDescription("");
    setTargetType("ALL");
    setAreaId("");
    setTargetGaswilIds([]);
    setTargetJaringIds([]);
    setChannelSelectionMode("LOAD_BALANCE");
    setMessageTemplate(
      `{Selamat pagi|Salam hormat|Selamat bertugas}, Rekan {{nama_jaring}}.\n\nMohon konfirmasi kehadiran untuk *Apel Pagi {{wilayah}}* pada hari {{tanggal}}.\nBatas waktu absensi: *{{deadline}}*.\n\n⚠️ *KETENTUAN ABSENSI:*\nUntuk mencatat kehadiran, Anda WAJIB membalas dengan mengetik *HADIR* dan mengirimkan *Titik Koordinat Lokasi Terkini* melalui menu lampiran WhatsApp (Share Location).\n*(Catatan: Kehadiran tidak akan tercatat tanpa pengiriman titik lokasi).*`,
    );
    setAttendanceReplyTemplate(DEFAULT_ATTENDANCE_REPLY_TEMPLATE);
    setScheduleTime("07:00");
    setDeadlineTime("08:30");
    setDeadlineMinutes(90);
    setRequireLocation(true);
    setIsActive(true);
    setMinDelaySeconds(8);
    setMaxDelaySeconds(20);
    setBatchSize(5);
    setBatchPauseSeconds(30);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);

      const payload = {
        title,
        description,
        targetType,
        areaId: targetType === "AREA" ? areaId || null : null,
        targetGaswilIds: targetType === "GASWIL" ? targetGaswilIds : [],
        targetJaringIds: targetType === "JARING" ? targetJaringIds : [],
        channelSelectionMode,
        selectedChannelId: channelSelectionMode === "MANUAL" ? selectedChannelId : null,
        selectedChannelIds: channelSelectionMode === "LOAD_BALANCE" ? selectedChannelIds : [],
        messageTemplate,
        attendanceReplyTemplate,
        scheduleTime,
        deadlineTime,
        deadlineMinutes,
        requireLocation,
        isActive,
        minDelaySeconds,
        maxDelaySeconds,
        batchSize,
        batchPauseSeconds,
      };

      if (selectedConfigId) {
        const res = await fetch(`/api/admin-system/pengaturan-apel/${selectedConfigId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal memperbarui konfigurasi.");
        setFeedback({ tone: "success", message: "Konfigurasi apel berhasil disimpan." });
      } else {
        const res = await fetch("/api/admin-system/pengaturan-apel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal membuat konfigurasi baru.");
        const result = (await res.json()) as { config: ApelConfigItem };
        setSelectedConfigId(result.config.id);
        setFeedback({ tone: "success", message: "Konfigurasi apel baru berhasil dibuat." });
      }

      await fetchData();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Gagal menyimpan konfigurasi.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus konfigurasi apel ini?")) return;
    try {
      const res = await fetch(`/api/admin-system/pengaturan-apel/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus konfigurasi.");
      setFeedback({ tone: "success", message: "Konfigurasi berhasil dihapus." });
      await fetchData();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Gagal menghapus konfigurasi.",
      });
    }
  };

  const totalTargetPreview = useMemo(() => {
    if (targetType === "ALL") return targets.jarings.length;
    if (targetType === "AREA") {
      if (!areaId) return 0;
      return targets.jarings.filter((j) => j.areaId === areaId).length;
    }
    if (targetType === "GASWIL") {
      const selectedGaswils = targets.gaswils.filter((g) => targetGaswilIds.includes(g.id));
      const jaringSet = new Set<string>();
      selectedGaswils.forEach((g) => g.jaringIds.forEach((id) => jaringSet.add(id)));
      return jaringSet.size;
    }
    if (targetType === "JARING") {
      return targetJaringIds.length;
    }
    return targets.jarings.length;
  }, [targetType, areaId, targetGaswilIds, targetJaringIds, targets]);

  const filteredGaswils = useMemo(() => {
    if (!searchGaswil.trim()) return targets.gaswils;
    const q = searchGaswil.toLowerCase();
    return targets.gaswils.filter((g) => g.name.toLowerCase().includes(q) || g.areaName.toLowerCase().includes(q));
  }, [targets.gaswils, searchGaswil]);

  const filteredJarings = useMemo(() => {
    if (!searchJaring.trim()) return targets.jarings;
    const q = searchJaring.toLowerCase();
    return targets.jarings.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        (j.fullName && j.fullName.toLowerCase().includes(q)) ||
        j.whatsappNumber.includes(q) ||
        j.areaName.toLowerCase().includes(q) ||
        j.caretakerName.toLowerCase().includes(q),
    );
  }, [targets.jarings, searchJaring]);

  const handleTriggerBlast = async () => {
    try {
      setBlasting(true);
      const res = await fetch("/api/admin-system/pengaturan-apel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger_blast",
          configId: selectedConfigId || undefined,
          title: `Apel Insidental - ${title}`,
          targetType,
          areaId: targetType === "AREA" ? areaId || null : null,
          targetGaswilIds: targetType === "GASWIL" ? targetGaswilIds : [],
          targetJaringIds: targetType === "JARING" ? targetJaringIds : [],
          messageTemplate,
          attendanceReplyTemplate,
          deadlineTime,
          deadlineMinutes,
          requireLocation,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || "Gagal memicu blasting apel.");
      }
      setBlastDialogOpen(false);
      setFeedback({
        tone: "success",
        message: "Blasting apel berhasil dipicu! Antrian pengiriman dengan mitigasi anti-ban sedang berjalan.",
      });
      await fetchData();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error instanceof Error ? error.message : "Gagal memicu blasting apel.",
      });
    } finally {
      setBlasting(false);
    }
  };

  // Preview generated text broadcast
  const previewText = useMemo(() => {
    let t = messageTemplate;
    t = t.replace(/\{\{\s*nama_jaring\s*\}\}/gi, "Budi Santoso");
    t = t.replace(/\{\{\s*nama\s*\}\}/gi, "Budi Santoso");
    t = t.replace(/\{\{\s*wilayah\s*\}\}/gi, "DKI Jakarta");
    t = t.replace(/\{\{\s*tanggal\s*\}\}/gi, "Rabu, 16 September 2026");
    t = t.replace(/\{\{\s*deadline\s*\}\}(?:\s*WIB)?/gi, `${deadlineTime} WIB`);
    t = t.replace(/\{\{\s*format_balasan\s*\}\}/gi, "Ketik *HADIR* atau bagikan lokasi terkini Anda");
    t = t.replace(/\{([^{}]+)\}/g, (_, choices: string) => choices.split("|")[0]?.trim() || "");
    return t;
  }, [messageTemplate, deadlineTime]);

  const insertPlaceholder = (tag: string) => {
    setMessageTemplate((prev) => `${prev} {{${tag}}}`);
  };

  // Preview generated text balasan bot
  const previewReplyText = useMemo(() => {
    let t = attendanceReplyTemplate || DEFAULT_ATTENDANCE_REPLY_TEMPLATE;
    t = t.replace(/\{\{\s*nama_jaring\s*\}\}/gi, "Budi Santoso");
    t = t.replace(/\{\{\s*nama\s*\}\}/gi, "Budi Santoso");
    t = t.replace(/\{\{\s*waktu\s*\}\}/gi, "20.36 WIB");
    t = t.replace(/\{\{\s*jam\s*\}\}/gi, "20.36 WIB");
    return t;
  }, [attendanceReplyTemplate]);

  const insertReplyPlaceholder = (tag: string) => {
    setAttendanceReplyTemplate((prev) => `${prev} {{${tag}}}`);
  };

  const connectedChannels = useMemo(() => {
    return channels.filter((c) => c.connectionStatus === "CONNECTED" || c.status === "ACTIVE");
  }, [channels]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <RadioTower className="size-6 text-emerald-500" />
            Pengaturan Apel & Absensi Jaring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Konfigurasi penyiaran pesan (blasting) absensi apel jaring terverifikasi dengan mitigasi pemblokiran
            WhatsApp otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Segarkan
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setBlastDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Play className="size-4 fill-white" />
            Kirim Apel Sekarang
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert
          className={cn(
            "border",
            feedback.tone === "success"
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
          )}
        >
          {feedback.tone === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          <AlertTitle>{feedback.tone === "success" ? "Berhasil" : "Perhatian"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Config List (3 cols) */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Profil Apel</CardTitle>
                <CardDescription className="text-xs">Pilih atau buat profil konfigurasi apel wilayah.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
                className="h-8 px-2 text-xs flex items-center gap-1"
              >
                <Plus className="size-3.5" />
                Tambah
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {configs.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                  Belum ada profil apel. Klik "Tambah" untuk membuat baru.
                </div>
              ) : (
                configs.map((cfg) => {
                  const isSelected = selectedConfigId === cfg.id;
                  return (
                    <div
                      key={cfg.id}
                      onClick={() => handleSelectConfig(cfg)}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3 transition-all",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-950/30 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {cfg.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-slate-400" />
                              {cfg.scheduleTime} WIB
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Timer className="size-3 text-slate-400" />
                              Hingga {cfg.deadlineTime}
                            </span>
                            <span>•</span>
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                cfg.requireLocation
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-blue-600 dark:text-blue-400",
                              )}
                            >
                              {cfg.requireLocation ? "Wajib GPS" : "Teks Saja"}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={cfg.isActive ? "default" : "secondary"}
                          className={cn(
                            "text-[10px] uppercase font-mono px-1.5 py-0.5",
                            cfg.isActive
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                          )}
                        >
                          {cfg.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
                        <span className="line-clamp-1">
                          {cfg.channelSelectionMode === "LOAD_BALANCE"
                            ? "Rotasi Bot Otomatis"
                            : cfg.selectedChannel?.name || "Bot Tunggal"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-slate-400 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cfg.id);
                          }}
                          title="Hapus profil"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Riwayat Sesi Apel Singkat */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Calendar className="size-4 text-slate-400" />
                Riwayat Sesi Apel Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada sesi apel yang dijalankan.</p>
              ) : (
                sessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 p-2 text-xs dark:border-slate-800/70 dark:bg-slate-900/40"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{s.title}</p>
                      <p className="text-[10px] text-slate-400">
                        Target: {s.totalTarget} | Hadir: {s.totalAttended} | Belum: {s.totalAbsent}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px] font-mono",
                        s.status === "ACTIVE" &&
                          "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300",
                        s.status === "BLASTING" &&
                          "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 animate-pulse",
                        s.status === "COMPLETED" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      )}
                      variant="outline"
                    >
                      {s.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Configuration Form (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Tabs defaultValue="sasaran" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <TabsTrigger value="sasaran" className="text-xs">
                1. Sasaran Broadcast
              </TabsTrigger>
              <TabsTrigger value="pengirim" className="text-xs">
                2. Bot Pengirim
              </TabsTrigger>
              <TabsTrigger value="template" className="text-xs">
                3. Template Pesan
              </TabsTrigger>
              <TabsTrigger value="jadwal" className="text-xs">
                4. Jadwal & Batas
              </TabsTrigger>
              <TabsTrigger value="antiban" className="text-xs">
                5. Anti-Ban
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SASARAN BROADCAST */}
            <TabsContent value="sasaran" className="space-y-4 pt-3">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <RadioTower className="size-5 text-emerald-500" />
                      Pengaturan Sasaran Broadcast Pesan Apel
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      Estimasi Target: {totalTargetPreview} Jaring
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tentukan sasaran penerima broadcast apel. Anda dapat memilih berdasarkan wilayah tertentu,
                    berdasarkan petugas pembina (Gaswil) tertentu, memilih jaring secara langsung, ataupun ke seluruh
                    wilayah nasional.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Mode Sasaran Broadcast Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mode 1: Seluruh Wilayah */}
                    <div
                      onClick={() => setTargetType("ALL")}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3.5 transition-all",
                        targetType === "ALL"
                          ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-white">
                          <RadioTower className="size-4 text-emerald-600 dark:text-emerald-400" />
                          Seluruh Wilayah (Nasional)
                        </div>
                        {targetType === "ALL" && <Check className="size-4 text-emerald-600" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Broadcast dikirimkan serentak ke seluruh personel jaring aktif terverifikasi (
                        {targets.jarings.length} jaring).
                      </p>
                    </div>

                    {/* Mode 2: Per Wilayah */}
                    <div
                      onClick={() => setTargetType("AREA")}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3.5 transition-all",
                        targetType === "AREA"
                          ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-white">
                          <MapPin className="size-4 text-cyan-600 dark:text-cyan-400" />
                          Berdasarkan Wilayah
                        </div>
                        {targetType === "AREA" && <Check className="size-4 text-cyan-600" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Kirimkan pesan hanya ke personel jaring yang bertugas atau berdomisili di wilayah terpilih.
                      </p>
                    </div>

                    {/* Mode 3: Per Gaswil */}
                    <div
                      onClick={() => setTargetType("GASWIL")}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3.5 transition-all",
                        targetType === "GASWIL"
                          ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-white">
                          <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
                          Berdasarkan Petugas Pembina (Gaswil)
                        </div>
                        {targetType === "GASWIL" && <Check className="size-4 text-blue-600" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Pilih satu atau beberapa Petugas Wilayah. Broadcast hanya akan dikirim ke jaring binaan mereka.
                      </p>
                    </div>

                    {/* Mode 4: Per Jaring Spesifik */}
                    <div
                      onClick={() => setTargetType("JARING")}
                      className={cn(
                        "cursor-pointer rounded-lg border p-3.5 transition-all",
                        targetType === "JARING"
                          ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-white">
                          <Users className="size-4 text-purple-600 dark:text-purple-400" />
                          Berdasarkan Personel Jaring Tertentu
                        </div>
                        {targetType === "JARING" && <Check className="size-4 text-purple-600" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Pilih langsung nama jaring spesifik yang harus mengikuti absensi apel ini.
                      </p>
                    </div>
                  </div>

                  {/* Sub-Panel: Berdasarkan Wilayah */}
                  {targetType === "AREA" && (
                    <div className="space-y-3 rounded-lg border border-cyan-500/30 bg-cyan-50/30 p-4 dark:border-cyan-500/20 dark:bg-cyan-950/20">
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Pilih Wilayah Sasaran Apel
                      </Label>
                      <select
                        value={areaId}
                        onChange={(e) => setAreaId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-cyan-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">-- Pilih Wilayah Penugasan --</option>
                        {targets.areas.map((a) => {
                          const count = targets.jarings.filter((j) => j.areaId === a.id).length;
                          return (
                            <option key={a.id} value={a.id}>
                              {a.name} ({count} Jaring Terdaftar)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Sub-Panel: Berdasarkan Gaswil */}
                  {targetType === "GASWIL" && (
                    <div className="space-y-3 rounded-lg border border-blue-500/30 bg-blue-50/30 p-4 dark:border-blue-500/20 dark:bg-blue-950/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Pilih Petugas Wilayah Pembina ({targetGaswilIds.length} dipilih)
                          </Label>
                          <p className="text-[11px] text-slate-500">
                            Pesan hanya akan dikirimkan ke jaring binaan dari petugas yang dicentang di bawah ini.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setTargetGaswilIds(targets.gaswils.map((g) => g.id))}
                          >
                            Pilih Semua
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setTargetGaswilIds([])}
                          >
                            Kosongkan
                          </Button>
                        </div>
                      </div>

                      {/* Search Gaswil */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                        <Input
                          placeholder="Cari petugas wilayah..."
                          value={searchGaswil}
                          onChange={(e) => setSearchGaswil(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                        {filteredGaswils.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center">
                            Tidak ada petugas wilayah ditemukan.
                          </p>
                        ) : (
                          filteredGaswils.map((g) => {
                            const isChecked = targetGaswilIds.includes(g.id);
                            return (
                              <label
                                key={g.id}
                                className={cn(
                                  "flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors cursor-pointer",
                                  isChecked
                                    ? "border-blue-500/50 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-950/30"
                                    : "border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50",
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTargetGaswilIds((prev) => [...prev, g.id]);
                                      } else {
                                        setTargetGaswilIds((prev) => prev.filter((id) => id !== g.id));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{g.name}</p>
                                    <p className="text-[11px] text-slate-500">Wilayah: {g.areaName}</p>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="font-mono text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                >
                                  {g.totalJarings} Jaring Binaan
                                </Badge>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sub-Panel: Berdasarkan Jaring Spesifik */}
                  {targetType === "JARING" && (
                    <div className="space-y-3 rounded-lg border border-purple-500/30 bg-purple-50/30 p-4 dark:border-purple-500/20 dark:bg-purple-950/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Pilih Personel Jaring Spesifik ({targetJaringIds.length} dipilih)
                          </Label>
                          <p className="text-[11px] text-slate-500">
                            Pesan broadcast hanya dikirimkan ke personel jaring yang Anda centang langsung.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setTargetJaringIds(targets.jarings.map((j) => j.id))}
                          >
                            Pilih Semua ({targets.jarings.length})
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setTargetJaringIds([])}
                          >
                            Kosongkan
                          </Button>
                        </div>
                      </div>

                      {/* Search Jaring */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                        <Input
                          placeholder="Cari jaring berdasarkan nama, nomor WhatsApp, wilayah, atau pembina..."
                          value={searchJaring}
                          onChange={(e) => setSearchJaring(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                        {filteredJarings.length === 0 ? (
                          <p className="text-xs text-slate-400 py-4 text-center">
                            Tidak ada personel jaring ditemukan.
                          </p>
                        ) : (
                          filteredJarings.map((j) => {
                            const isChecked = targetJaringIds.includes(j.id);
                            return (
                              <label
                                key={j.id}
                                className={cn(
                                  "flex items-center justify-between rounded-lg border p-2 text-xs transition-colors cursor-pointer",
                                  isChecked
                                    ? "border-purple-500/50 bg-purple-50/50 dark:border-purple-500/40 dark:bg-purple-950/30"
                                    : "border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50",
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTargetJaringIds((prev) => [...prev, j.id]);
                                      } else {
                                        setTargetJaringIds((prev) => prev.filter((id) => id !== j.id));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">{j.name}</span>
                                      {j.fullName && j.fullName !== j.name && (
                                        <span className="text-[11px] text-slate-400">({j.fullName})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                      <span className="font-mono text-cyan-600 dark:text-cyan-400">
                                        {j.whatsappNumber}
                                      </span>
                                      <span>•</span>
                                      <span>{j.areaName}</span>
                                      <span>•</span>
                                      <span>Pembina: {j.caretakerName}</span>
                                    </div>
                                  </div>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PENGIRIM WILAYAH */}
            <TabsContent value="pengirim" className="space-y-4 pt-3">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="size-5 text-emerald-500" />
                    Pengaturan Nomor Bot Pengirim per Wilayah
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pilih nomor bot yang bertugas mengirim pesan ke jaring. Jika suatu wilayah memiliki lebih dari 1
                    bot, Anda dapat menggunakan mode rotasi load-balancing untuk mengurangi resiko spam.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Nama Profil Konfigurasi</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Apel Pagi Wilayah DKI Jakarta"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Mode Pemilihan Nomor Bot Pengirim</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setChannelSelectionMode("LOAD_BALANCE")}
                        className={cn(
                          "cursor-pointer rounded-lg border p-3.5 transition-all",
                          channelSelectionMode === "LOAD_BALANCE"
                            ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-950/30"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                        )}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-white">
                          <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
                          Rotasi & Load Balancing Otomatis
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Beban pengiriman dibagi rata secara bergantian ke seluruh nomor bot aktif di wilayah tersebut.
                          Sangat dianjurkan untuk mencegah pemblokiran.
                        </p>
                      </div>

                      <div
                        onClick={() => setChannelSelectionMode("MANUAL")}
                        className={cn(
                          "cursor-pointer rounded-lg border p-3.5 transition-all",
                          channelSelectionMode === "MANUAL"
                            ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/50 dark:bg-emerald-950/30"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800",
                        )}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-white">
                          <Bot className="size-4 text-slate-600 dark:text-slate-400" />
                          Nomor Bot Spesifik Tunggal
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Menggunakan 1 nomor bot tertentu yang Anda pilih secara manual untuk seluruh pengiriman di
                          wilayah ini.
                        </p>
                      </div>
                    </div>
                  </div>

                  {channelSelectionMode === "MANUAL" ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Pilih Nomor Bot WhatsApp Aktif</Label>
                      <select
                        value={selectedChannelId}
                        onChange={(e) => setSelectedChannelId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">-- Pilih Kanal Bot --</option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.botPhoneNumber || "Belum ada nomor"}) — Status:{" "}
                            {c.connectionStatus || c.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">
                        Daftar Nomor Bot Terkoneksi yang Diikutsertakan ({connectedChannels.length} bot aktif)
                      </Label>
                      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 p-2.5 dark:border-slate-800">
                        {channels.length === 0 ? (
                          <p className="text-xs text-slate-400">Tidak ada kanal bot terdaftar.</p>
                        ) : (
                          channels.map((c) => {
                            const isChecked = selectedChannelIds.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className="flex items-center gap-2.5 rounded p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChannelIds((prev) => [...prev, c.id]);
                                    } else {
                                      setSelectedChannelIds((prev) => prev.filter((id) => id !== c.id));
                                    }
                                  }}
                                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                                <span className="text-slate-400 font-mono">({c.botPhoneNumber || "No Number"})</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "ml-auto text-[10px]",
                                    c.connectionStatus === "CONNECTED"
                                      ? "border-emerald-500 text-emerald-600"
                                      : "border-slate-300 text-slate-500",
                                  )}
                                >
                                  {c.connectionStatus || c.status}
                                </Badge>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: TEMPLATE PESAN */}
            <TabsContent value="template" className="space-y-4 pt-3">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-5 text-amber-500" />
                    Editor Template Pesan Blasting
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Susun format pesan ajakan apel. Gunakan placeholder dinamis dan spintax agar pesan tidak terdeteksi
                    spam.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 py-1">Sisipkan:</span>
                    {[
                      { label: "Nama Jaring", tag: "nama_jaring" },
                      { label: "Wilayah", tag: "wilayah" },
                      { label: "Tanggal", tag: "tanggal" },
                      { label: "Deadline", tag: "deadline" },
                      { label: "Format Balasan", tag: "format_balasan" },
                    ].map((item) => (
                      <Button
                        key={item.tag}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertPlaceholder(item.tag)}
                        className="h-7 text-xs px-2"
                      >
                        + {item.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Textarea Editor */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Isi Template</Label>
                      <textarea
                        value={messageTemplate}
                        onChange={(e) => setMessageTemplate(e.target.value)}
                        rows={11}
                        className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs leading-relaxed shadow-xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <p className="text-[11px] text-slate-400">
                        Gunakan spintax{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                          {"{Salam|Selamat pagi}"}
                        </code>{" "}
                        untuk variasi kata acak otomatis.
                      </p>
                    </div>

                    {/* Live WhatsApp Preview */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Bot className="size-3.5" />
                        Pratinjau Tampilan Pesan WhatsApp
                      </Label>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3.5 dark:bg-emerald-950/20">
                        <div className="rounded-lg bg-white p-3.5 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            Bot Wilayah (Resmi)
                          </p>
                          <div className="whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                            {previewText}
                          </div>
                          <div className="mt-2 text-right text-[10px] text-slate-400">{scheduleTime} WIB ✓✓</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: TEMPLATE BALASAN OTOMATIS BOT (KONFIRMASI KEHADIRAN) */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="size-5 text-emerald-600 dark:text-emerald-400" />
                    Template Balasan Otomatis Bot (Konfirmasi Kehadiran)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Format pesan WhatsApp yang otomatis dikirim oleh bot Call Center kepada personil jaring saat
                    kehadiran mereka berhasil diverifikasi dan dicatat sistem.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs font-semibold text-slate-500 py-1">Sisipkan:</span>
                      {[
                        { label: "Nama Jaring", tag: "nama_jaring" },
                        { label: "Waktu Kehadiran", tag: "waktu" },
                      ].map((item) => (
                        <Button
                          key={item.tag}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => insertReplyPlaceholder(item.tag)}
                          className="h-7 text-xs px-2"
                        >
                          + {item.label}
                        </Button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttendanceReplyTemplate(DEFAULT_ATTENDANCE_REPLY_TEMPLATE)}
                      className="h-7 text-xs text-slate-500 hover:text-emerald-600"
                    >
                      Kembalikan ke Default
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Textarea Editor Balasan Bot */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Format Pesan Balasan Bot</Label>
                      <textarea
                        value={attendanceReplyTemplate}
                        onChange={(e) => setAttendanceReplyTemplate(e.target.value)}
                        rows={7}
                        placeholder="Contoh: *Call Center Merah Putih membalas:*..."
                        className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs leading-relaxed shadow-xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <p className="text-[11px] text-slate-400">
                        Tag yang tersedia:{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{nama_jaring}}"}</code>{" "}
                        (nama personil) dan{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{waktu}}"}</code> (jam
                        absensi, misal: 20.36 WIB).
                      </p>
                    </div>

                    {/* Live WhatsApp Preview Balasan Bot */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <MessageSquare className="size-3.5" />
                        Pratinjau Percakapan WhatsApp Jaring
                      </Label>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3.5 dark:bg-emerald-950/20">
                        <div className="space-y-2.5">
                          {/* Chat bubble masuk dari jaring */}
                          <div className="flex justify-end">
                            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-slate-900 dark:text-emerald-100 px-3 py-1.5 shadow-xs text-xs max-w-[85%] border border-emerald-300/40">
                              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                Rekan Budi Santoso
                              </p>
                              <p className="font-medium mt-0.5">HADIR</p>
                              <p className="text-[9px] text-right text-emerald-700/70 dark:text-emerald-300/70 mt-0.5">
                                20.36 ✓✓
                              </p>
                            </div>
                          </div>

                          {/* Chat bubble balasan dari bot Call Center */}
                          <div className="flex justify-start">
                            <div className="rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 shadow-xs border border-slate-200 dark:border-slate-800 text-xs max-w-[92%] space-y-1">
                              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-500" />
                                Call Center Merah Putih
                              </p>
                              <div className="whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                                {previewReplyText}
                              </div>
                              <p className="text-[10px] text-right text-slate-400 mt-1">20.36 ✓✓</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: JADWAL & DEADLINE */}
            <TabsContent value="jadwal" className="space-y-4 pt-3">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="size-5 text-sky-500" />
                    Pengaturan Waktu Pengiriman & Batas Absensi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tentukan jam pengiriman apel harian otomatis dan batas waktu bagi jaring untuk membalas kehadiran.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Send className="size-3.5 text-emerald-500" />
                        Waktu Pengiriman Blasting Rutin (WIB)
                      </Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="text-sm font-mono"
                      />
                      <p className="text-[11px] text-slate-400">
                        Pukul berapa bot akan mulai mengirimkan pesan blasting apel secara otomatis setiap hari.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Timer className="size-3.5 text-rose-500" />
                        Batas Waktu (Deadline) Absensi (WIB)
                      </Label>
                      <Input
                        type="time"
                        value={deadlineTime}
                        onChange={(e) => setDeadlineTime(e.target.value)}
                        className="text-sm font-mono"
                      />
                      <p className="text-[11px] text-slate-400">
                        Batas waktu maksimal jaring memberikan konfirmasi sebelum dicatat sebagai "Tidak Hadir".
                      </p>
                    </div>
                  </div>

                  {/* PENGATURAN KEWAJIBAN LOKASI GPS (RADIO BUTTON) */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <MapPin className="size-4 text-emerald-500" />
                        Kewajiban Pengiriman Titik Lokasi GPS WhatsApp (Absensi)
                      </Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          requireLocation
                            ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                        )}
                      >
                        {requireLocation ? "Wajib Lokasi GPS" : "Hanya Balasan Teks"}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tentukan apakah personel jaring harus mengirimkan titik koordinat lokasi (Share Location) saat
                      apel absensi, atau cukup membalas pesan teks saja.
                    </p>

                    {/* Radio Button Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Option 1: Wajib Kirim Lokasi GPS */}
                      <label
                        onClick={() => setRequireLocation(true)}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all",
                          requireLocation
                            ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/60 dark:bg-emerald-950/30 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="requireLocation"
                          value="true"
                          checked={requireLocation === true}
                          onChange={() => setRequireLocation(true)}
                          className="size-4 mt-0.5 text-emerald-600 border-slate-300 focus:ring-emerald-500 dark:border-slate-700"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-white">
                            <MapPin className="size-3.5 text-emerald-500 shrink-0" />
                            <span>Wajib Kirim Lokasi GPS (Direkomendasikan)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Jaring <strong>wajib membagikan titik lokasi GPS</strong> WhatsApp (Share Location). Jika
                            hanya membalas pesan teks, absensi <strong>belum tercatat</strong> dan bot otomatis meminta
                            pengiriman lokasi.
                          </p>
                        </div>
                      </label>

                      {/* Option 2: Hanya Balasan Teks (Lokasi Bebas / Opsional) */}
                      <label
                        onClick={() => setRequireLocation(false)}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all",
                          !requireLocation
                            ? "border-blue-500 bg-blue-50/50 dark:border-blue-500/60 dark:bg-blue-950/30 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="requireLocation"
                          value="false"
                          checked={requireLocation === false}
                          onChange={() => setRequireLocation(false)}
                          className="size-4 mt-0.5 text-blue-600 border-slate-300 focus:ring-blue-500 dark:border-slate-700"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-white">
                            <MessageSquare className="size-3.5 text-blue-500 shrink-0" />
                            <span>Hanya Balasan Teks (Lokasi Tidak Wajib)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Jaring cukup membalas teks (misal <strong>"HADIR"</strong>) untuk langsung tercatat absensi.
                            Pengiriman titik lokasi bersifat sukarela dan tidak diwajibkan.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Aktifkan Penjadwalan Apel Harian Otomatis untuk Profil Ini
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: MITIGASI ANTI-BAN */}
            <TabsContent value="antiban" className="space-y-4 pt-3">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                    Parameter Mitigasi Pemblokiran WhatsApp (Anti-Ban Engine)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pengaturan jeda acak (*dynamic jitter*), *cooling-down* kelompok pesan, dan simulasi pengetikan agar
                    bot tidak terblokir oleh Meta/WhatsApp saat mengirim massal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                    <ShieldAlert className="size-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">Perlindungan Anti-Ban Terpadu Aktif</p>
                      <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        Sistem secara otomatis menginjeksikan <strong>Presence Composing</strong> (simulasi mengetik
                        selama 2-4 detik), variasi tanda tangan teks tak terlihat (*zero-width entropy*), serta rotasi
                        pengiriman antar nomor bot aktif.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Jeda Acak Minimum (Detik)</Label>
                      <Input
                        type="number"
                        min={3}
                        max={60}
                        value={minDelaySeconds}
                        onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                        className="text-sm font-mono"
                      />
                      <p className="text-[11px] text-slate-400">
                        Jeda minimum sebelum berpindah ke kontak jaring berikutnya.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Jeda Acak Maksimum (Detik)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={maxDelaySeconds}
                        onChange={(e) => setMaxDelaySeconds(Number(e.target.value))}
                        className="text-sm font-mono"
                      />
                      <p className="text-[11px] text-slate-400">
                        Jeda maksimum yang dipilih secara acak (jitter) per nomor.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Ukuran Batch Pesan (*Chunking*)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="text-sm font-mono"
                      />
                      <p className="text-[11px] text-slate-400">
                        Jumlah pesan terkirim sebelum bot mengambil istirahat jeda.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">
                        Durasi Istirahat Antar Batch (*Cooling Down* Detik)
                      </Label>
                      <Input
                        type="number"
                        min={5}
                        max={300}
                        value={batchPauseSeconds}
                        onChange={(e) => setBatchPauseSeconds(Number(e.target.value))}
                        className="text-sm font-mono"
                      />
                      <p className="text-[11px] text-slate-400">
                        Lama jeda istirahat bot setelah satu batch pesan selesai ditembak.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </div>
      </div>

      {/* Trigger Blast Confirmation Dialog */}
      <Dialog open={blastDialogOpen} onOpenChange={setBlastDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Flame className="size-5 text-rose-500" />
              Konfirmasi Kirim Blasting Apel Sekarang
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sistem akan memulai antrian penyiaran pesan WhatsApp apel ke seluruh nomor jaring terverifikasi secara
              berurutan dengan mitigasi anti-ban.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Parameter Sesi yang Akan Dikirim:</p>
              <p className="text-slate-500">
                Judul: <span className="font-medium text-slate-700 dark:text-slate-300">{title}</span>
              </p>
              <p className="text-slate-500">
                Sasaran Broadcast:{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {targetType === "ALL" && `Seluruh Jaring Nasional (${targets.jarings.length} Personel)`}
                  {targetType === "AREA" &&
                    `Wilayah ${targets.areas.find((a) => a.id === areaId)?.name || "Pusat"} (${totalTargetPreview} Jaring)`}
                  {targetType === "GASWIL" &&
                    `${targetGaswilIds.length} Petugas Pembina (${totalTargetPreview} Jaring Binaan)`}
                  {targetType === "JARING" && `${targetJaringIds.length} Personel Jaring Spesifik`}
                </span>
              </p>
              <p className="text-slate-500">
                Deadline Absensi:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {deadlineTime} WIB ({deadlineMinutes} menit)
                </span>
              </p>

              {/* Status Kewajiban Lokasi GPS */}
              <div className="flex items-center gap-1.5 pt-1 text-slate-500">
                <span>Ketentuan Absensi:</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    requireLocation
                      ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                  )}
                >
                  {requireLocation ? "Wajib Kirim Lokasi GPS" : "Hanya Balasan Teks (Lokasi Bebas)"}
                </Badge>
              </div>

              <p className="text-slate-500">
                Mode Bot: <span className="font-medium text-slate-700 dark:text-slate-300">{channelSelectionMode}</span>
              </p>
              <p className="text-slate-500">
                Estimasi Jitter:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {minDelaySeconds}–{maxDelaySeconds} detik per pesan
                </span>
              </p>

              {/* Pratinjau Balasan Bot Sesi Ini */}
              <div className="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Balasan Otomatis Bot saat Hadir:</p>
                <div className="rounded bg-white p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-20 overflow-y-auto font-sans">
                  {previewReplyText}
                </div>
              </div>
            </div>

            {/* Quick Radio Toggle in Dialog */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ubah Ketentuan Lokasi untuk Sesi Ini:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  onClick={() => setRequireLocation(true)}
                  className={cn(
                    "flex items-center gap-2 rounded border p-2 cursor-pointer text-xs transition-all",
                    requireLocation
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400",
                  )}
                >
                  <input
                    type="radio"
                    name="dialogRequireLocation"
                    checked={requireLocation === true}
                    onChange={() => setRequireLocation(true)}
                    className="size-3.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Wajib Lokasi GPS</span>
                </label>
                <label
                  onClick={() => setRequireLocation(false)}
                  className={cn(
                    "flex items-center gap-2 rounded border p-2 cursor-pointer text-xs transition-all",
                    !requireLocation
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 font-medium"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400",
                  )}
                >
                  <input
                    type="radio"
                    name="dialogRequireLocation"
                    checked={requireLocation === false}
                    onChange={() => setRequireLocation(false)}
                    className="size-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Hanya Balas Teks</span>
                </label>
              </div>
            </div>

            <p className="text-slate-500">
              Proses blasting berjalan di latar belakang (background queue). Anda dapat langsung memantau status
              kehadiran jaring di halaman <strong>Peta Apel Deputi</strong>.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBlastDialogOpen(false)}
              disabled={blasting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleTriggerBlast}
              disabled={blasting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {blasting ? "Memproses..." : "Ya, Mulai Blasting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
