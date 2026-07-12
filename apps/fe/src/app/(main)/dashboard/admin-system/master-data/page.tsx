"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers3, Plus, Power, RefreshCw, Tags } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { JaringCluster, ReportCategory } from "@/server/field-ops/types";

type ClusterResponse = JaringCluster & {
  _count?: {
    jaring?: number;
  };
};

type CategoryResponse = ReportCategory & {
  _count?: {
    whatsAppMessages?: number;
  };
};

export default function AdminMasterDataPage() {
  const [clusters, setClusters] = useState<JaringCluster[]>([]);
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const activeCount = useMemo(() => clusters.filter((cluster) => cluster.isActive).length, [clusters]);
  const activeCategoryCount = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  );

  const loadClusters = async () => {
    try {
      setBusyKey("load");
      const response = await fetch("/api/admin-system/master-data/jaring-clusters", { cache: "no-store" });
      const body = (await response.json()) as ClusterResponse[] | { message?: string };

      if (!response.ok) {
        throw new Error("message" in body ? body.message : "Gagal memuat cluster Jaring.");
      }

      setClusters(
        (body as ClusterResponse[]).map((cluster) => ({
          id: cluster.id,
          code: cluster.code,
          name: cluster.name,
          description: cluster.description ?? null,
          isActive: cluster.isActive,
          jaringCount: cluster._count?.jaring ?? cluster.jaringCount ?? 0,
        })),
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat cluster Jaring.");
    } finally {
      setBusyKey(null);
    }
  };

  const loadCategories = async () => {
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat kategori laporan.");
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    void loadClusters();
    void loadCategories();
  }, []);

  const createCluster = async () => {
    const name = form.name.trim();

    if (name.length < 2) {
      setError("Nama cluster minimal 2 karakter.");
      return;
    }

    try {
      setBusyKey("create");
      const response = await fetch("/api/admin-system/master-data/jaring-clusters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: form.description.trim() || undefined,
        }),
      });

      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Gagal membuat cluster Jaring.");
      }

      setForm({ name: "", description: "" });
      await loadClusters();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat cluster Jaring.");
    } finally {
      setBusyKey(null);
    }
  };

  const createCategory = async () => {
    const name = categoryForm.name.trim();

    if (name.length < 2) {
      setError("Nama kategori minimal 2 karakter.");
      return;
    }

    try {
      setBusyKey("create-category");
      const response = await fetch("/api/admin-system/master-data/report-categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: categoryForm.description.trim() || undefined,
        }),
      });

      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Gagal membuat kategori laporan.");
      }

      setCategoryForm({ name: "", description: "" });
      await loadCategories();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat kategori laporan.");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleCluster = async (cluster: JaringCluster) => {
    try {
      setBusyKey(`toggle:${cluster.id}`);
      const response = await fetch(`/api/admin-system/master-data/jaring-clusters/${cluster.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !cluster.isActive }),
      });

      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Gagal memperbarui cluster Jaring.");
      }

      await loadClusters();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Gagal memperbarui cluster Jaring.");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleCategory = async (category: ReportCategory) => {
    try {
      setBusyKey(`toggle-category:${category.id}`);
      const response = await fetch(`/api/admin-system/master-data/report-categories/${category.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Gagal memperbarui kategori laporan.");
      }

      await loadCategories();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Gagal memperbarui kategori laporan.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="border-white/10 bg-[var(--dc-surface)] text-[var(--dc-text-primary)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-cyan-400/15 text-cyan-100">Master Data</Badge>
            <Badge variant="outline" className="border-white/15 text-white/70">
              {activeCount} cluster aktif
            </Badge>
            <Badge variant="outline" className="border-white/15 text-white/70">
              {activeCategoryCount} kategori aktif
            </Badge>
          </div>
          <CardTitle>Master Data Jaring & Laporan</CardTitle>
          <CardDescription className="text-white/65">
            Kelola kelompok jaring dan kategori laporan yang dipakai pada verifikasi Field Officer.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Alert className="border-amber-400/25 bg-amber-500/10 text-amber-50">
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Tambah Cluster
            </CardTitle>
            <CardDescription className="text-white/65">
              Cluster aktif akan tersedia di form pendaftaran jaring Field Officer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nama cluster, contoh: Mahasiswa"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Textarea
              placeholder="Deskripsi opsional"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            <Button
              className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              disabled={busyKey === "create"}
              onClick={() => void createCluster()}
            >
              <Plus className="mr-2 size-4" />
              Simpan Cluster
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers3 className="size-5" />
                  Daftar Cluster
                </CardTitle>
                <CardDescription className="text-white/65">
                  Cluster nonaktif tidak bisa dipilih untuk jaring baru, tetapi tetap menempel di data lama.
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={() => void loadClusters()} disabled={busyKey === "load"}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {clusters.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/15 p-4 text-sm text-white/65">
                Belum ada cluster Jaring.
              </div>
            ) : null}
            {clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/15 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{cluster.name}</h3>
                    <Badge className={cluster.isActive ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-white/60"}>
                      {cluster.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Badge variant="outline" className="border-white/15 text-white/65">
                      {cluster.jaringCount ?? 0} jaring
                    </Badge>
                  </div>
                  <p className="text-sm text-white/55">{cluster.code}</p>
                  {cluster.description ? <p className="mt-1 text-sm text-white/65">{cluster.description}</p> : null}
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 border-white/15 bg-transparent text-white hover:bg-white/10"
                  disabled={busyKey === `toggle:${cluster.id}`}
                  onClick={() => void toggleCluster(cluster)}
                >
                  {cluster.isActive ? <Power className="mr-2 size-4" /> : <CheckCircle2 className="mr-2 size-4" />}
                  {cluster.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Tambah Kategori Laporan
            </CardTitle>
            <CardDescription className="text-white/65">
              Kategori aktif tersedia saat Field Officer memverifikasi laporan masuk dari Jaring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nama kategori, contoh: Keamanan Kampus"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Textarea
              placeholder="Deskripsi opsional"
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
            />
            <Button
              className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              disabled={busyKey === "create-category"}
              onClick={() => void createCategory()}
            >
              <Plus className="mr-2 size-4" />
              Simpan Kategori
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="size-5" />
                  Daftar Kategori Laporan
                </CardTitle>
                <CardDescription className="text-white/65">
                  Kategori nonaktif tetap melekat pada laporan lama, tetapi tidak bisa dipilih untuk laporan baru.
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={() => void loadCategories()} disabled={busyKey === "load-categories"}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/15 p-4 text-sm text-white/65">
                Belum ada kategori laporan.
              </div>
            ) : null}
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/15 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    <Badge className={category.isActive ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-white/60"}>
                      {category.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Badge variant="outline" className="border-white/15 text-white/65">
                      {category.messageCount ?? 0} laporan
                    </Badge>
                  </div>
                  <p className="text-sm text-white/55">{category.code}</p>
                  {category.description ? <p className="mt-1 text-sm text-white/65">{category.description}</p> : null}
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 border-white/15 bg-transparent text-white hover:bg-white/10"
                  disabled={busyKey === `toggle-category:${category.id}`}
                  onClick={() => void toggleCategory(category)}
                >
                  {category.isActive ? <Power className="mr-2 size-4" /> : <CheckCircle2 className="mr-2 size-4" />}
                  {category.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
