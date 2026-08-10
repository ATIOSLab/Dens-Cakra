# Endpoint Peta Jejaring Intelijen

Dokumen ini menjelaskan kontrak endpoint yang menjadi sumber data halaman **Peta Jejaring Intelijen**, termasuk seluruh filter request, tiga bentuk marker, metadata agregat, dan pemakaiannya pada tampilan peta/fullscreen.

## Ringkasan

| Item | Nilai |
|---|---|
| Method | `GET` |
| Path | `/api/v1/map/markers` |
| Content type | `application/json` |
| Autentikasi | Session pengguna aktif |
| Guard | `SessionGuard`, `DomainAccessGuard` |
| Role | `executive`, `regional_commander` |
| Format data | GeoJSON `FeatureCollection` di dalam envelope API |
| Jenis marker | `report`, `baket`, `agent` |

Endpoint selalu menerapkan scope akses pengguna. Lokasi personel berstatus stealth tidak dimasukkan ke response, ditandai oleh `meta.security.stealthLocationsExcluded: true`.

## Request

### Query parameters

Parameter berbentuk daftar dapat dikirim sebagai CSV, misalnya `types=report,baket,agent` atau `urgencies=URGENT,HIGH`.

| Parameter | Tipe | Default | Nilai/format | Pengaruh |
|---|---:|---:|---|---|
| `types` | CSV enum | `baket,agent` dari DTO | `report`, `baket`, `agent` | Memilih jenis fitur. UI peta mengirim `report,baket,agent` ketika “Semua” dipilih. |
| `bbox` | string | - | `minLongitude,minLatitude,maxLongitude,maxLatitude` | Membatasi feature ke viewport geografis. |
| `areaIds` | CSV UUID | - | UUID wilayah | Filter berdasarkan ID wilayah administratif. |
| `areaCodes` | CSV string | - | kode wilayah | Filter berdasarkan kode wilayah. |
| `areaLevels` | CSV enum | - | `COUNTRY`, `PROVINCE`, `REGENCY`, `CITY`, `DISTRICT`, `VILLAGE`, `URBAN_VILLAGE`, `RW`, `RT` | Membatasi level wilayah. |
| `categoryIds` | CSV UUID | - | UUID kategori | Filter kategori laporan/Baket. |
| `categoryCodes` | CSV string | - | kode kategori | Filter kategori memakai kode. |
| `jaringIds` | CSV UUID | - | UUID Jaring | Membatasi Laporan Jaring, Baket sumber/utama, dan personel yang menjadi Gaswil aktif Jaring tersebut. |
| `fieldOfficerAssignmentIds` | CSV UUID | - | UUID assignment | Membatasi laporan, Baket, dan marker personel berdasarkan assignment Petugas Wilayah (Gaswil/Petugas Wilayah (Gaswil)). |
| `reportValidity` | CSV enum | - | `VALID`, `NEEDS_REVIEW`, `WAITING` | Filter validitas Laporan Jaring. |
| `completeness` | CSV enum | - | `COMPLETE`, `INCOMPLETE` | Filter kelengkapan Laporan Jaring. |
| `hasCoordinates` | boolean | - | `true`, `false` | Memilih data dengan/tanpa koordinat. Data tanpa koordinat tidak menjadi feature peta. |
| `hasAttachments` | boolean | - | `true`, `false` | Filter keberadaan lampiran laporan. |
| `coordinateSources` | CSV enum | - | `WHATSAPP_LOCATION`, `DEVICE_GPS`, `MANUAL_PIN`, `MANUAL_COORDINATE`, `CORRECTED_BY_FIELD_OFFICER`, `SYSTEM_DERIVED` | Filter asal koordinat. |
| `locationSuitability` | CSV enum | - | `WITHIN_SCOPE`, `OUTSIDE_SCOPE`, `BORDER_AMBIGUOUS`, `NOT_DETERMINED` | Filter kecocokan lokasi terhadap cakupan penugasan. |
| `baketStatuses` | CSV enum | - | `DRAFT`, `READY_TO_SEND`, `SENT_TO_OIM`, `UNDER_VERIFICATION`, `NEEDS_DEVELOPMENT`, `VERIFIED`, `REJECTED` | Filter status Baket. |
| `urgencies` | CSV enum | - | `LOW`, `NORMAL`, `HIGH`, `URGENT` | Filter tingkat urgensi. |
| `agentStates` | CSV enum | - | `active`, `last_known` | Filter kondisi freshness lokasi personel. |
| `unitIds` | CSV UUID | - | UUID unit | Membatasi personel berdasarkan unit. |
| `assignmentIds` | CSV UUID | - | UUID assignment | Membatasi marker personel berdasarkan assignment. |
| `from` | ISO datetime | - | ISO-8601 | Awal periode inklusif. |
| `to` | ISO datetime | - | ISO-8601 | Akhir periode inklusif. `from` tidak boleh lebih besar dari `to`. |
| `q` | string | - | teks pencarian | Pencarian referensi, judul, Jaring, wilayah, atau identitas yang didukung tiap jenis data. |
| `activeWithinMinutes` | integer | `15` | `1..1440` | Lokasi personel dianggap `active` jika umurnya tidak melebihi nilai ini. |
| `lastKnownWithinHours` | integer | `168` | `1..2160` | Batas umur maksimum lokasi `last_known`. Harus lebih besar atau sama dengan `activeWithinMinutes`. |
| `limitPerType` | integer | `1000` | `1..5000` | Batas feature per jenis marker. UI menggunakan `5000`. |
| `includeAreaHierarchy` | boolean | `true` | `true`, `false` | Menentukan penyertaan hierarki wilayah pada hasil area. |

