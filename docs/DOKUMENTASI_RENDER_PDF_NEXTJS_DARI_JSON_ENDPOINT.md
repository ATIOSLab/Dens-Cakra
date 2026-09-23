# Dokumentasi Render PDF Rekap Jaring dari JSON Endpoint — Next.js

## 1. Tujuan

Dokumentasi ini menjelaskan bagaimana frontend **Next.js** menerima JSON dari endpoint backend lalu merender laporan PDF **dengan layout yang sama seperti template laporan Rekap Aktivitas dan Produktivitas Jaring**.

JSON endpoint menjadi **sumber data utama**. PDF tidak diedit dari file PDF lama dan tidak menggunakan overlay/tempelan.

Alur final:

```text
Backend Endpoint (JSON)
        ↓
Next.js Server
        ↓
Validasi Data
        ↓
ReportDocument React
        ↓
13 Halaman HTML/CSS A4
        ↓
Preview Browser
        ↓
Playwright / Chromium
        ↓
PDF Final
```

> Penting: jangan mengedit atau menimpa PDF periode lama. Setiap PDF harus dirender ulang secara utuh dari data endpoint agar tidak terlihat seperti tempelan.

---

## 2. Bentuk JSON Endpoint

Struktur JSON yang digunakan frontend:

```ts
export interface ReportPayload {
  metadata: {
    periodStart: string;
    periodEnd: string;
    periodLabel: string;
    pullAt: string;
    activityWindowStart: string;
    periodDays: number;
  };

  summary: {
    total: number;
    active: number;
    inactive: number;
    reporters: number;
    reports: number;
  };

  coaching: {
    activities: number;
    activitiesIncludingPending: number;
    uniqueJaring: number;
    uniqueJaringIncludingPending: number;
    pendingActivities: number;
    pendingJaring: number;
  };

  regions: RegionReport[];
  districts: DistrictReport[];

  highlights: {
    highestActiveRegion: string;
    highestReportRegion: string;
    mostProductiveRegion: string;
    districtsWithoutReports: number;
    topDistricts: TopDistrict[];
  };
}
```

### Region

```ts
export interface RegionReport {
  name: string;
  fullName: string;
  total: number;
  active: number;
  inactive: number;
  reports: number;
  coaching: number;
  activeRate: number;
  inactiveRate: number;
  reportsPerActive: number;
  coachingShare: number;
}
```

### District

```ts
export interface DistrictReport {
  region: string;
  regionFullName: string;
  name: string;
  total: number;
  active: number;
  inactive: number;
  reports: number;
  coaching: number;
  activeRate: number;
  inactiveRate: number;
  reportsPerActive: number;
  reportConcentration: number;
}
```

### Top District

```ts
export interface TopDistrict {
  rank: number;
  name: string;
  region: string;
  reports: number;
  active: number;
  total: number;
  activeRate: number;
}
```

Dengan struktur ini, frontend **tidak perlu menghitung ulang sebagian besar statistik** karena field seperti:

```text
activeRate
inactiveRate
reportsPerActive
coachingShare
reportConcentration
highlights
topDistricts
```

sudah diberikan langsung oleh backend.

Frontend cukup melakukan validasi sederhana sebagai pengaman.

---

## 3. Mapping JSON ke Template PDF

### Halaman 1 — Cover

Sumber data:

```ts
data.metadata.periodLabel
data.metadata.pullAt
data.metadata.activityWindowStart
```

Render:

```text
LAPORAN REKAP

AKTIVITAS DAN
PRODUKTIVITAS JARING
```

Card metadata:

```text
Periode   → metadata.periodLabel
Cakupan   → Provinsi DKI Jakarta
Basis     → Jaring terverifikasi, aktivitas 90 hari, dan pembinaan
Penarikan → metadata.pullAt
```

Tulisan `BINDA DKI JAKARTA` tidak ditampilkan.

### Halaman 2 — Ringkasan Eksekutif

Mapping KPI:

```text
TOTAL JARING    → summary.total
AKTIF 90 HARI   → summary.active
PELAPOR PERIODE → summary.reporters
LAPORAN MASUK   → summary.reports
```

Persentase aktif:

```ts
const activeRate =
  (data.summary.active / data.summary.total) * 100;
```

Subtitle laporan:

```ts
`Selama ${data.metadata.periodDays} hari`
```

Donut chart memakai:

```ts
data.summary.active
data.summary.inactive
```

Temuan utama memakai:

```ts
data.highlights.highestActiveRegion
data.highlights.highestReportRegion
data.highlights.mostProductiveRegion
data.highlights.districtsWithoutReports
```

Ringkasan pembinaan memakai:

```ts
data.coaching.activities
data.coaching.uniqueJaring
data.coaching.pendingActivities
```

