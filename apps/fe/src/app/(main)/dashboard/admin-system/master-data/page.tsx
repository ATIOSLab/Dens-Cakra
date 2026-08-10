"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  FolderTree,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { JaringOccupation, ReportCategory } from "@/server/field-ops/types";

type CategoryResponse = ReportCategory & {
  _count?: {
    whatsAppMessages?: number;
  };
};

type OccupationResponse = JaringOccupation & {
  _count?: {
    jaring?: number;
  };
};

type MasterEntity = "category" | "occupation";
type MasterItem = ReportCategory | JaringOccupation;

function entityApiPath(entity: MasterEntity) {
  if (entity === "occupation") return "/api/admin-system/master-data/occupations";
  return "/api/admin-system/master-data/report-categories";
}

function entityLabel(entity: MasterEntity, detailed = false) {
  if (entity === "occupation") return "Pekerjaan";
  return detailed ? "Kategori Laporan" : "Kategori";
}

function usageCount(item: MasterItem, entity: MasterEntity) {
  if (entity === "category") return (item as ReportCategory).messageCount ?? 0;
  return (item as JaringOccupation).jaringCount ?? 0;
}

function entityPlaceholder(entity: MasterEntity) {
  if (entity === "occupation") return "Contoh: Analis Keuangan";
  return "Contoh: Keamanan, Politik";
}

function validateMasterName(entity: MasterEntity, rawName: string) {
  const name = rawName.trim();
  const label = entityLabel(entity, true).toLowerCase();

  if (name.length === 0) {
    return `Nama ${label} wajib diisi.`;
  }

  if (name.length < 2) {
    return `Nama ${label} minimal 2 karakter.`;
  }

  return null;
}

type ConfirmDialogState = {
  title: string;
  description: string;
  actionLabel: string;
  actionVariant: "default" | "success" | "warning" | "destructive";
  onConfirm: () => void | Promise<void>;
} | null;