### Request default halaman

```http
GET /api/v1/map/markers?types=report,baket,agent&from=2026-07-08T00:00:00.000Z&to=2026-08-07T23:59:59.999Z&activeWithinMinutes=15&lastKnownWithinHours=168&limitPerType=5000&includeAreaHierarchy=true
```

### Contoh request terfilter

```http
GET /api/v1/map/markers?types=report,baket,agent&fieldOfficerAssignmentIds=8f0d86b2-6dd0-4aa8-9419-a2e6bc74632c&jaringIds=2eb9473c-8ac5-476a-a226-b4ea5a97509b&urgencies=URGENT,HIGH&areaIds=2f23e167-57a4-4de4-b1a9-2840d0541077&agentStates=active&activeWithinMinutes=15&lastKnownWithinHours=168&limitPerType=5000&includeAreaHierarchy=true
```

## Response

### Envelope sukses

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [],
    "meta": {}
  },
  "requestId": "request-id",
  "timestamp": "2026-08-07T09:45:21.000Z"
}
```

Frontend `apiBrowserFetch` mengembalikan isi properti `data`, sehingga komponen menerima langsung `{ type, features, meta }`.

### Feature Laporan Jaring (`markerType: report`)

```json
{
  "type": "Feature",
  "id": "report:REPORT_UUID",
  "geometry": {
    "type": "Point",
    "coordinates": [106.806005, -6.176406]
  },
  "properties": {
    "markerType": "report",
    "markerKey": "report:REPORT_UUID",
    "suggestedColor": "#2563eb",
    "reportId": "REPORT_UUID",
    "referenceNumber": "JKT-PUS-20260807-0001",
    "displayTitle": "Kerumunan massa di sekitar lokasi",
    "excerpt": "Ringkasan isi laporan",
    "reportStatus": "SUBMITTED",
    "verificationStatus": "VERIFIED_BY_FIELD_OFFICER",
    "validity": "NEEDS_REVIEW",
    "completeness": "COMPLETE",
    "urgency": "URGENT",
    "category": { "id": "CATEGORY_UUID", "code": "KEAMANAN", "name": "Keamanan" },
    "reportedAt": "2026-08-07T02:43:00.000Z",
    "receivedAt": "2026-08-07T02:43:12.000Z",
    "locationCapturedAt": "2026-08-07T02:42:50.000Z",
    "coordinateSource": "WHATSAPP_LOCATION",
    "gpsAccuracyMeters": 8.4,
    "areaResolutionMethod": "POLYGON_MATCH",
    "primaryArea": {
      "id": "AREA_UUID",
      "code": "3171",
      "name": "Jakarta Pusat",
      "level": "CITY",
      "boundaryQualityStatus": "VERIFIED"
    },
    "matchedAreas": [],
    "locationSuitability": "WITHIN_SCOPE",
    "jaring": {
      "id": "JARING_UUID",
      "name": "Nama Jaring",
      "code": "JRG-001",
      "whatsappNumber": "628xxxxxxxxxx",
      "profilePhotoFileId": null,
      "placementArea": null
    },
    "fieldOfficer": {
      "assignmentId": "ASSIGNMENT_UUID",
      "userProfileId": "PROFILE_UUID",
      "name": "Nama Petugas"
    },
    "attachments": {
      "total": 3,
      "images": 2,
      "videos": 1,
      "items": [
        {
          "id": "REPORT_MEDIA_UUID",
          "fileId": "FILE_UUID",
          "mediaType": "IMAGE",
          "caption": "Dokumentasi lokasi",
          "orderNo": 1,
          "createdAt": "2026-08-07T02:43:05.000Z",
          "fileName": "dokumentasi-lokasi.jpg",
          "mimeType": "image/jpeg"
        }
      ]
    },
    "baket": { "id": "BAKET_UUID", "status": "UNDER_VERIFICATION", "currentVersionNumber": 2 }
  }
}
```

### Feature Baket (`markerType: baket`)

```json
{
  "type": "Feature",
  "id": "baket:BAKET_UUID",
  "geometry": { "type": "Point", "coordinates": [107.741, -6.7344] },
  "properties": {
    "markerType": "baket",
    "markerKey": "baket:BAKET_UUID",
    "suggestedColor": "#f59e0b",
    "baketId": "BAKET_UUID",
    "versionId": "VERSION_UUID",
    "currentVersionNumber": 3,
    "displayTitle": "Aktivitas kapal mencurigakan",
    "status": "UNDER_VERIFICATION",
    "urgency": "HIGH",
    "category": { "id": "CATEGORY_UUID", "code": "MARITIM", "name": "Maritim" },
    "reportedAt": "2026-08-07T02:41:00.000Z",
    "locationCapturedAt": "2026-08-07T02:39:00.000Z",
    "coordinateSource": "DEVICE_GPS",
    "areaResolutionMethod": "POLYGON_MATCH",
    "areaResolutionConfidence": 1,
    "primaryArea": null,
    "matchedAreas": [],
    "fieldOfficer": {
      "assignmentId": "ASSIGNMENT_UUID",
      "userProfileId": "PROFILE_UUID",
      "name": "Nama Petugas",
      "positionTitle": "Petugas Lapangan",
      "unitId": "UNIT_UUID",
      "unitName": "Unit A"
    },
    "jaring": null,
    "sourceReports": {
      "total": 2,
      "preview": [
        { "messageId": "MESSAGE_UUID", "reportId": "REPORT_UUID", "referenceNumber": "REF-001" }
      ]
    }
  }
}
```

### Fitur Personel (`markerType: agent`)

```json
{
  "type": "Feature",
  "id": "agent:ASSIGNMENT_UUID",
  "geometry": { "type": "Point", "coordinates": [106.8456, -6.2088] },
  "properties": {
    "markerType": "agent",
    "markerKey": "agent:active",
    "suggestedColor": "#3b82f6",
    "assignmentId": "ASSIGNMENT_UUID",
    "userProfileId": "PROFILE_UUID",
    "userName": "Nama Personel",
    "positionTitle": "Petugas Lapangan",
    "positionCode": "FIELD_OFFICER",
    "unitId": "UNIT_UUID",
    "unitName": "Unit A",
    "capturedAt": "2026-08-07T02:40:00.000Z",
    "ageMinutes": 5,
    "agentState": "active",
    "gpsAccuracyMeters": 12,
    "coordinateSource": "DEVICE_GPS",
    "areaResolutionMethod": "POLYGON_MATCH",
    "primaryArea": null,
    "matchedAreas": [],
    "jaringCount": 1,
    "jaring": {
      "id": "JARING_UUID",
      "name": "Nama Jaring",
      "code": "KODE_JARING",
      "whatsappNumber": "6281234567890",
      "profilePhotoFileId": "FILE_UUID",
      "placementArea": { "id": "AREA_UUID", "code": "AREA_CODE", "name": "Menteng Dalam", "level": "URBAN_VILLAGE" },
      "gaswilName": "Nama Personel",
      "gaswilAssignmentId": "ASSIGNMENT_UUID",
      "gaswilUserProfileId": "PROFILE_UUID"
    },
    "jarings": [
      {
        "id": "JARING_UUID",
        "name": "Nama Jaring",
        "code": "KODE_JARING",
        "whatsappNumber": "6281234567890",
        "profilePhotoFileId": "FILE_UUID",
        "placementArea": { "id": "AREA_UUID", "code": "AREA_CODE", "name": "Menteng Dalam", "level": "URBAN_VILLAGE" },
        "gaswilName": "Nama Personel",
        "gaswilAssignmentId": "ASSIGNMENT_UUID",
        "gaswilUserProfileId": "PROFILE_UUID"
      }
    ]
  }
}
```

`agentState` bernilai `active` ketika `ageMinutes <= activeWithinMinutes`; selebihnya menjadi `last_known` selama belum melewati `lastKnownWithinHours`. `jaring` adalah Jaring aktif pertama yang dibina personel, sedangkan `jarings` memuat seluruh penugasan Jaring aktif dan `jaringCount` menyatakan jumlahnya.

### Metadata (`data.meta`)

```json
{
  "counts": {
    "total": 120,
    "report": 70,
    "baket": 30,
    "agent": 20,
    "totalReports": 1250,
    "totalBakets": 340,
    "mappableReports": 1180,
    "mappableBakets": 330,
    "unlocatedReport": 70,
    "unlocatedBaket": 10,
    "unlocatedAgent": 4,
    "activeAgents": 14,
    "lastKnownAgents": 6,
    "byBaketCategory": { "KEAMANAN": 12 },
    "byBaketStatus": { "UNDER_VERIFICATION": 8 }
  },
  "facets": {
    "markerTypes": ["report", "baket", "agent"],
    "categories": [{ "id": "UUID", "code": "KEAMANAN", "name": "Keamanan" }],
    "baketStatuses": ["DRAFT", "READY_TO_SEND", "SENT_TO_OIM", "UNDER_VERIFICATION", "NEEDS_DEVELOPMENT", "VERIFIED", "REJECTED"],
    "urgencies": ["LOW", "NORMAL", "HIGH", "URGENT"],
    "agentStates": ["active", "last_known"],
    "administrativeLevels": ["COUNTRY", "PROVINCE", "REGENCY", "CITY", "DISTRICT", "VILLAGE", "URBAN_VILLAGE", "RW", "RT"],
    "areas": []
  },
  "freshness": {
    "activeWithinMinutes": 15,
    "lastKnownWithinHours": 168,
    "generatedAt": "2026-08-07T02:45:21.000Z"
  },
  "summary": {
    "reports": {
      "total": 1250,
      "valid": 900,
      "complete": 1000,
      "incomplete": 250,
      "mappable": 1180,
      "unlocated": 70
    },
    "bakets": { "total": 340, "mappable": 330, "unlocated": 10 },
    "visible": { "total": 120, "reports": 70, "bakets": 30, "agents": 20 }
  },
  "unlocatedItems": [],
  "security": { "stealthLocationsExcluded": true }
}
```

Catatan perhitungan:

- `counts.total` dan `summary.visible.total` adalah jumlah feature yang dimuat setelah filter dan `limitPerType`.
- `totalReports`/`totalBakets` serta `summary.reports`/`summary.bakets` adalah agregat hasil filter sebelum pemotongan feature.
- `unlocatedItems` berisi pratinjau Laporan Jaring tanpa koordinat, maksimal 20 item; Baket/personel tanpa koordinat hanya tersedia sebagai angka agregat.
- `areas` berasal dari area yang benar-benar ditemukan pada feature hasil dan mengikuti scope akses.

## Pemakaian pada halaman Peta Jejaring Intelijen

| Data endpoint | Penyajian UI |
|---|---|
| `features[markerType=report]` | Layer Laporan, marker/cluster/heatmap, feed kanan, ticker live, kategori, urgensi, wilayah, dan detail Laporan Jaring. |
| `features[markerType=baket]` | Layer Baket, marker berlambang Baket, feed kanan, ticker live, status/kategori, laporan sumber, dan detail Baket. |
| `features[markerType=agent]` | Layer Personel Aktif dan Lokasi Terakhir, ticker live, posisi/unit, umur lokasi, daftar Jaring binaan, dan detail posisi. |
| `meta.counts` | KPI fullscreen dan ringkasan layer. |
| `meta.facets` | Pilihan filter kategori, status Baket, status personel, urgensi, tipe marker, dan ringkasan wilayah hasil. |
| `meta.freshness` | Status live, jam pembangkitan data, serta batas aktif/lokasi terakhir. |
| `meta.summary` | Total laporan/Baket, cakupan koordinat, data terpetakan dan tanpa koordinat. |
| `meta.unlocatedItems` | Daftar alternatif laporan yang tidak dapat digambar sebagai marker. |
| `meta.security` | Informasi bahwa lokasi stealth tidak pernah disajikan. |

Layer seperti CCTV, gempa, maritim publik, berita global, kabel bawah laut, atau penerbangan tidak ditampilkan karena endpoint ini tidak menyediakan data tersebut. Fullscreen hanya menyajikan layer aktual agar tidak menciptakan data semu.

Filter wilayah pada halaman memakai cakupan akses pengguna dari `GET /api/v1/me/area-scopes?includeDescendants=true`, bukan seluruh master wilayah nasional. Bila scope langsung pengguna berada di bawah provinsi, breadcrumb induknya dilengkapi melalui `GET /api/v1/administrative-areas/:areaId/ancestors`. Setiap dropdown hanya menampilkan anggota scope pada tingkat terkait dan anak langsung dari induk terpilih berdasarkan `parentId`: Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa. Contohnya, pengguna dengan cakupan Provinsi DKI Jakarta hanya melihat DKI Jakarta pada dropdown Provinsi dan hanya Kabupaten/Kota di bawah DKI Jakarta pada dropdown berikutnya. Perubahan induk mereset seluruh pilihan turunannya. Label opsi menyertakan jenis wilayah dan nama induk, misalnya `[Kota] Kota Administrasi Jakarta Selatan — Daerah Khusus Ibukota Jakarta`, agar jalur hierarkinya tetap terlihat. ID wilayah terdalam yang dipilih dikirim ke `areaIds` pada endpoint marker; validasi menerima seluruh versi UUID resmi wilayah, termasuk UUID v5 hasil seed stabil. Parameter endpoint `reportValidity`, `hasCoordinates`, `hasAttachments`, `coordinateSources`, dan `baketStatuses` tetap dipertahankan sebagai kontrak API, tetapi tidak ditampilkan sebagai filter pada halaman Maps Intelijen.

Interaksi marker memakai dua tingkat. Popup peta hanya menampilkan ringkasan feature dari payload marker. Tombol `Lihat Detail` membuka modal dengan Identitas Jaring sebagai informasi pertama dan susunan identitas dua kolom agar informasi panjang tetap mudah dipindai. Untuk feature laporan, modal tidak menampilkan `reportStatus`, `validity`, atau `locationSuitability`; `verificationStatus` dipetakan menjadi label bisnis `Terverifikasi` untuk `VERIFIED_BY_FIELD_OFFICER`/`METADATA_RECORDED` dan `Belum Terverifikasi` untuk state lainnya. Lokasi Aktual Laporan ditampilkan dari urutan `matchedAreas`, dengan `primaryArea` sebagai fallback, bersama koordinat aktual marker; kartu lokasi membuka titik `latitude,longitude` tersebut di Google Maps pada tab baru. Daftar `attachments.items` dipakai untuk menampilkan pratinjau/tautan lampiran melalui `GET /api/files/:fileId`, sedangkan tautan menuju halaman Laporan/Personel juga dibuka pada tab browser baru. Panel filter kiri, ringkasan/feed kanan, dan analitik bawah pada fullscreen dapat dibuka atau ditutup secara independen tanpa mengubah query endpoint.

## Error penting

| HTTP | Kode/kondisi | Penyebab |
|---:|---|---|
| `400` | `MAP_MARKER_DATE_RANGE_INVALID` | `from` lebih besar dari `to`. |
| `400` | `MAP_MARKER_BBOX_INVALID` | `bbox` bukan empat angka valid dengan urutan min/max yang benar. |
| `400` | validasi DTO | Enum, UUID, boolean, atau batas integer tidak valid. |
| `400` | batas freshness | `activeWithinMinutes` lebih besar dari `lastKnownWithinHours × 60`. |
| `401` | unauthenticated | Session tidak tersedia/tidak valid. |
| `403` | forbidden | Role atau domain access tidak mengizinkan akses endpoint. |
