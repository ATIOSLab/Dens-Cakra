"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Cpu } from "lucide-react";
import { toast } from "sonner";
import { ZodError } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { directiveEditSchema, directiveWizardSchema } from "@/features/directives/schemas";
import {
  buildStructuredDirectiveUukSections,
  countFilledStructuredSections,
  parseDirectiveCommandDescription,
  type StructuredDirectiveUukSection,
  serializeDirectiveCommandDescription,
} from "@/features/directives/structured-uuk";
import type {
  AccessContextResource,
  DirectiveDetail,
  DirectiveRecipientInput,
  ProvinceBoundaryCollection,
  ProvinceOption,
  RegionalAssignmentOption,
  RegionalMasterDirectorate,
  RegionalMasterOverview,
} from "@/features/directives/types";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { ApiClientError } from "@/lib/api/errors";

import { deriveDirectiveRecipients, deriveRegionalRecipientPreview } from "./directive-distribution";
import { getCurrentVersion, normalizeProvinceSelection } from "./directive-shared";
import { ProvinceMapSelector } from "./province-map-selector";

type DirectiveTargetMode = "all" | "binda" | "directorate";

type DirectiveRecipientPreviewRow = {
  key: string;
  scopeLabel: string;
  scopeCode: string;
  targetLabel: string | null;
  targetSubLabel: string | null;
  targetKind: string;
  coverageNames: string[];
  targetUnitId?: string;
  targetPositionId?: string;
  missing?: boolean;
};

type GeneratedDirectiveDraft = {
  title: string;
  strategicIssue: string;
  commandNarrative: string;
  sections: Record<string, string>;
};

function buildGeneratedDirectiveDraft(input: {
  title: string;
  focus: string;
  area: string;
  actor: string;
  indicator: string;
  method: string;
}): GeneratedDirectiveDraft {
  return {
    title: input.title,
    strategicIssue: `${input.focus} di ${input.area} memerlukan penguatan pengumpulan informasi, validasi indikator, dan koordinasi lintas penerima STR.`,
    commandNarrative: `Laksanakan pendalaman terhadap ${input.actor}, petakan ${input.indicator}, dan susun laporan perkembangan yang dapat langsung ditindaklanjuti oleh rantai komando.`,
    sections: {
      BASIS_BACKGROUND: `Dasar pelaksanaan adalah kebutuhan pembaruan gambaran situasi terkait ${input.focus} pada ${input.area}.`,
      INVESTIGATION_TARGETS: `Sasaran penyelidikan meliputi ${input.actor}, lokasi terkait, pola aktivitas, dan pihak yang berperan sebagai penghubung.`,
      EEI_PIR: `EEI/PIR: identitas aktor kunci, pola komunikasi, titik aktivitas, sumber dukungan, waktu kejadian, serta ${input.indicator}.`,
      COLLECTION_PLAN: `Pengumpulan dilakukan melalui ${input.method}, validasi silang sumber, pemetaan lokasi, dan kompilasi laporan periodik.`,
      THREAT_RISK_ANALYSIS: `Risiko yang perlu dimonitor mencakup perubahan pola aktivitas, pengalihan jalur, disinformasi, dan eskalasi terbatas.`,
      IMPLEMENTATION_MECHANISM:
        "Penerima STR menetapkan sektor pantau, PIC pelaporan, ritme update, dan mekanisme eskalasi saat ditemukan indikator kritis.",
      COORDINATION_REPORTING:
        "Koordinasi menggunakan kanal resmi. Laporan ringkas memuat kronologi, aktor, lokasi, bukti pendukung, analisis awal, dan rekomendasi.",
      RECOMMENDATION: `Prioritaskan pendalaman pada simpul berisiko tinggi, perbarui matriks indikator, dan siapkan opsi mitigasi untuk ${input.area}.`,
      AUTHENTICATION:
        "Draft ini digunakan sebagai dasar operasional awal dan dapat diperbarui setelah evaluasi pimpinan.",
    },
  };
}

