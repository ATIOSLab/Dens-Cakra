"use client";

import { useMemo, useState } from "react";

import { Activity, AlertTriangle, Gauge, Search, ShieldCheck, Target, UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "Belum tersedia") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numeric(value: unknown): number | null {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

function scoreLabel(value: unknown) {
  const score = numeric(value);
  return score === null ? "Belum cukup bukti" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function gradeVariant(value: unknown): "default" | "secondary" | "destructive" | "outline" {
  const grade = text(value, "N/A");
  if (grade === "A" || grade === "B") return "default";
  if (grade === "D") return "destructive";
  return grade === "N/A" ? "outline" : "secondary";
}

function formatPeriod(value: DataRecord) {
  const from = typeof value.from === "string" ? new Date(value.from) : null;
  const to = typeof value.to === "string" ? new Date(value.to) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Periode tidak tersedia";
  const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  return `${formatter.format(from)} sampai ${formatter.format(to)}`;
}

export function KpiEngineClient({ data, mode }: { data: unknown; mode: "regional" | "national" }) {
  const payload = record(data);
  const summary = record(payload.summary);
  const evidence = record(summary.evidence);
  const definitions = list(payload.indicatorDefinitions);
  const summaryIndicators = list(summary.indicators);
  const definitionsByCode = useMemo(
    () => new Map(definitions.map((item) => [text(item.code, ""), item])),
    [definitions],
  );
  const units = list(payload.units);
  const personnel = list(payload.personnel);
  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map((item) => text(item))
    : [];
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("id-ID");
  const filteredUnits = units.filter((unit) =>
    [unit.name, unit.code, unit.type].some((value) => text(value, "").toLocaleLowerCase("id-ID").includes(query)),
  );
  const filteredPersonnel = personnel.filter((person) => {
    const unit = record(person.unit);
    const areas = list(person.areas).map((area) => area.name);
    return [person.name, person.position, unit.name, ...areas].some((value) =>
      text(value, "").toLocaleLowerCase("id-ID").includes(query),
    );
  });

  return (
    <main className="mx-auto w-full max-w-[1700px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Evaluasi kinerja / kualitas HUMINT
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">DENS CAKRA KPI Engine</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Produktivitas dinilai dari ketepatan waktu, kualitas, validitas, dampak strategis, dan respons UUK/STR;
            bukan jumlah laporan saja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{mode === "national" ? "Scope nasional" : "Scope komando regional"}</Badge>
          <Badge variant="secondary">{formatPeriod(record(payload.period))}</Badge>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Skor terukur" value={scoreLabel(summary.score)} icon={Gauge} />
        <MetricCard
          label="Grade"
          value={text(summary.grade, "N/A")}
          icon={ShieldCheck}
          variant={gradeVariant(summary.grade)}
        />
        <MetricCard label="Personel dinilai" value={personnel.length.toLocaleString("id-ID")} icon={UserRoundCheck} />
        <MetricCard
          label="Bukti laporan / tugas"
          value={`${Number(evidence.reports ?? 0)} / ${Number(evidence.tasks ?? 0)}`}
          icon={Activity}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-5" aria-label="Indikator KPI">
        {summaryIndicators.map((indicator) => {
          const definition = definitionsByCode.get(text(indicator.code, "")) ?? {};
          const score = numeric(indicator.score);
          return (
            <Card key={text(indicator.code)} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{text(indicator.code)}</Badge>
                  <span className="font-mono text-lg font-semibold">{scoreLabel(score)}</span>
                </div>
                <CardTitle className="text-sm">{text(definition.name)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={score ?? 0} aria-label={`Skor ${text(indicator.code)}`} />
                <p className="mt-2 text-xs text-muted-foreground">Sampel: {Number(indicator.sample ?? 0)}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Hierarki KPI terintegrasi</CardTitle>
                <CardDescription>Nasional / BINDA / Kabupaten-Kota / Kecamatan / Unit / Personel</CardDescription>
              </div>
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari unit, personel, atau wilayah"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="units">
              <TabsList>
                <TabsTrigger value="units">Unit ({filteredUnits.length})</TabsTrigger>
                <TabsTrigger value="personnel">Personel ({filteredPersonnel.length})</TabsTrigger>
                <TabsTrigger value="method">Metodologi</TabsTrigger>
              </TabsList>
              <TabsContent value="units" className="mt-4 space-y-2">
                {filteredUnits.map((unit, index) => (
                  <ScoreRow
                    key={text(unit.id)}
                    rank={index + 1}
                    title={text(unit.name)}
                    subtitle={`${Number(unit.personnelCount ?? 0)} personel / ${text(unit.type)}`}
                    item={unit}
                  />
                ))}
                {!filteredUnits.length ? <Empty label="Tidak ada unit yang cocok." /> : null}
              </TabsContent>
              <TabsContent value="personnel" className="mt-4 space-y-2">
                {filteredPersonnel.map((person, index) => {
                  const unit = record(person.unit);
                  const areas = list(person.areas)
                    .map((area) => text(area.name, ""))
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <ScoreRow
                      key={text(person.id)}
                      rank={index + 1}
                      title={text(person.name)}
                      subtitle={`${text(person.position)} / ${text(unit.name)} / ${areas || "Wilayah belum ditetapkan"}`}
                      item={person}
                    />
                  );
                })}
                {!filteredPersonnel.length ? <Empty label="Tidak ada personel yang cocok." /> : null}
              </TabsContent>
              <TabsContent value="method" className="mt-4 grid gap-3 md:grid-cols-2">
                {definitions.map((definition) => (
                  <div key={text(definition.code)} className="rounded-md border p-3">
                    <p className="font-medium">
                      {text(definition.code)} / {text(definition.name)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{text(definition.evidence)}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" /> Saran taktis / strategis
              </CardTitle>
              <CardDescription>Prioritas pembinaan berdasarkan indikator dan bukti terendah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div key={recommendation} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs text-primary">
                    {index + 1}
                  </span>
                  <p className="leading-6">{recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" /> Kualitas bukti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <EvidenceRow label="Baket periode" value={evidence.reports} />
              <EvidenceRow label="Verifikasi formal" value={evidence.verifications} />
              <EvidenceRow label="Tugas UUK/STR" value={evidence.tasks} />
              <EvidenceRow label="Indikator terukur" value={`${Number(evidence.measuredIndicators ?? 0)} / 5`} />
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Skor kosong tidak diubah menjadi nol. Pimpinan dapat membedakan kinerja rendah dari bukti yang belum
                cukup.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "outline",
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
        </div>
        <Badge variant={variant} className="size-9 justify-center p-0">
          <Icon className="size-4" />
        </Badge>
      </CardContent>
    </Card>
  );
}

function ScoreRow({
  rank,
  title,
  subtitle,
  item,
}: {
  rank: number;
  title: string;
  subtitle: string;
  item: DataRecord;
}) {
  const score = numeric(item.score);
  return (
    <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[40px_minmax(0,1fr)_120px] sm:items-center">
      <span className="font-mono text-sm text-muted-foreground">{rank.toString().padStart(2, "0")}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="sm:text-right">
        <Badge variant={gradeVariant(item.grade)}>Grade {text(item.grade, "N/A")}</Badge>
        <p className="mt-1 font-mono text-lg font-semibold">{scoreLabel(score)}</p>
      </div>
    </div>
  );
}

function EvidenceRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{String(value ?? 0)}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">{label}</div>;
}
