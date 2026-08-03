# DENS CAKRA - Dokumentasi Lengkap Controller API (Request Payload & Response JSON Examples)

> **Status Dokumentasi:** Official, Practical & Comprehensive  
> **Versi Backend:** DENS CAKRA NestJS Backend API v1.0  
> **Tanggal Update:** 3 Agustus 2026  
> **Lokasi File Controller:** `apps/be/src/modules/**/*.controller.ts`  

---

## Standard Response Envelope (Format Pembungkus Respon API)

Seluruh endpoint pada backend DENS CAKRA (kecuali raw byte stream / raw webhook) mengembalikan respon dengan format pembungkus standar `apiResult`:

```json
{
  "status": true,
  "data": { ... },
  "message": "Pesan deskriptif (opsional)",
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 100,
      "totalPages": 2
    },
    "availableActions": ["action.open", "action.submit"],
    "appliedScope": {
      "areaIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      "routeType": "DIRECT_HIERARCHY"
    }
  }
}
```

---

## Modul 1: Access Controller (`AccessController`)
**File:** `apps/be/src/modules/access/access.controller.ts` | **Base Route:** `/access`

### 1.1 `GET /access/roles`
* **Summary:** Ambil katalog sistem role beserta key role.
* **Roles:** Public Internal

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "roles": [
      {
        "key": "admin_system",
        "name": "System Administrator",
        "rank": 1,
        "description": "Pengelola akses teknis sistem"
      },
      {
        "key": "executive",
        "name": "Executive / Pimpinan",
        "rank": 2,
        "description": "Akses kepemimpinan nasional"
      },
      {
        "key": "regional_commander",
        "name": "Regional Commander",
        "rank": 3,
        "description": "Komandan wilayah Binda / Kabinda"
      },
      {
        "key": "operational_intelligence_manager",
        "name": "Operational Intelligence Manager",
        "rank": 4,
        "description": "Manajer operasional intelijen"
      },
      {
        "key": "field_coordinator",
        "name": "Field Coordinator",
        "rank": 5,
        "description": "Koordinator lapangan intelijen"
      },
      {
        "key": "field_officer",
        "name": "Field Officer",
        "rank": 6,
        "description": "Petugas lapangan pengumpul Baket"
      }
    ]
  }
}
```

### 1.2 `GET /access/me`
* **Summary:** Ambil informasi role, user, dan otorisasi efektif user saat ini.
* **Guards:** `SessionGuard`, `DomainAccessGuard`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "user": {
      "id": "c1f2e3d4-5678-90ab-cdef-1234567890ab",
      "email": "oim.jakarta@cakra.id",
      "name": "Mayor Intel Budi Santoso",
      "role": "operational_intelligence_manager"
    },
    "availableRoles": [
      "admin_system",
      "executive",
      "regional_commander",
      "operational_intelligence_manager",
      "field_coordinator",
      "field_officer"
    ],
    "authorizationContext": {
      "userProfileId": "e9b8c7d6-5432-10fe-dcba-9876543210fe",
      "primaryAssignmentId": "f7e6d5c4-3210-98ba-fedc-0123456789ba",
      "roleCode": "operational_intelligence_manager",
      "commandRouteType": "DIRECT_HIERARCHY",
      "areaScopes": [
        {
          "areaId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          "areaName": "DKI Jakarta",
          "isPrimary": true
        }
      ]
    }
  }
}
```

---

## Modul 2: Analysis Workspace (`AnalysisController`)
**File:** `apps/be/src/modules/analysis/analysis.controller.ts` | **Base Route:** `/`