const GENERATED_DIRECTIVE_DRAFTS: GeneratedDirectiveDraft[] = [
  {
    title: "Penguatan Operasi Intelijen Terpadu Wilayah Aceh",
    strategicIssue:
      "Peningkatan dinamika sosial, perlintasan orang/barang, dan potensi konsolidasi jaringan lokal di wilayah Aceh memerlukan penguatan deteksi dini lintas satuan.",
    commandNarrative:
      "Laksanakan pengumpulan bahan keterangan secara terarah pada simpul wilayah prioritas, lakukan validasi berlapis terhadap temuan lapangan, dan laporkan perkembangan signifikan melalui jalur komando yang berlaku.",
    sections: {
      BASIS_BACKGROUND:
        "Dasar pelaksanaan mengacu pada kebutuhan penguatan deteksi dini dan pemetaan aktor, lokasi, serta pola aktivitas yang berpotensi memengaruhi stabilitas wilayah.",
      INVESTIGATION_TARGETS:
        "Sasaran penyelidikan meliputi simpul komunikasi, jalur mobilitas, titik konsentrasi kegiatan, serta aktor penghubung yang berpengaruh pada dinamika lokal.",
      EEI_PIR:
        "EEI/PIR: identitas aktor utama, pola komunikasi, sumber dukungan, wilayah operasi, rencana kegiatan, serta indikator eskalasi yang perlu dimonitor harian.",
      COLLECTION_PLAN:
        "Pengumpulan dilakukan melalui observasi terbatas, pendalaman jaringan, verifikasi silang sumber, dan kompilasi laporan periodik dari satuan kewilayahan.",
      THREAT_RISK_ANALYSIS:
        "Risiko utama mencakup disinformasi, mobilisasi massa terbatas, perpindahan logistik, dan resistensi terhadap kegiatan pemantauan resmi.",
      IMPLEMENTATION_MECHANISM:
        "Pelaksanaan dikoordinasikan oleh penerima STR dengan pembagian sektor wilayah, penetapan PIC, dan ritme laporan perkembangan minimal setiap 24 jam.",
      COORDINATION_REPORTING:
        "Koordinasi dilakukan melalui kanal resmi. Laporan awal disampaikan setelah validasi lapangan, sedangkan laporan insidental dikirim segera saat ditemukan indikator kritis.",
      RECOMMENDATION:
        "Rekomendasikan peningkatan monitoring pada area prioritas, pendalaman sumber lokal, dan penyusunan matriks risiko per kabupaten/kota.",
      AUTHENTICATION:
        "Dokumen ini menjadi dasar pelaksanaan sementara sampai terdapat direktif lanjutan atau pembaruan hasil evaluasi pimpinan.",
    },
  },
  {
    title: "STR Pemantauan Kerawanan dan Jalur Distribusi Strategis",
    strategicIssue:
      "Terdapat kebutuhan pemetaan ulang terhadap jalur distribusi strategis dan titik rawan yang berpotensi dimanfaatkan untuk aktivitas tertutup.",
    commandNarrative:
      "Fokuskan operasi pada pemetaan jalur, aktor pendukung, dan titik temu yang memiliki relevansi dengan potensi gangguan keamanan wilayah.",
    sections: {
      BASIS_BACKGROUND:
        "Latar belakang kegiatan adalah meningkatnya kebutuhan validasi data jalur distribusi, perubahan pola mobilitas, dan keterlibatan aktor lokal pada area tertentu.",
      INVESTIGATION_TARGETS:
        "Target penyelidikan mencakup jalur darat, titik transit, pelabuhan kecil, gudang sementara, serta pihak yang memiliki akses operasional terhadap lokasi tersebut.",
      EEI_PIR:
        "Kebutuhan informasi utama: pola pergerakan, frekuensi aktivitas, pihak pengendali, jenis barang/orang yang berpindah, dan relasi antar simpul.",
      COLLECTION_PLAN:
        "Rencana pengumpulan mencakup pemantauan waktu tertentu, pembandingan data lapangan, dan pembaruan peta simpul prioritas secara bertahap.",
      THREAT_RISK_ANALYSIS:
        "Potensi risiko berupa perubahan rute mendadak, penggunaan perantara baru, dan upaya mengaburkan pola aktivitas melalui kegiatan legal.",
      IMPLEMENTATION_MECHANISM:
        "Tiap penerima STR menetapkan sektor pemantauan, jadwal update, dan metode eskalasi apabila ditemukan indikator ancaman yang meningkat.",
      COORDINATION_REPORTING:
        "Setiap temuan diverifikasi minimal dari dua sumber sebelum dilaporkan. Laporan ringkas disusun dalam format kronologi, aktor, lokasi, dan rekomendasi.",
      RECOMMENDATION:
        "Perkuat koordinasi dengan satuan wilayah, prioritaskan titik dengan intensitas tinggi, dan susun daftar aktor untuk pendalaman lanjutan.",
      AUTHENTICATION:
        "Pengesahan mengikuti otorisasi Deputi II dan dapat diperbarui berdasarkan hasil monitoring periode pertama.",
    },
  },
  {
    title: "Direktif Kesiapsiagaan Deteksi Dini Terhadap Eskalasi Regional",
    strategicIssue:
      "Perubahan situasi regional membutuhkan kesiapsiagaan deteksi dini, sinkronisasi laporan, dan respon cepat terhadap indikator eskalasi.",
    commandNarrative:
      "Bangun baseline situasi, kumpulkan indikator awal, dan pastikan setiap perubahan signifikan terhubung dengan analisis risiko serta rekomendasi tindak lanjut.",
    sections: {
      BASIS_BACKGROUND:
        "Direktif ini disusun untuk memastikan seluruh penerima memiliki acuan yang sama dalam membaca indikator awal dan perubahan situasi lapangan.",
      INVESTIGATION_TARGETS:
        "Sasaran meliputi aktor penggerak opini, kelompok rentan terpengaruh, lokasi berkumpul, kanal komunikasi, dan agenda publik yang berpotensi menjadi pemicu.",
      EEI_PIR:
        "PIR: siapa aktor kunci, apa isu pemicu, kapan potensi eskalasi terjadi, di mana titik konsentrasi, dan bagaimana pola koordinasinya.",
      COLLECTION_PLAN:
        "Pengumpulan diarahkan pada indikator terbuka dan tertutup, validasi narasi lapangan, serta analisis tren laporan dari jaringan kewilayahan.",
      THREAT_RISK_ANALYSIS:
        "Ancaman yang perlu diperhatikan adalah eskalasi spontan, provokasi terarah, penyebaran narasi menyesatkan, dan gesekan antar kelompok.",
      IMPLEMENTATION_MECHANISM:
        "Penerima STR mengaktifkan pemantauan berjenjang, menetapkan ambang eskalasi, dan menyiapkan kanal laporan cepat untuk kejadian menonjol.",
      COORDINATION_REPORTING:
        "Koordinasi dilakukan secara periodik dengan ringkasan situasi harian, sedangkan kejadian menonjol dilaporkan segera dengan bukti pendukung.",
      RECOMMENDATION:
        "Susun matriks indikator eskalasi, tingkatkan validasi sumber, dan siapkan opsi mitigasi sesuai karakter wilayah masing-masing.",
      AUTHENTICATION:
        "Draft ini bersifat operasional dan digunakan sebagai dasar awal sebelum arahan tambahan diterbitkan.",
    },
  },
  buildGeneratedDirectiveDraft({
    title: "STR Pemetaan Simpul Komunikasi dan Mobilisasi Lokal",
    focus: "Pergeseran simpul komunikasi dan potensi mobilisasi lokal",
    area: "wilayah prioritas Sumatera bagian utara",
    actor: "aktor penghubung, simpul komunikasi, dan kelompok pendukung",
    indicator: "indikator konsolidasi dan perubahan narasi lapangan",
    method: "observasi terbatas, pendalaman sumber lokal, dan analisis kanal komunikasi",
  }),
  buildGeneratedDirectiveDraft({
    title: "Direktif Pengumpulan Informasi Jalur Perlintasan Rawan",
    focus: "Aktivitas pada jalur perlintasan rawan",
    area: "koridor pesisir dan titik transit strategis",
    actor: "pengelola titik transit, perantara lapangan, dan pengguna jalur",
    indicator: "perubahan frekuensi pergerakan dan pola transit",
    method: "pemantauan waktu tertentu, pencocokan data lapangan, dan verifikasi titik lokasi",
  }),
  buildGeneratedDirectiveDraft({
    title: "STR Monitoring Dinamika Opini dan Isu Publik",
    focus: "Dinamika opini yang berpotensi memicu eskalasi",
    area: "kawasan perkotaan dan pusat aktivitas publik",
    actor: "penggerak opini, pengelola kanal informasi, dan komunitas terdampak",
    indicator: "narasi dominan, agenda pemicu, dan sentimen kelompok",
    method: "analisis narasi terbuka, konfirmasi sumber tertutup, dan pemetaan aktor pengaruh",
  }),
  buildGeneratedDirectiveDraft({
    title: "Direktif Validasi Jaringan Dukungan Logistik",
    focus: "Dugaan jaringan dukungan logistik tertutup",
    area: "wilayah penghubung antarkabupaten",
    actor: "penyedia fasilitas, penghubung logistik, dan penerima manfaat",
    indicator: "pola penyimpanan, perpindahan barang, dan dukungan pembiayaan",
    method: "pemetaan simpul, observasi lapangan, dan validasi berlapis terhadap sumber",
  }),
  buildGeneratedDirectiveDraft({
    title: "STR Kesiapan Respons Terhadap Kejadian Menonjol",
    focus: "Kesiapan respons terhadap kejadian menonjol",
    area: "wilayah regional dengan eskalasi cepat",
    actor: "koordinator lapangan, simpul massa, dan aktor pemicu",
    indicator: "titik kumpul, rencana aksi, dan sinyal eskalasi cepat",
    method: "monitoring intensif, laporan cepat, dan penguatan kanal koordinasi",
  }),
  buildGeneratedDirectiveDraft({
    title: "Direktif Pendalaman Aktivitas Kelompok Rentan",
    focus: "Aktivitas kelompok rentan yang mudah dipengaruhi narasi provokatif",
    area: "zona sosial ekonomi sensitif",
    actor: "tokoh informal, kelompok rentan, dan aktor penyebar narasi",
    indicator: "perubahan sikap, agenda pertemuan, dan pola rekrutmen informal",
    method: "pendalaman human source, observasi kegiatan, dan analisis perubahan perilaku",
  }),
  buildGeneratedDirectiveDraft({
    title: "STR Pemetaan Risiko Infrastruktur Vital",
    focus: "Risiko terhadap infrastruktur vital dan objek strategis",
    area: "kawasan objek vital regional",
    actor: "pihak dengan akses operasional, kelompok berkepentingan, dan simpul pengamanan",
    indicator: "kerentanan akses, pola pengawasan, dan potensi gangguan operasional",
    method: "assessment lapangan, pengumpulan indikator keamanan, dan koordinasi satuan terkait",
  }),
  buildGeneratedDirectiveDraft({
    title: "Direktif Sinkronisasi Laporan Intelijen Kewilayahan",
    focus: "Kebutuhan sinkronisasi laporan intelijen kewilayahan",
    area: "seluruh wilayah sasaran STR",
    actor: "penerima STR, analis wilayah, dan koordinator pelaporan",
    indicator: "kesenjangan data, duplikasi laporan, dan perubahan indikator prioritas",
    method: "rekonsiliasi laporan, validasi lintas sumber, dan pembaruan matriks prioritas",
  }),
];

function uniqBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function inferTargetMode(directive?: DirectiveDetail): DirectiveTargetMode {
  const currentVersion = directive ? getCurrentVersion(directive) : null;
  const recipients = currentVersion?.recipients ?? [];

  if (!recipients.length) {
    return "all";
  }

  const unitTypes = uniqBy(
    recipients.flatMap((recipient) => (recipient.targetUnit?.type ? [recipient.targetUnit.type] : [])),
    (type) => type,
  );

  if (recipients.every((recipient) => recipient.targetPositionId) || unitTypes.length === 0) {
    return "all";
  }

  if (unitTypes.length === 1 && unitTypes[0] === "BINDA") {
    return "binda";
  }

  if (unitTypes.length === 1 && unitTypes[0] === "DIRECTORATE") {
    return "directorate";
  }

  return "all";
}

function getDirectorateCoverageIds(directorate: RegionalMasterDirectorate) {
  return uniqBy(
    directorate.coverageAreas.map((coverage) => coverage.areaId),
    (areaId) => areaId,
  );
}

function buildAllModePreviewRows(
  targetAreaIds: string[],
  provinceOptions: ProvinceOption[],
  regionalAssignments: RegionalAssignmentOption[],
) {
  const preview = deriveRegionalRecipientPreview(targetAreaIds, provinceOptions, regionalAssignments);

  return preview.flatMap<DirectiveRecipientPreviewRow>((item) =>
    item.recipients.length
      ? item.recipients.map((recipient) => ({
          key: `${item.provinceId}-${recipient.id}`,
          scopeLabel: item.provinceName,
          scopeCode: item.provinceCode,
          targetLabel: recipient.positionTitle,
          targetSubLabel: recipient.organizationUnitName,
          targetKind: "Regional Commander",
          coverageNames: [item.provinceName],
          targetPositionId: recipient.positionId,
        }))
      : [
          {
            key: `${item.provinceId}-missing`,
            scopeLabel: item.provinceName,
            scopeCode: item.provinceCode,
            targetLabel: null,
            targetSubLabel: "Belum ada Regional Commander yang terhubung.",
            targetKind: "Regional Commander",
            coverageNames: [item.provinceName],
            missing: true,
          },
        ],
  );
}