Jumlah wilayah pembinaan:

```ts
const coachingCoverage =
  data.regions.filter(
    region => region.coaching > 0
  ).length;
```

### Halaman 3 — Analisis Per Wilayah

Keaktifan:

```ts
const byActiveRate =
  [...data.regions].sort(
    (a, b) => b.activeRate - a.activeRate
  );
```

Volume laporan:

```ts
const byReports =
  [...data.regions].sort(
    (a, b) => b.reports - a.reports
  );
```

Tabel memakai:

```text
region.name
region.total
region.active
region.reports
region.reportsPerActive
region.activeRate
```

### Halaman 4 — Metodologi dan Definisi

Layout bersifat statis, tetapi periode/rentang berasal dari:

```ts
data.metadata.periodStart
data.metadata.periodEnd
data.metadata.pullAt
data.metadata.activityWindowStart
```

Tidak boleh hardcode tanggal periode lama.

### Halaman 5 — Analisis Pembinaan

KPI:

```ts
data.coaching.activities
data.coaching.uniqueJaring
data.coaching.pendingActivities
```

Tabel wilayah:

```ts
const coachingRegions =
  [...data.regions].sort(
    (a, b) => b.coaching - a.coaching
  );
```

Kolom:

```text
Wilayah
Pembinaan
Kontribusi
Aktif
Laporan
```

Sumber:

```ts
region.name
region.coaching
region.coachingShare
region.active
region.reports
```

### Halaman 6–11 — Detail Wilayah

Urutan:

```ts
export const REGION_PAGE_ORDER = [
  "Jakarta Selatan",
  "Jakarta Timur",
  "Jakarta Pusat",
  "Jakarta Barat",
  "Jakarta Utara",
  "Kepulauan Seribu",
];
```

Ambil region:

```ts
const region = data.regions.find(
  item => item.name === regionName
);
```

Ambil kecamatan:

```ts
const districts =
  data.districts.filter(
    item => item.region === regionName
  );
```

KPI:

```text
TOTAL JARING   → region.total
AKTIF          → region.active + region.activeRate
TIDAK AKTIF    → region.inactive + region.inactiveRate
LAPORAN        → region.reports + region.reportsPerActive
```

Tabel kecamatan:

```text
district.name
district.total
district.active
district.inactive
district.reports
district.activeRate
```

Highlight:

```ts
const mostReports =
  [...districts].sort(
    (a, b) => b.reports - a.reports
  )[0];

const highestActive =
  [...districts].sort(
    (a, b) => b.activeRate - a.activeRate
  )[0];

const mostCoaching =
  [...districts].sort(
    (a, b) => b.coaching - a.coaching
  )[0];
```

### Halaman 12 — Sorotan Kecamatan

Backend sudah menyediakan:

```ts
data.highlights.topDistricts
```

Mapping tabel:

```text
rank
name
region
reports
active/total
activeRate
```

Konsentrasi laporan per wilayah memakai `district.reportConcentration`.

### Halaman 13 — Ringkasan Akhir

Gunakan:

```ts
data.summary
data.coaching
data.highlights
data.regions
```

Isi kesimpulan dibuat dinamis dari JSON, bukan hardcode.

---

## 4. Validasi Data

Walaupun backend sudah mengirim statistik turunan, frontend tetap menjalankan sanity check.

```ts
export function validateReport(
  data: ReportPayload
) {
  const errors: string[] = [];

  if (
    data.summary.active +
      data.summary.inactive !==
    data.summary.total
  ) {
    errors.push(
      "summary.active + summary.inactive != summary.total"
    );
  }

  const regionTotal =
    data.regions.reduce(
      (sum, item) => sum + item.total,
      0
    );

  if (regionTotal !== data.summary.total) {
    errors.push(
      "Total Jaring wilayah tidak sesuai summary"
    );
  }

  const reportsTotal =
    data.regions.reduce(
      (sum, item) => sum + item.reports,
      0
    );

  if (reportsTotal !== data.summary.reports) {
    errors.push(
      "Total laporan wilayah tidak sesuai summary"
    );
  }

  const coachingTotal =
    data.regions.reduce(
      (sum, item) => sum + item.coaching,
      0
    );

  if (
    coachingTotal !==
    data.coaching.activities
  ) {
    errors.push(
      "Total pembinaan wilayah tidak sesuai coaching.activities"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 5. Komponen A4

```tsx
export function ReportPage({
  children,
  pageNumber,
  showHeader = true,
}: {
  children: React.ReactNode;
  pageNumber?: number;
  showHeader?: boolean;
}) {
  return (
    <section className="report-page">
      {showHeader && <ReportHeader />}

      <div className="report-content">
        {children}
      </div>

      {pageNumber && (
        <ReportFooter pageNumber={pageNumber} />
      )}
    </section>
  );
}
```

CSS:

```css
@page {
  size: A4 portrait;
  margin: 0;
}