### 2.1 `GET /analysis-cases`
* **Contract ID:** `API-ANL-001`
* **Roles:** `executive`, `regional_commander`, `operational_intelligence_manager`
* **Query Params:** `limit=10&status=IN_REVIEW&search=Pilkada`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": [
    {
      "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
      "caseNumber": "ANL-2026-08-001",
      "title": "Analisis Jaringan Potensi Kericuhan Pilkada Jakarta",
      "status": "IN_REVIEW",
      "priority": "HIGH",
      "createdAt": "2026-08-01T09:00:00.000Z",
      "updatedAt": "2026-08-03T10:15:00.000Z"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1 }
  }
}
```

### 2.2 `POST /analysis-cases`
* **Contract ID:** `API-ANL-002`
* **Roles:** `operational_intelligence_manager`

**Contoh Request Payload (JSON):**
```json
{
  "title": "Analisis Dinamika Ormas Radikal di Wilayah Pesisir",
  "description": "Pengangkatan indikasi pergerakan massa menjelang agenda nasional",
  "priority": "HIGH"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "c2b3a4d5-e6f7-8901-bcde-f234567890ab",
    "caseNumber": "ANL-2026-08-002",
    "title": "Analisis Dinamika Ormas Radikal di Wilayah Pesisir",
    "description": "Pengangkatan indikasi pergerakan massa menjelang agenda nasional",
    "status": "DRAFT",
    "priority": "HIGH",
    "createdByAssignmentId": "f7e6d5c4-3210-98ba-fedc-0123456789ba",
    "createdAt": "2026-08-03T14:20:00.000Z"
  },
  "message": "Analysis case created successfully."
}
```

### 2.3 `POST /analysis-cases/:caseId/finalize`
* **Contract ID:** `API-ANL-017`
* **Roles:** `operational_intelligence_manager`

**Contoh Request Payload (JSON):**
```json
{
  "note": "Analisis telah divalidasi dan disetujui untuk dijadikan rujukan penyusunan Produk Intelijen."
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "b1a2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "FINALIZED",
    "finalizedAt": "2026-08-03T15:00:00.000Z",
    "activeVersionNumber": 2
  },
  "message": "Analysis case finalized successfully."
}
```

### 2.4 `PUT /analysis-versions/:versionId/entities`
* **Contract ID:** `API-ANL-010`
* **Roles:** `operational_intelligence_manager`

**Contoh Request Payload (JSON):**
```json
{
  "entities": [
    {
      "name": "Kelompok Pemuda X",
      "type": "ORGANIZATION",
      "properties": {
        "leader": "Ahmad R.",
        "estimatedMembers": 150,
        "baseLocation": "Tanjung Priok"
      }
    },
    {
      "name": "Pelabuhan Kalibaru",
      "type": "LOCATION",
      "properties": {
        "coordinate": "-6.105, 106.901"
      }
    }
  ]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "versionId": "d3c2b1a0-9876-5432-10fe-dcba98765432",
    "totalEntities": 2,
    "entities": [
      {
        "id": "e1-uuid",
        "name": "Kelompok Pemuda X",
        "type": "ORGANIZATION"
      },
      {
        "id": "e2-uuid",
        "name": "Pelabuhan Kalibaru",
        "type": "LOCATION"
      }
    ]
  }
}
```

### 2.5 `GET /analysis-cases/:caseId/graph`
* **Contract ID:** `API-ANL-013`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "nodes": [
      { "id": "e1", "label": "Kelompok Pemuda X", "type": "ORGANIZATION" },
      { "id": "e2", "label": "Pelabuhan Kalibaru", "type": "LOCATION" }
    ],
    "edges": [
      { "source": "e1", "target": "e2", "relationship": "OPERATES_IN", "weight": 0.85 }
    ]
  }
}
```

---

## Modul 3: Administrative Areas & Spatial Services (`AreaController`)
**File:** `apps/be/src/modules/areas/area.controller.ts` | **Base Route:** `/`