function buildBindaModePreviewRows(targetAreaIds: string[], regionalMasters: RegionalMasterOverview | null) {
  const summaryMap = new Map((regionalMasters?.provinces ?? []).map((item) => [item.province.id, item]));

  return targetAreaIds.map<DirectiveRecipientPreviewRow>((provinceId) => {
    const summary = summaryMap.get(provinceId);
    const provinceName = summary?.province.name ?? "Provinsi";
    const provinceCode = summary?.province.code ?? "-";

    if (!summary?.binda) {
      return {
        key: `${provinceId}-missing-binda`,
        scopeLabel: provinceName,
        scopeCode: provinceCode,
        targetLabel: null,
        targetSubLabel: "Provinsi ini belum memiliki organisasi Binda aktif.",
        targetKind: "Binda",
        coverageNames: [provinceName],
        missing: true,
      };
    }

    return {
      key: summary.binda.unitId,
      scopeLabel: provinceName,
      scopeCode: provinceCode,
      targetLabel: summary.binda.name,
      targetSubLabel: summary.binda.code,
      targetKind: "Binda",
      coverageNames: [provinceName],
      targetUnitId: summary.binda.unitId,
    };
  });
}

function buildDirectorateModePreviewRows(targetAreaIds: string[], regionalMasters: RegionalMasterOverview | null) {
  const selectedSet = new Set(targetAreaIds);
  const directorates = uniqBy(
    (regionalMasters?.provinces ?? []).flatMap((province) => province.directorates),
    (directorate) => directorate.unitId,
  );

  return directorates
    .filter((directorate) => {
      const coverageIds = getDirectorateCoverageIds(directorate);
      return coverageIds.length > 0 && coverageIds.every((coverageId) => selectedSet.has(coverageId));
    })
    .map<DirectiveRecipientPreviewRow>((directorate) => ({
      key: directorate.unitId,
      scopeLabel: directorate.name,
      scopeCode: directorate.profileCode ?? directorate.code,
      targetLabel: directorate.name,
      targetSubLabel: directorate.profileCode ?? directorate.code,
      targetKind: "Direktorat",
      coverageNames: directorate.coverageAreas.map((coverage) => coverage.name),
      targetUnitId: directorate.unitId,
    }));
}

function buildDirectiveRecipientInputs(rows: DirectiveRecipientPreviewRow[]): DirectiveRecipientInput[] {
  return uniqBy(
    rows.flatMap((row) =>
      row.missing
        ? []
        : [
            {
              ...(row.targetUnitId ? { targetUnitId: row.targetUnitId } : {}),
              ...(row.targetPositionId ? { targetPositionId: row.targetPositionId } : {}),
            },
          ],
    ),
    (recipient) => recipient.targetUnitId ?? recipient.targetPositionId ?? "",
  );
}