.report-page {
  width: 210mm;
  height: 297mm;
  position: relative;
  background: #fff;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}

.report-page:last-child {
  break-after: auto;
  page-break-after: auto;
}

.report-content {
  width: 186mm;
  margin-left: auto;
  margin-right: auto;
}

@media print {
  html,
  body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

---

## 6. ReportDocument

```tsx
export function ReportDocument({
  data,
}: {
  data: ReportPayload;
}) {
  return (
    <main
      id="report-document"
      data-report-ready="true"
    >
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <RegionalAnalysisPage data={data} />
      <MethodologyPage data={data} />
      <CoachingAnalysisPage data={data} />

      {REGION_PAGE_ORDER.map(
        (regionName, index) => (
          <RegionDetailPage
            key={regionName}
            data={data}
            regionName={regionName}
            pageNumber={6 + index}
          />
        )
      )}

      <DistrictHighlightsPage data={data} />
      <FinalSummaryPage data={data} />
    </main>
  );
}
```

Total tetap 13 halaman.

---

## 7. Preview Route Next.js

Contoh:

```text
/reports/jaring/print?start=2026-09-01&end=2026-09-22
```

```tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    start: string;
    end: string;
  }>;
}) {
  const { start, end } = await searchParams;

  const data =
    await fetchReportData({ start, end });

  const validation =
    validateReport(data);

  if (!validation.valid) {
    throw new Error(
      validation.errors.join("; ")
    );
  }

  return <ReportDocument data={data} />;
}
```

Preview dan PDF wajib memakai `ReportDocument` yang sama.

---

## 8. Generate PDF dengan Playwright

Route:

```text
GET /api/reports/jaring/pdf?start=2026-09-01&end=2026-09-22
```

Contoh:

```ts
import { chromium } from "playwright";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const start =
    url.searchParams.get("start");

  const end =
    url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      {
        message:
          "start dan end wajib diisi",
      },
      {
        status: 400,
      }
    );
  }

  const browser =
    await chromium.launch({
      headless: true,
    });

  try {
    const page = await browser.newPage();

    const printUrl =
      `${process.env.APP_URL}` +
      `/reports/jaring/print` +
      `?start=${start}` +
      `&end=${end}`;

    await page.goto(
      printUrl,
      {
        waitUntil: "networkidle",
      }
    );

    await page.evaluate(
      async () => {
        await document.fonts.ready;
      }
    );

    await page.waitForFunction(
      () =>
        document
          .querySelector("#report-document")
          ?.getAttribute(
            "data-report-ready"
          ) === "true"
    );

    await page.emulateMedia({
      media: "print",
    });

    const pdf =
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
      });

    return new NextResponse(
      new Uint8Array(pdf),
      {
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            'attachment; filename="laporan-rekap-jaring.pdf"',
        },
      }
    );
  } finally {
    await browser.close();
  }
}
```

---

## 9. Prinsip Anti-Tempelan

Yang dijadikan template adalah:

```text
layout
spacing
warna
font
card
tabel
grafik
header
footer
urutan halaman
```

Semua dibangun dengan React + CSS.

Alur yang benar:

```text
JSON Baru
   ↓
React Template yang Sama
   ↓
PDF Baru
```

Bukan:

```text
PDF Lama
   ↓
Tutupi tulisan lama
   ↓
Tempel data baru
```

---

## 10. Quality Assurance

```text
[ ] PDF 13 halaman
[ ] data sama dengan JSON endpoint
[ ] tidak ada angka hardcode periode lama
[ ] tidak ada BINDA DKI JAKARTA
[ ] tidak ada teks ganda
[ ] tidak ada overlay putih
[ ] tidak ada efek tempelan
[ ] card tidak terpotong
[ ] tabel tidak keluar halaman
[ ] grafik tidak overflow
[ ] header konsisten
[ ] footer konsisten
[ ] periode sesuai metadata
[ ] summary sesuai regions
[ ] coaching sesuai regions
[ ] preview browser sama dengan PDF
```

---

## 11. Kesimpulan

Dengan bentuk JSON endpoint ini, frontend Next.js dapat langsung menggunakan data tersebut sebagai sumber laporan.

Backend menyediakan:

```text
metadata
summary
coaching
regions
districts
highlights
```

Frontend bertugas:

```text
fetch JSON
→ validasi
→ render komponen React sesuai template
→ preview
→ Playwright generate PDF
```

Jadi setiap kali backend mengirim JSON periode baru, frontend akan menghasilkan **PDF baru dengan tampilan yang sama seperti template sekarang**, tanpa perlu mengedit PDF lama atau melakukan overlay data.