### 3.1 `GET /administrative-areas`
* **Contract ID:** `API-AREA-001`
* **Query Params:** `level=KABUPATEN_KOTA&parentId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": [
    {
      "id": "f1234567-89ab-cdef-0123-456789abcdef",
      "code": "31.71",
      "name": "Kota Jakarta Selatan",
      "level": "KABUPATEN_KOTA",
      "parentId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "latitude": -6.2615,
      "longitude": 106.8106
    }
  ],
  "meta": {
    "pagination": { "page": 1, "pageSize": 50, "total": 1, "totalPages": 1 }
  }
}
```

### 3.2 `POST /administrative-areas/resolve-coordinate`
* **Contract ID:** `API-AREA-010`
* **Roles:** `admin_system`

**Contoh Request Payload (JSON):**
```json
{
  "latitude": -6.175392,
  "longitude": 106.827153
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "province": { "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "name": "DKI Jakarta" },
    "regency": { "id": "b123...", "name": "Kota Jakarta Pusat" },
    "district": { "id": "c234...", "name": "Gambir" },
    "village": { "id": "d345...", "name": "Gambir" },
    "resolvedLevel": "DESA_KELURAHAN"
  }
}
```

### 3.3 `POST /administrative-area-imports`
* **Contract ID:** `API-AREA-017`
* **Roles:** `admin_system`

**Contoh Request Payload (JSON):**
```json
{
  "sourceUrl": "https://storage.cakra.id/imports/batas_desa_2026.geojson",
  "format": "GEOJSON",
  "notes": "Import pembaruan batas desa BPS 2026"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "jobId": "j9876543-2109-87ba-fedc-0123456789ab",
    "status": "QUEUED",
    "type": "AREA_IMPORT",
    "createdAt": "2026-08-03T15:30:00.000Z"
  },
  "message": "Import area job has been enqueued."
}
```

---

## Modul 4: Audit & Compliance (`AuditController`)
**File:** `apps/be/src/modules/audit/audit.controller.ts` | **Base Route:** `/`

### 4.1 `GET /audit-logs`
* **Contract ID:** `API-AUD-001`
* **Roles:** `admin_system`
* **Query Params:** `limit=10&action=BAKET.SUBMIT`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-123456789012",
      "action": "BAKET.SUBMIT",
      "entityType": "Baket",
      "entityId": "baket-uuid-123",
      "ipAddress": "182.253.12.44",
      "createdAt": "2026-08-03T12:00:00.000Z",
      "actorUser": {
        "id": "usr-uuid-1",
        "username": "fo.priok",
        "fullName": "Sertu Ahmad"
      }
    }
  ]
}
```

### 4.2 `POST /audit-exports`
* **Contract ID:** `API-AUD-004`
* **Roles:** `admin_system`

**Contoh Request Payload (JSON):**
```json
{
  "filters": {
    "from": "2026-08-01T00:00:00Z",
    "to": "2026-08-03T23:59:59Z",
    "entityType": "Baket"
  },
  "format": "CSV",
  "reason": "Permintaan audit kepatuhan pengolahan Baket bulanan"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "jobId": "export-job-uuid-777",
    "type": "AUDIT_EXPORT",
    "status": "QUEUED"
  },
  "message": "Audit export requested successfully."
}
```

---

## Modul 5: Baket & Formal Verification (`BaketController`)
**File:** `apps/be/src/modules/baket/baket.controller.ts` | **Base Route:** `/`

### 5.1 `GET /bakets`
* **Contract ID:** `API-BAK-001`
* **Query Params:** `status=SUBMITTED&limit=10`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": [
    {
      "id": "baket-001-uuid",
      "baketNumber": "BAKET/2026/08/005",
      "title": "Laporan Pergerakan Pokmas di Tanjung Priok",
      "category": "POLEKSOSBUD",
      "status": "SUBMITTED",
      "urgency": "HIGH",
      "createdAt": "2026-08-03T11:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1 },
    "availableActions": ["baket.open", "verification.start"],
    "appliedScope": {
      "areaIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      "routeType": "DIRECT_HIERARCHY"
    }
  }
}
```