const directiveFormFieldLabels: Record<string, string> = {
  ownerUnitId: "Unit pembuat STR",
  commandNumber: "Nomor STR",
  classification: "Klasifikasi",
  commandSource: "Sumber Perintah",
  commandIssuer: "Pemberi Perintah",
  commandDate: "Tanggal Perintah",
  dueDate: "Batas Waktu",
  strategicIssue: "Isu Strategis",
  commandDescription: "Uraian Perintah",
  uukTitle: "Judul UUK/STR",
  uukSections: "Bagian UUK/KIQ/PIR",
  targetAreaIds: "Peta wilayah sasaran",
  recipients: "Penerima distribusi",
};

function formatValidationPath(path: unknown) {
  if (Array.isArray(path)) {
    const [field, ...rest] = path.map(String);
    const label = directiveFormFieldLabels[field] ?? field;

    return rest.length ? `${label} (${rest.join(".")})` : label;
  }

  if (typeof path === "string" && path) {
    const [field, ...rest] = path.split(".");
    const label = directiveFormFieldLabels[field] ?? field;

    return rest.length ? `${label} (${rest.join(".")})` : label;
  }

  return "Form STR";
}

function normalizeValidationMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("unique") && lowerMessage.includes("commandnumber")) {
    return "Nomor STR sudah digunakan. Gunakan nomor STR lain.";
  }

  if (lowerMessage.includes("invalid uuid")) {
    return "ID data tidak valid. Muat ulang halaman lalu pilih ulang target/penerima.";
  }

  if (lowerMessage.includes("invalid date") || lowerMessage.includes("date string")) {
    return "Format tanggal tidak valid. Pilih tanggal melalui input kalender.";
  }

  if (lowerMessage.includes("required")) {
    return "Wajib diisi.";
  }

  return message;
}

function formatValidationMessage(path: unknown, message: string) {
  return `${formatValidationPath(path)}: ${normalizeValidationMessage(message)}`;
}

function getValidationPathFromObject(value: object) {
  if ("path" in value) {
    return value.path;
  }

  if ("property" in value) {
    return value.property;
  }

  return undefined;
}

function extractValidationMessages(value: unknown): string[] {
  if (value instanceof ZodError) {
    return value.issues.map((issue) => formatValidationMessage(issue.path, issue.message));
  }

  if (typeof value === "string") {
    try {
      return extractValidationMessages(JSON.parse(value));
    } catch {
      return value ? [value] : [];
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item && typeof item === "object" && "message" in item && typeof item.message === "string") {
        const path = getValidationPathFromObject(item);
        return [formatValidationMessage(path, item.message)];
      }

      if (item && typeof item === "object" && "constraints" in item && item.constraints) {
        const path = "property" in item ? item.property : undefined;
        return Object.values(item.constraints as Record<string, unknown>).flatMap((message) =>
          typeof message === "string" ? [formatValidationMessage(path, message)] : [],
        );
      }

      if (item && typeof item === "object" && "children" in item) {
        return extractValidationMessages(item.children);
      }

      return extractValidationMessages(item);
    });
  }

  if (value && typeof value === "object") {
    if ("message" in value && typeof value.message === "string") {
      return extractValidationMessages(value.message);
    }

    if ("details" in value) {
      return extractValidationMessages(value.details);
    }
  }

  return [];
}

function extractApiFieldMessages(fields?: Record<string, string[]>) {
  if (!fields) {
    return [];
  }

  return Object.entries(fields).flatMap(([field, messages]) =>
    messages.map((message) => formatValidationMessage(field, message)),
  );
}

function getDirectiveFormErrorMessage(error: unknown) {
  const validationMessages = uniqBy(
    [
      ...extractValidationMessages(error),
      ...extractValidationMessages(error instanceof Error ? error.message : error),
      ...extractValidationMessages(error instanceof ApiClientError ? error.details : null),
      ...extractApiFieldMessages(error instanceof ApiClientError ? error.fields : undefined),
    ],
    (message) => message,
  );

  if (validationMessages.length) {
    return validationMessages.join("\n");
  }

  return error instanceof Error ? error.message : "Gagal menyimpan STR.";
}

type DirectiveFormClientProps = {
  mode: "create" | "edit";
  access: AccessContextResource;
  provinceOptions: ProvinceOption[];
  provinceBoundaries: ProvinceBoundaryCollection;
  regionalAssignments: RegionalAssignmentOption[];
  regionalMasters: RegionalMasterOverview | null;
  directive?: DirectiveDetail;
};

