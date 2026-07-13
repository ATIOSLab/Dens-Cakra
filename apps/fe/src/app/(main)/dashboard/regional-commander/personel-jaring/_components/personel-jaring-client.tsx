"use client";

import { useMemo, useState } from "react";

import { Building2, MapPin, Network, Radio, Search, ShieldCheck, UserRoundCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function locationByAssignment(value: unknown) {
  const map = new Map<string, DataRecord>();
  for (const feature of list(record(value).features)) {
    const properties = record(feature.properties);
    const assignmentId = text(properties.assignmentId, "");
    if (assignmentId) map.set(assignmentId, { ...properties, geometry: feature.geometry });
  }
  return map;
}

function areaLabels(assignment: DataRecord) {
  const labels = list(assignment.areaScopes)
    .map((scope) => text(record(scope.area).name, ""))
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "Wilayah belum ditetapkan";
}

function formatTime(value: unknown) {
  if (typeof value !== "string") return "Belum ada ping lokasi";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Waktu tidak valid"
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PersonelJaringClient({ network, locations }: { network: unknown; locations: unknown }) {
  const payload = record(network);
  const command = record(payload.command);
  const assignments = list(payload.assignments).filter(
    (assignment) => text(assignment.id, "") !== text(command.assignmentId, ""),
  );
  const jaring = list(payload.jaring);
  const locationMap = useMemo(() => locationByAssignment(locations), [locations]);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");

  const visibleAssignments = assignments.filter((assignment) => {
    const profile = record(assignment.userProfile);
    const position = record(assignment.position);
    const unit = record(position.organizationUnit);
    return [profile.fullName, profile.username, position.title, unit.name, areaLabels(assignment)]
      .map((value) => text(value, "").toLocaleLowerCase("id-ID"))
      .some((value) => value.includes(normalizedSearch));
  });
  const visibleJaring = jaring.filter((item) => {
    const cluster = record(item.cluster);
    return [item.code, item.aliasName, cluster.name]
      .map((value) => text(value, "").toLocaleLowerCase("id-ID"))
      .some((value) => value.includes(normalizedSearch));
  });
  const unitCount = new Set(assignments.map((item) => text(record(record(item.position).organizationUnit).id, "")))
    .size;
  const liveCount = assignments.filter((item) => Boolean(locationMap.get(text(item.id, ""))?.hasLiveLocation)).length;
  const activeJaring = jaring.filter((item) => item.status === "ACTIVE").length;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="border-b pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Need-to-know command scope
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold">Personel, Organisasi & Jaring</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Seluruh data di bawah berasal dari assignment aktif yang berada dalam rantai komando Anda. Lokasi stealth
          tidak ditampilkan.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan command network">
        {[
          { label: "Personel bawahan", value: assignments.length, icon: Users },
          { label: "Unit organisasi", value: unitCount, icon: Building2 },
          { label: "Lokasi aktual tersedia", value: liveCount, icon: Radio },
          { label: "Jaring aktif", value: activeJaring, icon: Network },
        ].map((metric) => (
          <Card key={metric.label} size="sm">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{metric.value}</p>
              </div>
              <metric.icon className="size-5 text-primary" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari personel, unit, wilayah, atau jaring"
          aria-label="Cari command network"
        />
      </div>

      <Tabs defaultValue="personnel">
        <TabsList>
          <TabsTrigger value="personnel">Personel & organisasi ({visibleAssignments.length})</TabsTrigger>
          <TabsTrigger value="jaring">Jaring ({visibleJaring.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="personnel" className="mt-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleAssignments.map((assignment) => {
              const profile = record(assignment.userProfile);
              const position = record(assignment.position);
              const unit = record(position.organizationUnit);
              const role = record(position.role);
              const location = locationMap.get(text(assignment.id, ""));
              const hasLiveLocation = Boolean(location?.hasLiveLocation);
              return (
                <Card key={text(assignment.id)} size="sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{text(profile.fullName, text(profile.username, "Personel tanpa nama"))}</CardTitle>
                        <CardDescription className="mt-1">
                          {text(position.title)} / {text(unit.name)}
                        </CardDescription>
                      </div>
                      <Badge variant={hasLiveLocation ? "default" : "secondary"}>
                        {hasLiveLocation ? "Lokasi aktual" : "Centroid wilayah"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Peran & seat</p>
                      <p className="mt-1">
                        {text(role.name)} / <span className="font-mono">{text(position.seatCode)}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wilayah tugas</p>
                      <p className="mt-1">{areaLabels(assignment)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> Pembaruan posisi
                      </p>
                      <p className="mt-1">{formatTime(location?.capturedAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!visibleAssignments.length ? (
              <EmptyState label="Tidak ada personel yang cocok dalam hierarki komando." />
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="jaring" className="mt-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleJaring.map((item) => {
              const cluster = record(item.cluster);
              const caretakers = list(item.caretakerAssignments);
              const coverage = list(item.areaCoverages);
              const counts = record(item._count);
              const officer = record(record(record(caretakers[0]).fieldOfficerAssignment).userProfile);
              return (
                <Card key={text(item.id)} size="sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{text(item.aliasName, "Alias terlindungi")}</CardTitle>
                        <CardDescription className="mt-1 font-mono">
                          {text(item.code)} / {text(cluster.name)}
                        </CardDescription>
                      </div>
                      <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>{text(item.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRoundCheck className="size-3" /> Handler aktif
                      </p>
                      <p className="mt-1">{text(officer.fullName, "Belum ditetapkan")}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="size-3" /> Bukti HUMINT
                      </p>
                      <p className="mt-1">
                        {Number(counts.messages ?? 0)} pesan / {Number(counts.primaryBakets ?? 0)} Baket
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Coverage aktif</p>
                      <p className="mt-1">
                        {coverage
                          .map((entry) => text(record(entry.area).name, ""))
                          .filter(Boolean)
                          .join(", ") || "Belum ditetapkan"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!visibleJaring.length ? <EmptyState label="Tidak ada Jaring yang cocok dalam hierarki komando." /> : null}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="py-12 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