### 5.2 `POST /bakets`
* **Contract ID:** `API-BAK-002`
* **Roles:** `field_officer`

**Contoh Request Payload (JSON):**
```json
{
  "title": "Dugaan Penyelundupan Barang Tanpa Dokumen di Dermaga 9",
  "content": "Berdasarkan pengamatan di lapangan pada tanggal 3 Agustus pukul 02:00 WIB, ditemukan aktivitas bongkar muat mencurigakan dari kapal kayu tanpa nama...",
  "category": "KEAMANAN",
  "urgency": "HIGH",
  "eventDate": "2026-08-03T02:00:00.000Z",
  "latitude": -6.1023,
  "longitude": 106.8841,
  "attachmentFileIds": ["file-uuid-1", "file-uuid-2"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "baket-new-uuid",
    "baketNumber": "BAKET/2026/08/012",
    "title": "Dugaan Penyelundupan Barang Tanpa Dokumen di Dermaga 9",
    "status": "DRAFT",
    "createdAt": "2026-08-03T15:40:00.000Z"
  },
  "message": "Baket draft created successfully."
}
```

### 5.3 `PATCH /verifications/:verificationId`
* **Contract ID:** `API-VER-005`
* **Roles:** `operational_intelligence_manager`

**Contoh Request Payload (JSON):**
```json
{
  "sourceReliability": "B",
  "informationCredibility": "2",
  "evaluationNotes": "Sumber informasi terpercaya (B) dan informasi dikonfirmasi oleh laporan intelijen pendukung (2)."
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "verificationId": "verif-uuid-101",
    "sourceReliability": "B",
    "informationCredibility": "2",
    "combinedGrade": "B2",
    "status": "IN_PROGRESS",
    "updatedAt": "2026-08-03T15:45:00.000Z"
  }
}
```

---

## Modul 6: Directives (`DirectiveController`)
**File:** `apps/be/src/modules/directives/directive.controller.ts` | **Base Route:** `/`

### 6.1 `POST /directives/ai-recommendation`
* **Contract ID:** `API-DIR-AI-001`
* **Roles:** `executive`

**Contoh Request Payload (JSON):**
```json
{
  "strategicGoal": "Pengetatan Keamanan Pesisir Utara Menjelang KTT Internasional",
  "targetRegion": "DKI Jakarta",
  "priority": "URGENT"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "recommendedTitle": "Direktif Strategis Peningkatan Patroli & Deteksi Dini Pesisir Utara",
    "draftContent": "1. Tingkatkan pemantauan 24/7 di titik rawan dermaga tikus.\n2. Koordinasikan deteksi dini agen Jaring maritim...",
    "suggestedRecipients": ["Unit Binda Jakarta", "Direktorat Wilayah II"],
    "suggestedPriority": "URGENT"
  }
}
```

### 6.2 `POST /directives`
* **Contract ID:** `API-DIR-002`
* **Roles:** `executive`

**Contoh Request Payload (JSON):**
```json
{
  "title": "Direktif Operasi Siaga Intelijen Pilkada 2026",
  "content": "Instruksi kepada seluruh jajaran Binda untuk meningkatkan pemetaan potensi konflik politik daerah...",
  "priority": "HIGH",
  "targetAreaIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
  "recipientUnitIds": ["unit-binda-jkt-uuid"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "dir-uuid-001",
    "directiveNumber": "DIR/2026/08/001",
    "title": "Direktif Operasi Siaga Intelijen Pilkada 2026",
    "status": "DRAFT",
    "createdAt": "2026-08-03T14:00:00.000Z"
  }
}
```

---

## Modul 7-9: Personnel Controllers (`ExecutivePersonnelController`, etc.)
**File:** `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts`