export function DirectiveFormClient({
  mode,
  access,
  provinceOptions,
  provinceBoundaries,
  regionalAssignments,
  regionalMasters,
  directive,
}: DirectiveFormClientProps) {
  const router = useRouter();
  const currentVersion = directive ? getCurrentVersion(directive) : undefined;
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [commandNumber, setCommandNumber] = useState(directive?.commandNumber ?? "");
  const [classification, setClassification] = useState(currentVersion?.classification ?? "RAHASIA");
  const [commandSource, setCommandSource] = useState(currentVersion?.commandSource ?? "");
  const [commandIssuer, setCommandIssuer] = useState(currentVersion?.commandIssuer ?? "");
  const [commandDate, setCommandDate] = useState(
    currentVersion?.commandDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(currentVersion?.dueDate?.slice(0, 10) ?? "");
  const [strategicIssue, setStrategicIssue] = useState(currentVersion?.strategicIssue ?? "");
  const [commandNarrative, setCommandNarrative] = useState(parsedDescription.commandNarrative);
  const [uukTitle, setUukTitle] = useState(parsedDescription.uukTitle);
  const [uukSections, setUukSections] = useState<StructuredDirectiveUukSection[]>(
    parsedDescription.uukSections.length ? parsedDescription.uukSections : buildStructuredDirectiveUukSections(),
  );
  const [generatedDraftIndex, setGeneratedDraftIndex] = useState(0);
  const [hasGeneratedDraft, setHasGeneratedDraft] = useState(false);
  const [targetMode, setTargetMode] = useState<DirectiveTargetMode>(() => inferTargetMode(directive));
  const selectableProvinceIds = new Set(provinceOptions.map((item) => item.id));
  const [targetAreaIds, setTargetAreaIds] = useState<string[]>(
    normalizeProvinceSelection(
      currentVersion?.targetAreas.map((item) => item.areaId) ??
        access.authorizationContext.areaScopes.map((item) => item.areaId),
      provinceOptions,
    ).filter((areaId) => selectableProvinceIds.has(areaId)),
  );
  const recipientPreviewRows = useMemo(() => {
    if (targetMode === "binda") {
      return buildBindaModePreviewRows(targetAreaIds, regionalMasters);
    }

    if (targetMode === "directorate") {
      return buildDirectorateModePreviewRows(targetAreaIds, regionalMasters);
    }

    return buildAllModePreviewRows(targetAreaIds, provinceOptions, regionalAssignments);
  }, [provinceOptions, regionalAssignments, regionalMasters, targetAreaIds, targetMode]);
  const normalizedRecipients = useMemo(
    () =>
      targetMode === "all"
        ? deriveDirectiveRecipients(deriveRegionalRecipientPreview(targetAreaIds, provinceOptions, regionalAssignments))
        : buildDirectiveRecipientInputs(recipientPreviewRows),
    [provinceOptions, recipientPreviewRows, regionalAssignments, targetAreaIds, targetMode],
  );
  const uncoveredScopeNames = recipientPreviewRows.filter((item) => item.missing).map((item) => item.scopeLabel);
  let submitLabel = "Perbarui Draft STR";

  if (isSaving) {
    submitLabel = "Menyimpan...";
  } else if (mode === "create") {
    submitLabel = "Simpan Draft STR";
  }

  function updateUukSection(sectionType: string, content: string) {
    setUukSections((current) =>
      current.map((section) => (section.sectionType === sectionType ? { ...section, content } : section)),
    );
  }

  function applyGeneratedDirectiveDraft(scope: "full" | "eei" | "collection" | "recommendation" | "polish") {
    const draft = GENERATED_DIRECTIVE_DRAFTS[generatedDraftIndex % GENERATED_DIRECTIVE_DRAFTS.length];

    if (scope === "full") {
      if (hasGeneratedDraft) {
        return;
      }

      setUukTitle(draft.title);
      setStrategicIssue(draft.strategicIssue);
      setCommandNarrative(draft.commandNarrative);
      setUukSections((current) =>
        current.map((section) => ({
          ...section,
          content: draft.sections[section.sectionType] ?? section.content,
        })),
      );
      setGeneratedDraftIndex((current) => current + 1);
      setHasGeneratedDraft(true);
      toast.success("UUK/STR berhasil digenerate.");
      return;
    }

    if (scope === "eei") {
      updateUukSection("EEI_PIR", draft.sections.EEI_PIR ?? "");
      toast.success("EEI/PIR berhasil diisi.");
      return;
    }

    if (scope === "collection") {
      updateUukSection("COLLECTION_PLAN", draft.sections.COLLECTION_PLAN ?? "");
      toast.success("Rencana pengumpulan berhasil diisi.");
      return;
    }

    if (scope === "recommendation") {
      updateUukSection("RECOMMENDATION", draft.sections.RECOMMENDATION ?? "");
      toast.success("Saran tindak berhasil diisi.");
      return;
    }

    setCommandNarrative((current) =>
      current.trim()
        ? `${current.trim()}\n\nCatatan bahasa: rumusan telah diselaraskan agar lebih ringkas, operasional, dan mudah ditindaklanjuti.`
        : "Laksanakan kegiatan secara terarah, terukur, dan dilaporkan berjenjang sesuai kebutuhan pimpinan.",
    );
    toast.success("Perbaikan bahasa ditambahkan.");
  }

  async function handleSubmit() {
    setIsSaving(true);

    try {
      const normalizedTargetAreaIds = normalizeProvinceSelection(targetAreaIds, provinceOptions);

      if (!normalizedTargetAreaIds.length) {
        throw new Error("Pilih minimal satu provinsi sasaran pada peta STR.");
      }

      if (!normalizedRecipients.length) {
        throw new Error("Belum ada penerima distribusi yang cocok dengan mode sasaran yang dipilih.");
      }

      if (uncoveredScopeNames.length) {
        throw new Error(
          `Target berikut belum memiliki penerima organisasi yang valid: ${uncoveredScopeNames.join(", ")}.`,
        );
      }

      const serializedCommandDescription = serializeDirectiveCommandDescription({
        commandNarrative,
        uukTitle,
        uukSections,
      });

      if (mode === "create") {
        const parsed = directiveWizardSchema.parse({
          ownerUnitId: access.authorizationContext.organizationUnitId,
          commandNumber,
          classification,
          commandSource,
          commandIssuer,
          commandDate,
          dueDate: dueDate || undefined,
          strategicIssue,
          commandDescription: serializedCommandDescription,
          uukTitle,
          uukSections,
          targetAreaIds: normalizedTargetAreaIds,
          recipients: normalizedRecipients,
        });

        const created = await apiBrowserMutation<DirectiveDetail>("POST", "/directives", {
          ownerUnitId: parsed.ownerUnitId,
          version: {
            commandNumber: parsed.commandNumber,
            classification: parsed.classification,
            commandSource: parsed.commandSource,
            commandIssuer: parsed.commandIssuer,
            commandDate: parsed.commandDate,
            dueDate: parsed.dueDate || undefined,
            strategicIssue: parsed.strategicIssue || undefined,
            commandDescription: parsed.commandDescription,
            targetAreaIds: parsed.targetAreaIds,
            recipients: parsed.recipients.map((recipient) => ({
              ...(recipient.targetUnitId ? { targetUnitId: recipient.targetUnitId } : {}),
              ...(recipient.targetPositionId ? { targetPositionId: recipient.targetPositionId } : {}),
            })),
          },
        });

        toast.success("STR strategis berhasil dibuat.");
        router.push(`/dashboard/executive/pusat-komando/direktif/${created.id}`);
        router.refresh();
        return;
      }

      if (!directive || !currentVersion) {
        throw new Error("Draft STR tidak ditemukan.");
      }

      const parsed = directiveEditSchema.parse({
        dueDate: dueDate || undefined,
        strategicIssue,
        commandDescription: serializedCommandDescription,
        uukTitle,
        uukSections,
        targetAreaIds: normalizedTargetAreaIds,
        recipients: normalizedRecipients,
      });

      await apiBrowserMutation("PATCH", `/directive-versions/${currentVersion.id}`, {
        dueDate: parsed.dueDate || undefined,
        strategicIssue: parsed.strategicIssue || undefined,
        commandDescription: parsed.commandDescription,
      });

      await apiBrowserMutation("PUT", `/directive-versions/${currentVersion.id}/target-areas`, {
        areaIds: parsed.targetAreaIds,
        primaryAreaId: parsed.targetAreaIds[0],
      });

      await apiBrowserMutation("PUT", `/directive-versions/${currentVersion.id}/recipients`, {
        recipients: parsed.recipients.map((recipient) => ({
          ...(recipient.targetUnitId ? { targetUnitId: recipient.targetUnitId } : {}),
          ...(recipient.targetPositionId ? { targetPositionId: recipient.targetPositionId } : {}),
        })),
      });

      toast.success("Draft STR diperbarui.");
      router.push(`/dashboard/executive/pusat-komando/direktif/${directive.id}`);
      router.refresh();
    } catch (error) {
      setFormErrorMessage(getDirectiveFormErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={Boolean(formErrorMessage)} onOpenChange={(open) => !open && setFormErrorMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>STR belum bisa disimpan</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">{formErrorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFormErrorMessage(null)}>Lengkapi Inputan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader />
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <span>Nomor STR</span>
                <Input
                  value={commandNumber}
                  onChange={(event) => setCommandNumber(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Klasifikasi</span>
                <Select value={classification} onValueChange={setClassification} disabled={mode === "edit"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih klasifikasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-sm">
                <span>Sumber Perintah</span>
                <Input
                  value={commandSource}
                  onChange={(event) => setCommandSource(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Pemberi Perintah</span>
                <Input
                  value={commandIssuer}
                  onChange={(event) => setCommandIssuer(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Tanggal Perintah</span>
                <Input
                  type="date"
                  value={commandDate}
                  onChange={(event) => setCommandDate(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Batas Waktu</span>
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
              <div className="space-y-2 text-sm md:col-span-2">
                <span>Isu Strategis</span>
                <Textarea value={strategicIssue} onChange={(event) => setStrategicIssue(event.target.value)} />
              </div>
              <div className="space-y-2 text-sm md:col-span-2">
                <span>Uraian Perintah</span>
                <Textarea
                  value={commandNarrative}
                  onChange={(event) => setCommandNarrative(event.target.value)}
                  className="min-h-32"
                />
              </div>
            </CardContent>
          </Card>

          <ProvinceMapSelector
            provinces={provinceOptions}
            boundaries={provinceBoundaries}
            selectedProvinceIds={targetAreaIds}
            preview={deriveRegionalRecipientPreview(targetAreaIds, provinceOptions, regionalAssignments)}
            regionalMasters={regionalMasters}
            selectionMode={targetMode}
            onSelectionModeChange={(nextMode) => {
              setTargetMode(nextMode);
              setTargetAreaIds([]);
            }}
            onChange={(nextProvinceIds) =>
              setTargetAreaIds(normalizeProvinceSelection(nextProvinceIds, provinceOptions))
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Preview Distribusi</CardTitle>
              <CardDescription>
                Mode `Semua` menurunkan distribusi ke Regional Commander. Mode `Binda` dan `Direktorat` langsung
                menargetkan organisasi yang dipilih dari peta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uncoveredScopeNames.length ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 text-sm dark:text-amber-100">
                  {uncoveredScopeNames.join(", ")} belum memiliki target distribusi yang valid untuk mode ini.
                </div>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Jenis Distribusi</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Cakupan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipientPreviewRows.length ? (
                    recipientPreviewRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">
                          {row.scopeLabel}
                          <div className="text-muted-foreground text-xs">{row.scopeCode}</div>
                        </TableCell>
                        <TableCell>{row.targetKind}</TableCell>
                        <TableCell>
                          {row.missing ? (
                            <span className="text-amber-700 dark:text-amber-200">{row.targetSubLabel}</span>
                          ) : (
                            <div>
                              <div className="font-medium">{row.targetLabel}</div>
                              <div className="text-muted-foreground text-xs">{row.targetSubLabel ?? "-"}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {row.coverageNames.map((coverageName) => (
                              <Badge key={`${row.key}-${coverageName}`} variant="outline">
                                {coverageName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Pilih sasaran pada peta untuk melihat target distribusinya.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader />
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-emerald-400/25 bg-[color-mix(in_srgb,var(--dc-card)_88%,black)] shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_18px_48px_rgba(16,185,129,0.08)]">
              <div className="border-emerald-400/20 border-b bg-emerald-400/[0.06] px-4 py-3">
                <div className="min-w-0 font-medium text-emerald-200 text-xs uppercase tracking-[0.22em]">
                  <Cpu className="mr-2 inline size-4 align-[-3px] text-emerald-300" />
                  Output UK/STR
                </div>
              </div>
              <div className="grid gap-4 p-4">
                <Button
                  type="button"
                  onClick={() => applyGeneratedDirectiveDraft("full")}
                  disabled={hasGeneratedDraft}
                  className="h-auto min-h-12 w-full border border-emerald-300/60 bg-emerald-400 px-4 font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(16,185,129,0.22),0_14px_34px_rgba(16,185,129,0.24)] hover:bg-emerald-300"
                >
                  <Cpu className="mr-2 size-4" />
                  {hasGeneratedDraft ? "UK/STR Sudah Digenerate" : "Generate UK/STR Lengkap"}
                </Button>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyGeneratedDirectiveDraft("eei")}
                    className="h-auto min-h-11 whitespace-normal border-cyan-300/25 bg-cyan-300/[0.04] px-3 text-center leading-tight hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    Generate EEI/PIR
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyGeneratedDirectiveDraft("collection")}
                    className="h-auto min-h-11 whitespace-normal border-amber-300/25 bg-amber-300/[0.04] px-3 text-center leading-tight hover:bg-amber-300/10 hover:text-amber-100"
                  >
                    Generate Rencana Pengumpulan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyGeneratedDirectiveDraft("recommendation")}
                    className="h-auto min-h-11 whitespace-normal border-emerald-300/25 bg-emerald-300/[0.04] px-3 text-center leading-tight hover:bg-emerald-300/10 hover:text-emerald-100"
                  >
                    Generate Saran Tindak
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyGeneratedDirectiveDraft("polish")}
                    className="h-auto min-h-11 whitespace-normal border-sky-300/25 bg-sky-300/[0.04] px-3 text-center leading-tight hover:bg-sky-300/10 hover:text-sky-100"
                  >
                    Perbaiki Bahasa
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <span>Judul UUK/STR</span>
              <Input value={uukTitle} onChange={(event) => setUukTitle(event.target.value)} />
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">Progress Isi UUK</div>
                <Badge variant="outline">
                  {countFilledStructuredSections(uukSections)} / {uukSections.length} bagian terisi
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm">
                Isi minimal satu bagian UUK/KIQ/PIR agar STR dapat menjadi starting object yang jelas untuk regional.
              </div>
            </div>

            <div className="grid gap-4">
              {uukSections.map((section) => (
                <div key={section.sectionType} className="space-y-2 rounded-xl border border-border/70 p-4">
                  <div className="font-medium">
                    {section.orderNumber}. {section.title}
                  </div>
                  <Textarea
                    value={section.content}
                    onChange={(event) => updateUukSection(section.sectionType, event.target.value)}
                    className="min-h-28"
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <div className="text-muted-foreground text-xs">
              Publish dan distribusi tetap dijalankan terpisah setelah draft STR selesai direview.
            </div>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