export default function AdminMasterDataPage() {
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [occupations, setOccupations] = useState<JaringOccupation[]>([]);
  const [activeEntity, setActiveEntity] = useState<MasterEntity>("category");

  // Drawer form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isActive: true });
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);

  // Table search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Row selection checkboxes state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("-");
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Alert Dialog State
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  // Scalable entities listing (inspired by Palantir Foundry / Azure Admin)
  const entities: Array<{ id: MasterEntity; label: string; icon: typeof Tags }> = [
    { id: "category", label: "Kategori Laporan", icon: Tags },
    { id: "occupation", label: "Pekerjaan", icon: BriefcaseBusiness },
  ];

  // Summary Metrics
  const totalEntities = entities.length;
  const totalDataCount = categories.length + occupations.length;

  const loadCategories = useCallback(async () => {
    try {
      setBusyKey("load-categories");
      const response = await fetch("/api/admin-system/master-data/report-categories", { cache: "no-store" });
      const body = (await response.json()) as CategoryResponse[] | { message?: string };

      if (!response.ok) {
        throw new Error("message" in body ? body.message : "Gagal memuat kategori laporan.");
      }

      setCategories(
        (body as CategoryResponse[]).map((category) => ({
          id: category.id,
          code: category.code,
          name: category.name,
          description: category.description ?? null,
          isActive: category.isActive,
          messageCount: category._count?.whatsAppMessages ?? category.messageCount ?? 0,
        })),
      );
      setError(null);
      const now = new Date();
      setLastUpdate(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat kategori laporan.");
    } finally {
      setBusyKey(null);
    }
  }, []);

  const loadOccupations = useCallback(async () => {
    try {
      setBusyKey("load-occupations");
      const response = await fetch("/api/admin-system/master-data/occupations", { cache: "no-store" });
      const body = (await response.json()) as OccupationResponse[] | { message?: string };

      if (!response.ok) {
        throw new Error("message" in body ? body.message : "Gagal memuat pekerjaan.");
      }

      setOccupations(
        (body as OccupationResponse[]).map((occupation) => ({
          id: occupation.id,
          code: occupation.code,
          name: occupation.name,
          description: occupation.description ?? null,
          isActive: occupation.isActive,
          jaringCount: occupation._count?.jaring ?? occupation.jaringCount ?? 0,
        })),
      );
      setError(null);
      const now = new Date();
      setLastUpdate(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat pekerjaan.");
    } finally {
      setBusyKey(null);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void loadOccupations();
  }, [loadCategories, loadOccupations]);

  const loadActiveEntity = async () => {
    if (activeEntity === "occupation") return loadOccupations();
    return loadCategories();
  };

  const handleRefresh = async () => {
    setSelectedIds([]);
    await loadActiveEntity();
    setSuccess("Data berhasil diperbarui.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Create & Edit execution
  const executeSave = async () => {
    const name = form.name.trim();
    try {
      setBusyKey("save");
      if (editingItem) {
        // Edit flow
        const url = `${entityApiPath(activeEntity)}/${editingItem.id}`;

        const response = await fetch(url, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            description: form.description.trim() || null,
            isActive: form.isActive,
          }),
        });

        const body = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(body.message ?? "Gagal memperbarui data.");
        }

        setSuccess(`${entityLabel(activeEntity)} berhasil diperbarui.`);
        setEditingItem(null);
      } else {
        // Create flow
        const url = entityApiPath(activeEntity);

        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            description: form.description.trim() || undefined,
          }),
        });

        const body = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(body.message ?? "Gagal menyimpan data.");
        }

        setSuccess(`${entityLabel(activeEntity)} baru berhasil ditambahkan.`);
      }

      setForm({ name: "", description: "", isActive: true });
      setError(null);
      setFormErrors({});
      setDialogError(null);
      setIsDrawerOpen(false);
      await loadActiveEntity();
      setTimeout(() => setSuccess(null), 3000);
    } catch (saveError) {
      setDialogError(saveError instanceof Error ? saveError.message : "Gagal menyimpan data.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCancelClick = () => {
    const isModified = form.name.trim() !== "" || form.description.trim() !== "";

    if (isModified) {
      const isEdit = editingItem !== null;
      const typeLabel = entityLabel(activeEntity, true);

      let description = "";
      if (isEdit) {
        description = `Apakah Anda yakin ingin membatalkan perubahan data ${typeLabel.toLowerCase()} ini? Perubahan yang belum disimpan akan hilang.`;
      } else {
        description = `Apakah Anda yakin ingin membatalkan pembuatan ${typeLabel.toLowerCase()} baru ini? Data yang telah diisi akan hilang.`;
      }

      setConfirmDialog({
        title: isEdit ? "Batalkan Perubahan?" : "Batalkan Pembuatan?",
        description,
        actionLabel: "Ya, Batalkan",
        actionVariant: "destructive",
        onConfirm: () => {
          setIsDrawerOpen(false);
          setFormErrors({});
          setDialogError(null);
        },
      });
    } else {
      setIsDrawerOpen(false);
      setFormErrors({});
      setDialogError(null);
    }
  };

  const saveEntity = () => {
    const name = form.name.trim();
    const nameError = validateMasterName(activeEntity, form.name);
    if (nameError) {
      setFormErrors({ name: nameError });
      setDialogError(null);
      nameInputRef.current?.focus();
      return;
    }
    setFormErrors({});
    setDialogError(null);

    const isEdit = editingItem !== null;
    const typeLabel = entityLabel(activeEntity, true);

    let description = "";
    if (isEdit) {
      description = `Apakah Anda yakin ingin menyimpan perubahan pada ${typeLabel.toLowerCase()} "${editingItem.name}"?`;
    } else {
      description = `Apakah Anda yakin ingin menambahkan ${typeLabel.toLowerCase()} baru "${name}" ke dalam sistem?`;
    }

    setConfirmDialog({
      title: isEdit ? "Simpan Perubahan?" : "Simpan Data Baru?",
      description,
      actionLabel: "Ya, Simpan",
      actionVariant: "success",
      onConfirm: () => void executeSave(),
    });
  };

  const startEdit = (item: MasterItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      isActive: item.isActive,
    });
    setFormErrors({});
    setDialogError(null);
    setError(null);
    setSuccess(null);
    setIsDrawerOpen(true);
  };

  const startCreate = () => {
    setEditingItem(null);
    setForm({ name: "", description: "", isActive: true });
    setFormErrors({});
    setDialogError(null);
    setError(null);
    setSuccess(null);
    setIsDrawerOpen(true);
  };

  // Toggle status execution
  const executeToggleStatus = async (item: MasterItem) => {
    try {
      setBusyKey(`toggle:${item.id}`);
      const url = `${entityApiPath(activeEntity)}/${item.id}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Gagal memperbarui status.");
      }

      setSuccess(`Status berhasil diubah.`);
      await loadActiveEntity();
      setTimeout(() => setSuccess(null), 3000);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Gagal memperbarui status.");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleStatus = (item: MasterItem) => {
    const actionStr = item.isActive ? "Menonaktifkan" : "Mengaktifkan";
    const typeStr = entityLabel(activeEntity, true);
    setConfirmDialog({
      title: `${actionStr} ${typeStr}?`,
      description: item.isActive
        ? `Apakah Anda yakin ingin menonaktifkan "${item.name}"? Entitas ini tidak akan dapat dipilih di form baru.`
        : `Apakah Anda yakin ingin mengaktifkan kembali "${item.name}"? Entitas ini akan segera tersedia untuk form baru.`,
      actionLabel: item.isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan",
      actionVariant: item.isActive ? "warning" : "success",
      onConfirm: () => void executeToggleStatus(item),
    });
  };

  // Soft delete execution
  const executeSoftDelete = async (item: MasterItem) => {
    try {
      setBusyKey(`delete:${item.id}`);
      const url = `${entityApiPath(activeEntity)}/${item.id}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Gagal menghapus data.");
      }

      setSuccess("Data dinonaktifkan.");
      await loadActiveEntity();
      setTimeout(() => setSuccess(null), 3000);
    } catch (delError) {
      setError(delError instanceof Error ? delError.message : "Gagal menonaktifkan data.");
    } finally {
      setBusyKey(null);
    }
  };

  const softDelete = (item: MasterItem) => {
    if (!item.isActive) {
      setError("Data sudah dalam keadaan Nonaktif.");
      return;
    }
    const typeStr = entityLabel(activeEntity);
    setConfirmDialog({
      title: `Nonaktifkan ${typeStr}?`,
      description: `Apakah Anda yakin ingin menonaktifkan "${item.name}" secara permanen? Data historis lama akan tetap dipertahankan namun entitas referensi tidak akan muncul lagi di formulir baru.`,
      actionLabel: "Ya, Hapus/Nonaktifkan",
      actionVariant: "destructive",
      onConfirm: () => void executeSoftDelete(item),
    });
  };

  // Bulk Status toggle execution
  const handleBulkStatus = (targetActive: boolean) => {
    const actionStr = targetActive ? "mengaktifkan" : "menonaktifkan";
    setConfirmDialog({
      title: `Ubah Status Massal?`,
      description: `Apakah Anda yakin ingin ${actionStr} ${selectedIds.length} item data terpilih secara sekaligus?`,
      actionLabel: targetActive ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      actionVariant: targetActive ? "success" : "warning",
      onConfirm: async () => {
        try {
          setBusyKey("bulk");
          const urlPrefix = entityApiPath(activeEntity);

          await Promise.all(
            selectedIds.map((id) =>
              fetch(`${urlPrefix}/${id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ isActive: targetActive }),
              }),
            ),
          );

          setSuccess(`Berhasil memperbarui ${selectedIds.length} item secara massal.`);
          setSelectedIds([]);
          await loadActiveEntity();
          setTimeout(() => setSuccess(null), 3000);
        } catch (bulkError) {
          setError("Gagal memproses perubahan status massal.");
        } finally {
          setBusyKey(null);
        }
      },
    });
  };

  // Filter & Sort Logic
  const filteredAndSortedItems = useMemo(() => {
    let rawList: MasterItem[] = categories;
    if (activeEntity === "occupation") rawList = occupations;
    let list = [...rawList];

    // Search Query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      const targetActive = statusFilter === "active";
      list = list.filter((item) => item.isActive === targetActive);
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a] ?? "";
      let valB: any = b[sortField as keyof typeof b] ?? "";

      if (sortField === "usage") {
        valA = usageCount(a, activeEntity);
        valB = usageCount(b, activeEntity);
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [activeEntity, categories, occupations, searchQuery, statusFilter, sortField, sortDirection]);

  // Pagination calculations
  const totalItems = filteredAndSortedItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination and selection when table query state changes.
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeEntity, searchQuery, statusFilter, rowsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedItems, currentPage, rowsPerPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedItems.map((item) => item.id).includes(id)));
    } else {
      const newIds = paginatedItems.map((item) => item.id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...newIds]);
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* HEADER SECTION WITH STATS COUNTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-[#14B8FF] border border-cyan-500/20 dark:border-[#14B8FF]/20 font-mono tracking-wider text-[9px] uppercase">
              WORKSPACE
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">Master Data</h1>
          <p className="text-muted-foreground text-sm font-sans">
            Kelola seluruh data referensi yang digunakan oleh sistem.
          </p>
        </div>

        {/* Scalable Stat Block */}
        <div className="flex items-center gap-6 font-mono shrink-0">
          <div className="flex flex-col items-end border-r border-border/60 pr-6">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Tipe Entity</span>
            <span className="text-2xl font-bold text-foreground">{totalEntities}</span>
          </div>
          <div className="flex flex-col items-end border-r border-border/60 pr-6">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Rekord Terdaftar</span>
            <span className="text-2xl font-bold text-foreground">{totalDataCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Terakhir Sinkronisasi</span>
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-1">
              <RefreshCw className="size-3 text-emerald-500 animate-spin-slow" />
              {lastUpdate}
            </span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TABS SWITCHER (Microsoft Azure / Palantir inspired) */}
      <div className="border-b border-border/50 flex items-center gap-1 overflow-x-auto select-none no-scrollbar pb-px">
        {entities.map((ent) => {
          const Icon = ent.icon;
          const isActive = activeEntity === ent.id;
          return (
            <button
              key={ent.id}
              type="button"
              onClick={() => {
                setActiveEntity(ent.id as any);
              }}
              className={cn(
                "px-4 py-2.5 text-xs font-mono font-bold flex items-center gap-2 border-b-2 tracking-wide cursor-pointer transition-all focus:outline-none whitespace-nowrap",
                isActive
                  ? "border-[#14B8FF] text-cyan-600 dark:text-[#14B8FF] bg-secondary/30 dark:bg-white/[0.01]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20 dark:hover:bg-white/[0.01]",
              )}
            >
              <Icon className="size-3.5" />
              <span>{ent.label}</span>
              {ent.id === "category" && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-foreground font-mono">
                  {categories.length}
                </span>
              )}
              {ent.id === "occupation" && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-foreground font-mono">
                  {occupations.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ALERTS */}
      {error && (
        <Alert className="border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 rounded-[8px]">
          <AlertCircle className="size-4" />
          <AlertTitle className="font-mono text-xs uppercase">Perlu perhatian</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-[8px]">
          <CheckCircle2 className="size-4" />
          <AlertTitle className="font-mono text-xs uppercase">Sukses</AlertTitle>
          <AlertDescription className="text-xs">{success}</AlertDescription>
        </Alert>
      )}

      {/* WORKSPACE DATA CARD */}
      <Card className="border-border bg-card rounded-[14px] overflow-hidden shadow-sm flex flex-col">
        {/* INTERACTIVE WORKSPACE TOOLBAR */}
        <div className="p-4 border-b border-border/40 bg-secondary/15 dark:bg-slate-950/10 flex flex-col md:flex-row items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3 w-full md:flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/50" />
              <Input
                className="pl-9 rounded-[6px] border-border bg-background dark:bg-slate-900/40 text-xs focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/45 text-foreground"
                placeholder={`Cari nama, kode, atau deskripsi ${entityLabel(activeEntity).toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground/60" />
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                <SelectTrigger className="w-[125px] h-8 border-border bg-background dark:bg-slate-900/40 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-[6px] border-border text-muted-foreground hover:bg-secondary/40 cursor-pointer"
              onClick={() => void handleRefresh()}
              disabled={busyKey === "load" || busyKey === "load-categories" || busyKey === "load-occupations"}
            >
              <RefreshCw className="mr-2 size-3.5" /> Muat Ulang
            </Button>

            <Button
              className="h-8 rounded-[6px] bg-[#14B8FF] text-white dark:text-slate-950 font-bold hover:bg-cyan-400 cursor-pointer text-xs"
              onClick={startCreate}
            >
              <Plus className="mr-1.5 size-3.5" /> Tambah Data
            </Button>
          </div>
        </div>

        {/* WORKSPACE DATA LIST TABLE */}
        <CardContent className="p-0 min-h-[350px]">
          {busyKey === "load" || busyKey === "load-categories" || busyKey === "load-occupations" ? (
            <div className="p-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border border-border/60 bg-secondary/10 rounded-[8px] animate-pulse"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted/65 rounded w-1/2" />
                    </div>
                    <div className="h-6 bg-muted rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="p-8">
              <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-[12px] bg-secondary/10 dark:bg-slate-900/5">
                <div className="size-12 rounded-full bg-secondary border border-border flex items-center justify-center mb-4">
                  {activeEntity === "category" && <Tags className="size-6 text-muted-foreground/50" />}
                  {activeEntity === "occupation" && <BriefcaseBusiness className="size-6 text-muted-foreground/50" />}
                </div>
                <h3 className="text-sm font-semibold text-foreground font-mono uppercase tracking-wider">
                  Belum ada data
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs font-sans">
                  Tambahkan data pertama untuk mulai menggunakan modul ini.
                </p>
                <Button
                  onClick={startCreate}
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-[6px] border-[#14B8FF]/20 text-[#14B8FF] hover:bg-[#14B8FF]/10"
                >
                  <Plus className="mr-2 size-3.5" /> Tambah Data
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto relative">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 dark:bg-slate-950/40 text-muted-foreground uppercase text-[10px] tracking-wider select-none sticky top-0 z-20">
                    <th className="p-4 w-10 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-[4px] border-border"
                      />
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="p-4 font-bold cursor-pointer hover:text-foreground transition-colors"
                    >
                      Nama {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="p-4 font-bold">Deskripsi</th>
                    <th
                      onClick={() => handleSort("isActive")}
                      className="p-4 font-bold cursor-pointer hover:text-foreground transition-colors text-center w-28"
                    >
                      Status {sortField === "isActive" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="p-4 font-bold text-center w-28">Last Update</th>
                    <th className="p-4 font-bold text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedItems.map((item) => {
                    const count = usageCount(item, activeEntity);
                    const usageLabel = activeEntity === "category" ? `${count} laporan` : `${count} jaring`;
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "hover:bg-secondary/20 dark:hover:bg-white/[0.02] transition-colors group",
                          isSelected && "bg-cyan-500/5 dark:bg-[#14B8FF]/5",
                        )}
                      >
                        <td className="p-4 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(item.id)}
                            className="rounded-[4px] border-border"
                          />
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          <div>
                            <span className="font-sans text-sm block font-bold text-foreground">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground/60">{item.code}</span>
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <span className="text-muted-foreground font-sans line-clamp-2">
                            {item.description || (
                              <span className="italic text-muted-foreground/30">Tidak ada deskripsi</span>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[9px] uppercase tracking-wider rounded-[4px] px-2 py-0.5",
                              item.isActive
                                ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-500 bg-emerald-500/5"
                                : "border-border dark:border-white/10 text-muted-foreground bg-secondary/40 dark:bg-white/[0.02]",
                            )}
                          >
                            {item.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="p-4 text-center text-muted-foreground/75">13-07-2026 17:15</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              title="Edit Data"
                              className="size-7 rounded-[4px] border border-border bg-background dark:bg-slate-900/50 flex items-center justify-center hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleStatus(item)}
                              disabled={busyKey === `toggle:${item.id}`}
                              title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                              className={cn(
                                "size-7 rounded-[4px] border border-border bg-background dark:bg-slate-900/50 flex items-center justify-center transition-all cursor-pointer text-muted-foreground hover:text-foreground",
                                item.isActive
                                  ? "hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400"
                                  : "hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400",
                              )}
                            >
                              <Power className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void softDelete(item)}
                              disabled={busyKey === `delete:${item.id}` || !item.isActive}
                              title="Nonaktifkan data"
                              className="size-7 rounded-[4px] border border-border bg-background dark:bg-slate-900/50 flex items-center justify-center hover:border-red-500/50 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* ENTERPRISE PAGINATION FOOTER */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-border/40 bg-secondary/15 dark:bg-slate-950/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono select-none">
            <div className="text-muted-foreground flex items-center gap-4">
              <div>
                Showing{" "}
                <span className="text-foreground font-semibold">
                  {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, totalItems)}
                </span>{" "}
                of <span className="text-foreground font-semibold">{totalItems}</span> records.
              </div>

              <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                <span>Rows per page:</span>
                <Select value={String(rowsPerPage)} onValueChange={(val) => setRowsPerPage(Number(val))}>
                  <SelectTrigger
                    size="sm"
                    className="w-[65px] border-border bg-background dark:bg-slate-900/40 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-[#14B8FF]/20"
                  >
                    <SelectValue placeholder={String(rowsPerPage)} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground min-w-[65px]">
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7 rounded-[4px] border-border bg-background dark:bg-slate-900/40 text-muted-foreground hover:bg-secondary/40"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = currentPage === pageNum;
                return (
                  <Button
                    key={pageNum}
                    variant="outline"
                    className={cn(
                      "size-7 rounded-[4px] border px-0 text-xs font-bold",
                      isCurrent
                        ? "border-cyan-500/30 dark:border-[#14B8FF]/30 bg-cyan-500/10 dark:bg-[#14B8FF]/10 text-cyan-600 dark:text-[#14B8FF]"
                        : "border-border bg-background dark:bg-slate-900/40 text-muted-foreground hover:bg-secondary/40",
                    )}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="icon"
                className="size-7 rounded-[4px] border-border bg-background dark:bg-slate-900/40 text-muted-foreground hover:bg-secondary/40"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* BULK ACTION FLOATING COMMAND BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B1220] text-white px-5 py-3 rounded-full shadow-lg border border-white/10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs font-mono font-bold text-[#14B8FF]">{selectedIds.length} item terpilih</span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => handleBulkStatus(true)}
              className="h-8 rounded-full text-xs font-bold"
            >
              Aktifkan
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={() => handleBulkStatus(false)}
              className="h-8 rounded-full text-xs font-bold"
            >
              Nonaktifkan
            </Button>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* DYNAMIC CONFIRMATION ALERT DIALOG */}
      {confirmDialog && <div aria-hidden="true" className="fixed inset-0 z-[2200] bg-black/10 backdrop-blur-xs" />}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent className="z-[2202] border-border bg-card max-w-sm rounded-[12px] p-5 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground font-sans tracking-tight">
              {confirmDialog?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground font-sans mt-2 leading-relaxed">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={() => setConfirmDialog(null)}
              className="rounded-[6px] border-border text-muted-foreground hover:bg-secondary text-xs"
            >
              Kembali
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmDialog?.actionVariant ?? "default"}
              onClick={() => {
                if (confirmDialog) {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }
              }}
              className="rounded-[6px] text-xs font-bold"
            >
              {confirmDialog?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CENTER MODAL DIALOG FOR TAMBAH/EDIT */}
      <Dialog
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelClick();
        }}
      >
        <DialogContent className="w-full sm:max-w-[480px] bg-card p-6 flex flex-col gap-6 border border-border shadow-lg rounded-xl">
          <DialogHeader className="border-b border-border/40 pb-4">
            <DialogTitle className="text-base font-bold text-foreground font-sans uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="size-5 text-[#14B8FF]" />
              {editingItem ? "Edit" : "Tambah"} {entityLabel(activeEntity, true)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Lengkapi formulir di bawah ini untuk menyimpan perubahan data referensi.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <Alert className="border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 rounded-[8px] py-2 px-3">
              <AlertCircle className="size-4 text-red-500" />
              <AlertDescription className="text-xs">{dialogError}</AlertDescription>
            </Alert>
          )}

          {/* Form Content */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="master-data-name"
                className={cn(
                  "text-[10px] uppercase font-mono tracking-wider font-bold",
                  formErrors.name ? "text-destructive" : "text-muted-foreground/60",
                )}
              >
                Nama {entityLabel(activeEntity)}
              </label>
              <Input
                id="master-data-name"
                ref={nameInputRef}
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? "master-data-name-error" : undefined}
                className={cn(
                  "rounded-[6px] bg-background dark:bg-slate-900/35 text-sm h-10",
                  formErrors.name
                    ? "border-destructive focus-visible:ring-1 focus-visible:ring-destructive focus-visible:border-destructive"
                    : "border-border focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30",
                )}
                placeholder={entityPlaceholder(activeEntity)}
                value={form.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, name: val }));
                  const isValid = validateMasterName(activeEntity, val) === null;
                  if (isValid) {
                    setFormErrors((errs) => ({ ...errs, name: undefined }));
                    setDialogError(null);
                  }
                }}
              />
              {formErrors.name && (
                <p id="master-data-name-error" className="text-[10px] text-destructive font-mono mt-0.5">
                  {formErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="master-data-description"
                className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/60 font-bold"
              >
                Deskripsi Referensi
              </label>
              <Textarea
                id="master-data-description"
                className="rounded-[6px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm min-h-[140px] resize-none"
                placeholder="Keterangan atau deskripsi mengenai data referensi ini..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Status Aktif Row */}
            <div className="flex items-center justify-between p-3 rounded-[8px] bg-secondary/30 dark:bg-slate-900/30 border border-border dark:border-white/[0.04]">
              <div className="space-y-0.5">
                <label htmlFor="master-data-active" className="text-xs font-mono font-bold text-foreground">
                  Status Aktif
                </label>
                <p className="text-[10px] text-muted-foreground">Menentukan ketersediaan referensi data.</p>
              </div>
              <button
                id="master-data-active"
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer border border-border dark:border-white/10",
                  form.isActive ? "bg-cyan-500" : "bg-secondary/80 dark:bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card transition-transform shadow-sm",
                    form.isActive ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="border-t border-border/40 pt-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              className="flex-1 rounded-[6px] border-border text-muted-foreground hover:bg-secondary/40 cursor-pointer h-10 text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-[6px] bg-[#14B8FF] text-white dark:text-slate-950 font-bold hover:bg-cyan-400 cursor-pointer h-10 text-xs"
              disabled={busyKey === "save"}
              onClick={saveEntity}
            >
              {busyKey === "save" ? "Memproses..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