### 7.1 `GET /executive/personnel`
* **Contract ID:** `API-EXECUTIVE-PERSONNEL-001`
* **Roles:** `executive`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": [
    {
      "userProfileId": "usr-prof-1",
      "fullName": "Kapten Inf Rian Permana",
      "rank": "Kapten",
      "positionTitle": "Posda Tanjung Priok",
      "unitName": "Binda DKI Jakarta",
      "status": "ACTIVE",
      "lastLocationPing": {
        "latitude": -6.1023,
        "longitude": 106.8841,
        "updatedAt": "2026-08-03T15:20:00.000Z"
      }
    }
  ],
  "meta": {
    "pagination": { "page": 1, "pageSize": 50, "total": 1, "totalPages": 1 }
  }
}
```

---

## Modul 10: File Assets (`FileController`)
**File:** `apps/be/src/modules/files/file.controller.ts` | **Base Route:** `/files`

### 10.1 `POST /files/presign`
* **Contract ID:** `API-FILE-001`

**Contoh Request Payload (JSON):**
```json
{
  "filename": "foto_dermaga_kejadian.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 2048500,
  "category": "IMAGE"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "fileId": "file-uuid-999",
    "uploadUrl": "http://localhost:3000/api/v1/storage/uploads/upload-token-xyz123",
    "storageKey": "2026/08/03/file-uuid-999.jpg",
    "expiresAt": "2026-08-03T16:45:00.000Z"
  }
}
```

### 10.2 `POST /files/complete`
* **Contract ID:** `API-FILE-002`

**Contoh Request Payload (JSON):**
```json
{
  "fileId": "file-uuid-999"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "fileId": "file-uuid-999",
    "filename": "foto_dermaga_kejadian.jpg",
    "status": "READY",
    "sizeBytes": 2048500
  },
  "message": "File upload confirmed."
}
```

---

## Modul 11: Health & Diagnostics (`HealthController`)
**File:** `apps/be/src/modules/health/health.controller.ts` | **Base Route:** `/health`

### 11.1 `GET /health/ready`
* **Contract ID:** `API-SYS-006`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "status": "ok",
    "database": { "connected": true, "latencyMs": 4 },
    "vault": { "initialized": true }
  }
}
```

---

## Modul 12: Identity Context (`IdentityController`)
**File:** `apps/be/src/modules/identity/identity.controller.ts` | **Base Route:** `/me`

### 12.1 `POST /me/session-network`
* **Contract ID:** `API-CTX-005`

**Contoh Request Payload (JSON):**
```json
{
  "ipAddress": "182.253.12.44"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "sessionId": "sess-uuid-111",
    "ipAddress": "182.253.12.44",
    "locationLabel": "Jakarta, Indonesia",
    "updatedAt": "2026-08-03T15:50:00.000Z"
  }
}
```

---

## Modul 14: Integration Administration (`IntegrationController`)
**File:** `apps/be/src/modules/integrations/integration.controller.ts` | **Base Route:** `/`

### 14.1 `PATCH /integration-channels/whatsapp-control/:channelId`
* **Contract ID:** `API-INT-012`
* **Roles:** `admin_system`, `field_coordinator`

**Contoh Request Payload (JSON):**
```json
{
  "phoneNumber": "+6281299887766",
  "botName": "CAKRA BOT FO JAKARTA",
  "autoRoutingEnabled": true
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "channelId": "chan-wa-001",
    "phoneNumber": "+6281299887766",
    "botName": "CAKRA BOT FO JAKARTA",
    "autoRoutingEnabled": true,
    "status": "ACTIVE"
  }
}
```

---

## Modul 15: Intelligence Products & Decision Support (`IntelligenceProductsController`)
**File:** `apps/be/src/modules/intelligence-products/intelligence-products.controller.ts` | **Base Route:** `/`

### 15.1 `POST /products`
* **Contract ID:** `API-PRD-002`
* **Roles:** `operational_intelligence_manager`

