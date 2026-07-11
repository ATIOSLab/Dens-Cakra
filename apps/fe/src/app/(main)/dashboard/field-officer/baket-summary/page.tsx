"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BaketSummaryDraft {
  id: string;
  sourceRef?: string;
  title?: string;
  area?: string;
  summaryHtml?: string;
}

interface NativeCKEditor {
  getData: () => string;
  setData: (data: string) => void;
  destroy: () => Promise<void>;
  model: {
    document: {
      on: (event: "change:data", callback: () => void) => void;
    };
  };
}

interface ClassicEditorBuild {
  create: (element: HTMLElement, config?: { initialData?: string }) => Promise<NativeCKEditor>;
}

function getActiveFieldOfficerId() {
  if (typeof window === "undefined") return "fo-bangkinang-001";

  return (
    window.sessionStorage.getItem("dens-cakra-field-officer-id") ||
    new URLSearchParams(window.location.search).get("fieldOfficerId") ||
    "fo-bangkinang-001"
  );
}

async function fieldOfficerApi<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-field-officer-id", getActiveFieldOfficerId());

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Request gagal (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export default function FieldOfficerBaketSummaryPage() {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<NativeCKEditor | null>(null);
  const [baketId, setBaketId] = useState("");
  const [draft, setDraft] = useState<BaketSummaryDraft | null>(null);
  const [summaryHtml, setSummaryHtml] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const id = new URLSearchParams(window.location.search).get("id") || "";
    setBaketId(id);
    if (!id) return;

    const storedDraft = window.localStorage.getItem(`field-officer-baket-draft:${id}`);
    if (!storedDraft) {
      setDraft({ id, title: `BAKET ${id}` });
      return;
    }

    try {
      const parsed = JSON.parse(storedDraft) as BaketSummaryDraft;
      setDraft(parsed);
      setSummaryHtml(parsed.summaryHtml || "");
    } catch {
      setDraft({ id, title: `BAKET ${id}` });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let editor: NativeCKEditor | null = null;

    async function loadEditor() {
      if (!editorHostRef.current) return;

      const editorBuild = await import("@ckeditor/ckeditor5-build-classic");
      const ClassicEditor = editorBuild.default as ClassicEditorBuild;
      editor = await ClassicEditor.create(editorHostRef.current, {
        initialData: summaryHtml,
      });

      if (!mounted) return;
      editorRef.current = editor;
      editor.model.document.on("change:data", () => {
        setSummaryHtml(editor?.getData() || "");
      });
      setEditorReady(true);
    }

    loadEditor();

    return () => {
      mounted = false;
      editorRef.current = null;
      void editor?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.getData() === summaryHtml) return;
    editorRef.current.setData(summaryHtml);
  }, [summaryHtml]);

  const saveSummary = async () => {
    if (!draft?.id) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await fieldOfficerApi<{ id: string; summaryHtml?: string; summaryUpdatedAt?: string }>(
        `/api/field-officer/baket/${encodeURIComponent(draft.id)}/summary`,
        {
          method: "PATCH",
          body: JSON.stringify({ summaryHtml }),
        },
      );
      const payload = {
        id: updated.id,
        summaryHtml: updated.summaryHtml || summaryHtml,
        savedAt: updated.summaryUpdatedAt || new Date().toISOString(),
      };

      window.localStorage.setItem(`field-officer-baket-summary:${draft.id}`, JSON.stringify(payload));
      setSavedAt(payload.savedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan summary BAKET");
    } finally {
      setSaving(false);
    }
  };

  const canSave = summaryHtml.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-3 border-slate-800 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-cyan-300 text-xs uppercase tracking-widest">Field Officer BAKET</p>
            <h1 className="mt-1 font-bold text-2xl text-slate-50">Add Summary</h1>
            <p className="mt-1 text-slate-400 text-sm">
              Summary ini wajib disimpan sebelum BAKET bisa disubmit ke Field Coordinator.
            </p>
          </div>
          <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => window.close()}>
            <X className="size-4" />
            Tutup
          </Button>
        </header>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold font-mono text-cyan-300 text-xs">{draft?.id || baketId || "BAKET"}</span>
                {draft?.sourceRef && (
                  <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-400 uppercase tracking-widest">
                    {draft.sourceRef}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-semibold text-slate-50 text-lg">{draft?.title || "Draft BAKET"}</h2>
              <p className="mt-1 text-slate-400 text-sm">{draft?.area || "Area belum tersedia"}</p>
            </div>
            {savedAt && (
              <span className="inline-flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 text-xs uppercase tracking-widest">
                <CheckCircle2 className="size-4" />
                Tersimpan
              </span>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 border-slate-800 border-b p-4">
            <FileText className="size-4 text-cyan-300" />
            <h2 className="font-bold text-slate-100 text-sm uppercase tracking-widest">Summary Editor</h2>
          </div>
          <div className="bg-slate-50 p-3 text-slate-950">
            <div ref={editorHostRef} className="min-h-72" />
            {!editorReady && <div className="flex min-h-72 items-center justify-center text-slate-500">Memuat CKEditor5...</div>}
          </div>
          {error && <div className="border-red-400/40 border-t bg-red-500/10 p-4 text-red-100 text-sm">{error}</div>}
          <div className="flex flex-col gap-2 border-slate-800 border-t bg-slate-950/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-400 text-sm">
              Setelah disimpan, kembali ke dashboard BAKET. Tombol Submit akan aktif otomatis.
            </p>
            <Button className="gap-2 bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300" onClick={saveSummary} disabled={!canSave || saving}>
              <Save className="size-4" />
              {saving ? "Saving..." : "Save Summary"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