**Contoh Request Payload (JSON):**
```json
{
  "productTypeId": "type-laporan-harian-uuid",
  "title": "Laporan Hariawn Intelijen Khusus Wilayah Pelabuhan Priok",
  "classification": "RAHASIA",
  "content": {
    "ringkasanEksekutif": "Situasi pelabuhan kondusif dengan catatan pergerakan massa lokal.",
    "substansiInformasi": "Telah terjadi pertemuaan tokoh kelompok pemuda...",
    "prediksiTingkatAncaman": "SEDANG"
  },
  "sourceVerificationIds": ["verif-uuid-101"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "prod-uuid-555",
    "productNumber": "LAP-HAR/2026/08/001",
    "title": "Laporan Harian Intelijen Khusus Wilayah Pelabuhan Priok",
    "status": "DRAFT",
    "classification": "RAHASIA",
    "createdAt": "2026-08-03T15:55:00.000Z"
  }
}
```

### 15.2 `POST /approval-steps/:stepId/approve`
* **Contract ID:** `API-APR-005`
* **Roles:** `regional_commander`

**Contoh Request Payload (JSON):**
```json
{
  "note": "Disetujui untuk disebarkan ke pimpinan dan jajaran terkait."
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "stepId": "step-uuid-1",
    "status": "APPROVED",
    "approvedAt": "2026-08-03T16:00:00.000Z",
    "workflowStatus": "COMPLETED"
  },
  "message": "Approval step approved."
}
```

### 15.3 `POST /emergency-incidents`
* **Contract ID:** `API-EMG-002`

**Contoh Request Payload (JSON):**
```json
{
  "title": "Laporan Sinyal Darurat Bentrok Antar Kelompok di Priok",
  "description": "Terjadi konsentrasi massa membawa senjata tajam di pintu masuk Pelabuhan 3",
  "severity": "CRITICAL",
  "latitude": -6.1033,
  "longitude": 106.8855
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "incidentId": "emg-uuid-001",
    "incidentCode": "EMG/2026/08/001",
    "status": "REPORTED",
    "severity": "CRITICAL",
    "createdAt": "2026-08-03T16:05:00.000Z"
  },
  "message": "Emergency incident signal reported successfully."
}
```

---

## Modul 16: Jaring Management (`JaringController`)
**File:** `apps/be/src/modules/jaring/jaring.controller.ts` | **Base Route:** `/jaring`

### 16.1 `POST /jaring`
* **Contract ID:** `API-JAR-002`
* **Roles:** `field_officer`

**Contoh Request Payload (JSON):**
```json
{
  "codeName": "ELANG-01",
  "realName": "Bambang Supriyanto",
  "occupationId": "occ-nelayan-uuid",
  "phoneNumber": "+6281311223344",
  "areaIds": ["area-priok-uuid"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "jar-uuid-001",
    "codeName": "ELANG-01",
    "status": "PENDING_APPROVAL",
    "generatedPin": "849201",
    "createdAt": "2026-08-03T16:10:00.000Z"
  },
  "message": "Jaring agent registration submitted."
}
```

### 16.2 `POST /jaring/reports/:reportSessionId/verify`
* **Contract ID:** `API-JAR-017`
* **Roles:** `field_officer`

**Contoh Request Payload (JSON):**
```json
{
  "isRelevant": true,
  "initialRelevanceNotes": "Informasi relevan dengan pergerakan kapal malam hari",
  "assignedCategory": "POLEKSOSBUD"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "reportSessionId": "rep-sess-uuid-1",
    "isVerified": true,
    "status": "VERIFIED_VALID",
    "verifiedAt": "2026-08-03T16:15:00.000Z"
  }
}
```

---

## Modul 17: Map Markers (`MapMarkersController`)
**File:** `apps/be/src/modules/map-markers/map-markers.controller.ts` | **Base Route:** `/map`

### 17.1 `GET /map/markers`
* **Contract ID:** `API-MAP-MARKERS-001`
* **Query Params:** `minLat=-6.2&maxLat=-6.0&minLng=106.7&maxLng=106.9`

**Contoh Response JSON (GeoJSON FeatureCollection):**
```json
{
  "status": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [106.8841, -6.1023] },
        "properties": {
          "id": "baket-001-uuid",
          "markerType": "BAKET",
          "title": "Laporan Pergerakan Pokmas",
          "category": "POLEKSOSBUD",
          "urgency": "HIGH"
        }
      },
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [106.885, -6.103] },
        "properties": {
          "id": "personnel-001-uuid",
          "markerType": "PERSONNEL",
          "fullName": "Sertu Ahmad",
          "position": "Field Officer Priok"
        }
      }
    ]
  },
  "meta": {
    "availableActions": ["baket.open", "personnel.open"]
  }
}
```

---

## Modul 18: Notifications (`NotificationController`)
**File:** `apps/be/src/modules/notifications/notification.controller.ts` | **Base Route:** `/notifications`

### 18.1 `GET /notifications`
* **Contract ID:** `API-NOT-001`

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": [
    {
      "id": "notif-uuid-1",
      "title": "Tugas Baru Ditugaskan",
      "message": "Anda ditunjuk melaksanakan Tugas Patroli Priok",
      "isRead": false,
      "linkUrl": "/tasks/task-uuid-1",
      "createdAt": "2026-08-03T16:00:00.000Z"
    }
  ]
}
```

---

## Modul 19: Organization Structure (`OrganizationController`)
**File:** `apps/be/src/modules/organization/organization.controller.ts` | **Base Route:** `/organization-units`

### 19.1 `POST /organization-units`
* **Contract ID:** `API-ORG-002`
* **Roles:** `admin_system`

**Contoh Request Payload (JSON):**
```json
{
  "code": "BINDA-DKI",
  "name": "Badan Intelijen Daerah DKI Jakarta",
  "type": "BINDA",
  "parentId": "unit-mabes-uuid"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "unit-binda-dki-uuid",
    "code": "BINDA-DKI",
    "name": "Badan Intelijen Daerah DKI Jakarta",
    "type": "BINDA",
    "parentId": "unit-mabes-uuid",
    "createdAt": "2026-08-03T16:20:00.000Z"
  }
}
```

---

## Modul 20: Positions & Assignments (`PositionController`)
**File:** `apps/be/src/modules/positions/position.controller.ts` | **Base Route:** `/`

### 20.1 `POST /position-assignments`
* **Contract ID:** `API-ASG-002`
* **Roles:** `admin_system`

**Contoh Request Payload (JSON):**
```json
{
  "userProfileId": "usr-prof-1",
  "positionId": "pos-posda-priok-uuid",
  "validFrom": "2026-08-01T00:00:00Z",
  "isPrimary": true,
  "reason": "Penugasan rutin sebagai Katim Posda Priok"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "assignmentId": "asg-uuid-999",
    "userProfileId": "usr-prof-1",
    "positionId": "pos-posda-priok-uuid",
    "isPrimary": true,
    "validFrom": "2026-08-01T00:00:00.000Z"
  }
}
```

---

## Modul 24: Tasks & Execution Cascade (`TaskController`)
**File:** `apps/be/src/modules/tasks/task.controller.ts` | **Base Route:** `/`

### 24.1 `POST /tasks`
* **Contract ID:** `API-TASK-002`
* **Roles:** `regional_commander`, `operational_intelligence_manager`, `field_coordinator`

**Contoh Request Payload (JSON):**
```json
{
  "title": "Pemantauan Pelabuhan Tikus Tanjung Priok",
  "description": "Lakukan verifikasi dan pengumpulan Baket terkait isu pergerakan barang ilegal",
  "priority": "HIGH",
  "deadline": "2026-08-05T18:00:00.000Z",
  "targetAreaIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
  "assignedAssignmentIds": ["asg-uuid-999"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "id": "task-uuid-001",
    "taskNumber": "TSK/2026/08/001",
    "title": "Pemantauan Pelabuhan Tikus Tanjung Priok",
    "status": "ASSIGNED",
    "createdAt": "2026-08-03T16:25:00.000Z"
  }
}
```

### 24.2 `POST /task-assignments/:assignmentId/progress`
* **Contract ID:** `API-TASK-013`
* **Roles:** `field_officer`

**Contoh Request Payload (JSON):**
```json
{
  "percentage": 75,
  "notes": "Telah dilakukan pemantauan di 3 titik dermaga, situasi aman terkendali.",
  "attachmentFileIds": ["file-uuid-999"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "assignmentId": "task-asg-uuid-1",
    "percentage": 75,
    "updatedAt": "2026-08-03T16:30:00.000Z"
  },
  "message": "Task progress updated successfully."
}
```

---

## Modul 25: User Provisioning & Profiles (`UserProfileController`)
**File:** `apps/be/src/modules/users/user-profile.controller.ts` | **Base Route:** `/user-profiles`

### 25.1 `POST /user-profiles/provision`
* **Contract ID:** `API-USR-002`
* **Roles:** `admin_system`

**Contoh Request Payload (JSON):**
```json
{
  "email": "fo.priok@cakra.id",
  "username": "fo.priok",
  "fullName": "Sertu Ahmad Dahlan",
  "password": "PasswordSuperAman123!",
  "positionId": "pos-fo-priok-uuid",
  "roleCode": "field_officer",
  "areaIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "userProfileId": "prof-new-uuid",
    "userId": "usr-new-uuid",
    "username": "fo.priok",
    "email": "fo.priok@cakra.id",
    "status": "ACTIVE",
    "assignmentId": "asg-new-uuid"
  },
  "message": "User was provisioned successfully."
}
```

---

## Modul 27: WhatsApp Intake (`WhatsAppController`)
**File:** `apps/be/src/modules/whatsapp/whatsapp.controller.ts` | **Base Route:** `/`

### 27.1 `POST /webhooks/whatsapp/:channelCode`
* **Contract ID:** `API-WA-001`
* **Headers:** `x-webhook-signature: sha256=abcdef123456...`

**Contoh Request Payload (JSON):**
```json
{
  "messageId": "WAMID-1234567890",
  "fromNumber": "+628123456789",
  "senderName": "Informan Rahasia",
  "messageText": "Lapor komandan, ada 2 truk mencurigakan masuk Dermaga 9 pukul 02.00 WIB",
  "timestamp": "2026-08-03T02:05:00Z",
  "location": {
    "latitude": -6.1023,
    "longitude": 106.8841
  },
  "mediaFiles": [
    {
      "url": "https://mmg.whatsapp.net/v/t61/photo.jpg",
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "received": true,
    "internalMessageId": "wa-msg-uuid-001"
  },
  "message": "Webhook processed successfully."
}
```

### 27.2 `POST /whatsapp-messages/:messageId/create-baket`
* **Contract ID:** `API-WA-011`
* **Roles:** `field_officer`

**Contoh Request Payload (JSON):**
```json
{
  "title": "Baket Hasil Intake WA: Truk Mencurigakan Dermaga 9",
  "summary": "Konversi pesan WA agen mengenai truk tanpa izin bongkar di dermaga 9",
  "classification": "BIASA"
}
```

**Contoh Response JSON:**
```json
{
  "status": true,
  "data": {
    "baketId": "baket-converted-uuid",
    "baketNumber": "BAKET/2026/08/015",
    "sourceMessageId": "wa-msg-uuid-001",
    "status": "DRAFT"
  },
  "message": "Baket created from WhatsApp message."
}
```

---

## Kesimpulan

Dokumen ini melengkapi spesifikasi seluruh controller pada aplikasi DENS CAKRA dengan **contoh nyata Request Payload (JSON)** dan **Response JSON (Envelope Standard)** untuk setiap operasi API.
