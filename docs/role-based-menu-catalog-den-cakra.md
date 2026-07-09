# Role-Based Menu Catalog — DEN CAKRA

| Field | Value |
|---|---|
| Document | Role-Based Menu Catalog |
| Product | DEN CAKRA |
| Version | 0.1 |
| Date | 09 Juli 2026 |
| Author | Product Architect |
| Status | Draft |

## Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 0.1 | 09 Juli 2026 | Product Architect | Initial draft daftar menu berbasis role untuk kebutuhan MVP planning |

---

## 1. Purpose

Dokumen ini mendefinisikan daftar menu yang dibutuhkan oleh masing-masing role pada aplikasi DEN CAKRA berdasarkan alur kerja yang telah disepakati dan masukan kebutuhan aplikasi.

Dokumen ini belum mendefinisikan detail functional requirement, UI final, database structure, atau API specification. Fokus dokumen ini adalah:

1. Menentukan struktur menu utama per role.
2. Memisahkan menu berdasarkan kebutuhan kerja tiap role.
3. Menjadi dasar penyusunan MVP backlog.
4. Menjadi acuan awal untuk desain sidebar/navigation dan permission matrix.
5. Menandai fitur yang belum menjadi prioritas implementasi sebagai **Planned / Soon**.

---

## 2. Scope

### 2.1 In Scope

Dokumen ini mencakup daftar menu untuk role berikut:

1. Executive
2. Regional Commander
3. Operational Intelligence Manager
4. Field Coordinator
5. Field Officer
6. WA Center / System Intake
7. Admin System
8. Supporting / Extended Role

### 2.2 Out of Scope

Hal berikut belum dibahas secara detail pada dokumen ini:

1. Detail business process per menu.
2. User story dan acceptance criteria.
3. Wireframe per halaman.
4. ERD.
5. API specification.
6. Detail role permission sampai level action.
7. Prioritas sprint implementasi.

---

## 3. Role Baseline

| System Role | Mapping Jabatan | Fungsi Utama |
|---|---|---|
| Executive | Deputi II | Membuat STR/UUK, memberi arahan strategis, memantau dashboard, menerima hasil akhir intelijen |
| Regional Commander | Direktur Wilayah / Kabinda | Mengendalikan wilayah, menerima direktif, melakukan review dan approval laporan |
| Operational Intelligence Manager | Kasubdit / Kabagops | Mengelola assignment, menerima dan memproses BAKET, melakukan verifikasi dan analisis |
| Field Coordinator | Korwil | Membagi tugas ke Field Officer, memonitor personel, progres, GPS, dan panic alert |
| Field Officer | Petugas Organik | Melaksanakan tugas lapangan, membina Jaring, memvalidasi informasi, membuat BAKET |
| Jaring / External Intelligence Source | Jaring Agen | Mengirim informasi mentah melalui WA Center |
| WA Center / System Intake | Gateway Sistem | Menerima informasi mentah, membuat Incoming Information, melakukan routing |
| Admin System | Admin Teknis | Mengelola user, role, konfigurasi sistem, keamanan, dan audit log |

---

## 4. Menu Design Principles

Menu aplikasi DEN CAKRA harus mengikuti prinsip berikut:

1. **Role-Based Navigation**  
   Setiap role hanya melihat menu yang relevan dengan tugas dan kewenangannya.

2. **Need-to-Know Access**  
   Data sensitif hanya dapat diakses oleh role yang memiliki kebutuhan operasional dan clearance yang sesuai.

3. **Workflow-Oriented Menu**  
   Menu tidak disusun berdasarkan struktur database, tetapi berdasarkan alur kerja pengguna.

4. **Top-Down and Bottom-Up Support**  
   Menu harus mendukung dua arus utama:
   - Top-down command flow.
   - Bottom-up intelligence flow.

5. **Separation of Assignment and Field Tasking**  
   Assignment dari OIM ke Field Coordinator harus dipisahkan dari task distribution dari Field Coordinator ke Field Officer.

6. **WA Center Is Intake Gateway Only**  
   WA Center hanya menghasilkan Incoming Information, bukan BAKET.

7. **Field Officer as Gatekeeper**  
   BAKET hanya dibuat setelah Field Officer memvalidasi Incoming Information.

---

## 5. Menu Catalog by Role

---

### 5.1 Executive Menu

#### Role Objective

Executive menggunakan sistem untuk membuat arahan strategis, memantau situasi nasional/wilayah, menerima laporan intelijen yang telah disetujui, dan membuat kebutuhan strategis lanjutan.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Executive Dashboard | Menampilkan situational awareness, peta kerawanan, status UUK, early warning, dan ringkasan strategis | Planned / Soon |
| Dashboard | Strategic Situation Map | Peta nasional/wilayah dengan layer isu Ipoleksosbudhankam | Planned / Soon |
| Dashboard | Early Warning Indicator | Menampilkan eskalasi isu, anomali, dan indikator peringatan dini | Planned / Soon |
| Directive | STR / Directive Management | Membuat, melihat, dan mengelola STR berisi UUK/KIQ/PIR | Planned / Soon |
| Directive | Create STR | Form pembuatan STR atau arahan strategis baru | Planned / Soon |
| Directive | Directive Tracking | Melihat status arahan: sent, read, assigned, in progress, completed, overdue | Planned / Soon |
| Directive | Follow-up Strategic Need | Membuat arahan lanjutan berdasarkan laporan intelijen yang sudah approved | Planned / Soon |
| Reports | Approved Intelligence Reports | Melihat laporan intelijen yang sudah disetujui | Planned / Soon |
| Reports | Executive Briefing | Generate ringkasan eksekutif dari laporan terverifikasi | Planned / Soon |
| Reports | Report Drill-down | Drill-down dari insight dashboard ke laporan pendukung | Planned / Soon |
| Monitoring | National Operation Monitoring | Memantau status operasi dan pemenuhan UUK secara nasional | Planned / Soon |
| Monitoring | Regional Performance Overview | Melihat performa wilayah berdasarkan progres tugas dan laporan | Planned / Soon |
| Notification | Strategic Alerts | Notifikasi untuk isu strategis, kondisi darurat, dan laporan penting | Planned / Soon |
| Settings | Profile & Security | Pengaturan profil, password, MFA, dan perangkat aktif | Planned / Soon |

---

### 5.2 Regional Commander Menu

#### Role Objective

Regional Commander menggunakan sistem untuk menerima direktif dari Executive, mengendalikan wilayah, menurunkan arahan ke OIM, melakukan review draft report, dan menyetujui atau mengembalikan laporan.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Regional Dashboard | Ringkasan kondisi wilayah, progres tugas, laporan masuk, dan status pemenuhan UUK | Planned / Soon |
| Dashboard | Regional Risk Map | Peta kerawanan wilayah berbasis provinsi/kabupaten/kota | Planned / Soon |
| Directive | Directive Inbox | Menerima STR/UUK dari Executive | Planned / Soon |
| Directive | Regional Command Direction | Menurunkan arahan wilayah kepada OIM | Planned / Soon |
| Directive | Directive Progress | Memantau progres pelaksanaan direktif di wilayah | Planned / Soon |
| Assignment | Assignment Overview | Melihat assignment yang sedang dikerjakan oleh OIM dan jajaran bawah | Planned / Soon |
| Reports | Draft Intelligence Report Review | Melihat draft laporan dari OIM untuk proses review | Planned / Soon |
| Reports | Approval Workspace | Approve, return, atau reject draft laporan | Planned / Soon |
| Reports | Revision Feedback | Memberikan catatan wajib saat laporan dikembalikan | Planned / Soon |
| Reports | Approved Regional Reports | Melihat laporan wilayah yang sudah disetujui | Planned / Soon |
| Monitoring | Personnel Overview | Melihat ringkasan status personel wilayah sesuai kewenangan | Planned / Soon |
| Monitoring | Report Pipeline | Funnel laporan: incoming, verified, analyzed, draft, approved | Planned / Soon |
| Monitoring | Panic Alert Monitor | Melihat alert darurat dari wilayah yang menjadi tanggung jawabnya | Planned / Soon |
| Notification | Regional Alerts | Notifikasi laporan kritis, eskalasi wilayah, approval request, dan panic alert | Planned / Soon |
| Settings | Profile & Security | Pengaturan akun dan keamanan | Planned / Soon |

---

### 5.3 Operational Intelligence Manager Menu

#### Role Objective

Operational Intelligence Manager adalah pusat pengelolaan assignment dan pemrosesan intelijen. Role ini menerima arahan dari atas, meneruskan assignment ke Field Coordinator, menerima BAKET, melakukan verifikasi, penilaian, analisis, kompilasi, dan membuat Draft Intelligence Report.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | OIM Dashboard | Menampilkan tugas aktif, BAKET masuk, laporan dalam proses, dan status verifikasi | Planned / Soon |
| Directive | Directive / Assignment Inbox | Menerima arahan dari Regional Commander | Planned / Soon |
| Assignment | Assignment Management | Membuat dan meneruskan assignment ke Field Coordinator | Planned / Soon |
| Assignment | Create Assignment | Form pembuatan assignment dengan target, UUK, wilayah, deadline, prioritas | Planned / Soon |
| Assignment | Assignment Progress | Memantau status assignment yang sudah diturunkan | Planned / Soon |
| BAKET | BAKET Inbox | Menerima BAKET dari Field Officer | Planned / Soon |
| BAKET | BAKET Detail | Melihat isi BAKET, lampiran, sumber, lokasi, dan UUK terkait | Planned / Soon |
| BAKET | BAKET Verification | Memeriksa kelengkapan dan validitas BAKET | Planned / Soon |
| BAKET | Return BAKET | Mengembalikan BAKET jika belum lengkap atau tidak memenuhi standar | Planned / Soon |
| Assessment | Neraca Penilaian | Memberikan penilaian sumber A–F dan isi informasi 1–6 | Planned / Soon |
| Assessment | Assessment Matrix | Melakukan penilaian risiko, dampak, eskalasi, dan korelasi | Planned / Soon |
| Analysis | Initial Analysis | Menulis analisis awal atas BAKET terverifikasi | Planned / Soon |
| Analysis | Compilation Workspace | Menggabungkan beberapa BAKET menjadi bahan laporan | Planned / Soon |
| Analysis | AI Offline Review | Melihat hasil ekstraksi AI dan melakukan human validation | Planned / Soon |
| Reports | Draft Report Builder | Membuat Draft Intelligence Report atau produk intelijen lain | Planned / Soon |
| Reports | Submit for Approval | Mengirim draft laporan ke Regional Commander | Planned / Soon |
| Reports | Revision Queue | Melihat laporan yang dikembalikan untuk diperbaiki | Planned / Soon |
| Notification | OIM Notifications | Notifikasi BAKET masuk, assignment overdue, return report, dan approval status | Planned / Soon |
| Settings | Profile & Security | Pengaturan akun dan keamanan | Planned / Soon |

---

### 5.4 Field Coordinator Menu

#### Role Objective

Field Coordinator menerima assignment dari OIM, membaginya menjadi tugas lapangan untuk Field Officer, memonitor progres, GPS personel, dan menangani alert darurat.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Field Coordination Dashboard | Ringkasan assignment, task aktif, personel, overdue, dan alert | Planned / Soon |
| Assignment | Assignment Inbox | Menerima assignment dari OIM | Planned / Soon |
| Assignment | Assignment Detail | Melihat detail assignment, UUK, target, wilayah, dan deadline | Planned / Soon |
| Tasking | Field Task Management | Membagi assignment menjadi task untuk Field Officer | Planned / Soon |
| Tasking | Create Field Task | Membuat tugas lapangan untuk Field Officer tertentu | Planned / Soon |
| Tasking | Task Distribution | Mengatur pembagian tugas berdasarkan wilayah, kapasitas, dan prioritas | Planned / Soon |
| Tasking | Task Progress Monitoring | Memantau status tugas: not started, in progress, pending, completed, overdue | Planned / Soon |
| Personnel | Personnel Map | Memantau posisi Field Officer sesuai kewenangan | Planned / Soon |
| Personnel | Personnel Status | Melihat status online/offline, aktif tugas, idle, atau emergency | Planned / Soon |
| Personnel | Workload Monitor | Melihat beban kerja tiap Field Officer | Planned / Soon |
| Alert | Panic Alert Center | Menerima dan merespons panic alert dari Field Officer | Planned / Soon |
| Alert | Emergency Report Detail | Melihat situasi, lokasi, tindakan awal, dan kebutuhan bantuan | Planned / Soon |
| Reports | Field Submission Monitor | Melihat submission BAKET dari Field Officer | Planned / Soon |
| Reports | Return to Field Officer | Mengembalikan tugas/laporan jika belum lengkap | Planned / Soon |
| Notification | Field Coordination Alerts | Notifikasi assignment baru, task overdue, emergency, dan revisi | Planned / Soon |
| Settings | Profile & Security | Pengaturan akun dan keamanan | Planned / Soon |

---

### 5.5 Field Officer Menu

#### Role Objective

Field Officer melaksanakan tugas lapangan, membina Jaring, menerima Incoming Information dari WA Center, melakukan validasi, membuat BAKET, dan mengirimkan BAKET ke OIM.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | My Field Dashboard | Ringkasan tugas aktif, incoming information, draft BAKET, revisi, dan alert | Planned / Soon |
| Task | My Tasks | Daftar tugas yang diberikan oleh Field Coordinator | Planned / Soon |
| Task | Task Detail | Melihat instruksi, UUK, target, lokasi, deadline, dan kebutuhan lampiran | Planned / Soon |
| Task | Update Task Status | Mengubah status tugas: not started, in progress, completed | Planned / Soon |
| Jaring | Jaring Management | Mendaftarkan dan mengelola Jaring binaan | Planned / Soon |
| Jaring | Jaring Profile | Melihat profil/kode sumber sesuai kewenangan | Planned / Soon |
| Intake | Incoming Information Inbox | Menerima informasi mentah dari Jaring via WA Center | Planned / Soon |
| Intake | Incoming Information Detail | Melihat isi informasi mentah, lampiran, waktu, lokasi, dan sumber | Planned / Soon |
| Intake | Validate Incoming Information | Memvalidasi apakah informasi layak menjadi BAKET | Planned / Soon |
| Intake | Close Invalid Information | Menutup informasi yang tidak valid dengan alasan | Planned / Soon |
| BAKET | Create BAKET | Membuat BAKET dari informasi valid | Planned / Soon |
| BAKET | BAKET Drafts | Menyimpan draft BAKET sebelum dikirim | Planned / Soon |
| BAKET | BAKET Form | Mengisi fakta 5W+1H, indikasi, lokasi, waktu, sumber, dan UUK terkait | Planned / Soon |
| BAKET | Evidence Upload | Mengunggah foto, video, dokumen, dan koordinat GPS | Planned / Soon |
| BAKET | Submit BAKET | Mengirim BAKET ke OIM | Planned / Soon |
| BAKET | Revision Request | Melihat permintaan perbaikan BAKET dari atasan/OIM | Planned / Soon |
| Emergency | Panic Button | Mengirim sinyal darurat beserta lokasi dan kondisi singkat | Planned / Soon |
| Emergency | Emergency Report | Mengirim laporan cepat: situasi, tindakan, kebutuhan | Planned / Soon |
| Notification | My Notifications | Notifikasi tugas baru, revisi, deadline, dan peringatan keamanan | Planned / Soon |
| Settings | Profile & Security | Pengaturan akun, perangkat, dan keamanan | Planned / Soon |

---

### 5.6 WA Center / System Intake Menu

#### Role Objective

WA Center berfungsi sebagai Intelligence Intake Gateway. WA Center menerima informasi mentah dari Jaring atau kanal eksternal, membuat Incoming Information, melakukan routing, dan menyimpan raw intake untuk audit.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Intake Dashboard | Ringkasan pesan masuk, status routing, gagal routing, dan antrian informasi | Planned / Soon |
| Intake | Incoming Queue | Daftar informasi mentah yang masuk dari WA Center | Planned / Soon |
| Intake | Incoming Detail | Melihat detail pesan, media, metadata, waktu, dan sumber | Planned / Soon |
| Intake | Source Mapping | Menghubungkan sumber/Jaring dengan Field Officer pembina | Planned / Soon |
| Intake | Routing Management | Mengatur routing incoming information ke Field Officer terkait | Planned / Soon |
| Intake | Failed Routing | Menangani informasi yang gagal dirouting | Planned / Soon |
| Intake | Duplicate Detection | Menandai potensi duplikasi informasi | Planned / Soon |
| Security | File & Media Screening | Memeriksa format file, metadata, dan potensi risiko konten | Planned / Soon |
| Archive | Raw Intake Archive | Menyimpan data mentah untuk audit trail | Planned / Soon |
| Log | Delivery & Read Receipt | Mencatat status diterima, diteruskan, dibaca, dan diproses | Planned / Soon |
| Notification | Intake Alerts | Notifikasi informasi masuk, gagal routing, atau konten berisiko | Planned / Soon |
| Settings | Channel Configuration | Pengaturan nomor WA Center, webhook, dan integrasi kanal | Planned / Soon |

---

### 5.7 Admin System Menu

#### Role Objective

Admin System bertanggung jawab mengelola konfigurasi teknis, user, role, permission, keamanan, audit log, dan integrasi sistem. Admin tidak otomatis memiliki hak membaca seluruh konten intelijen.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Admin Dashboard | Ringkasan status sistem, user aktif, integrasi, dan alert teknis | Planned / Soon |
| User Management | Users | Membuat, mengubah, menonaktifkan, dan mengelola akun pengguna | Planned / Soon |
| User Management | Roles | Mengelola system role | Planned / Soon |
| User Management | Permissions | Mengatur permission berdasarkan role dan klasifikasi data | Planned / Soon |
| User Management | Organization Mapping | Memetakan jabatan/unit organisasi ke system role | Planned / Soon |
| Security | Security Classification | Mengelola klasifikasi data: Sangat Rahasia, Rahasia, Terbatas | Planned / Soon |
| Security | MFA Management | Mengatur kebijakan multi-factor authentication | Planned / Soon |
| Security | Device Management | Mengelola perangkat terdaftar dan akses perangkat | Planned / Soon |
| Security | Suspicious Access Monitor | Melihat pola akses mencurigakan | Planned / Soon |
| Audit | Audit Log | Melihat catatan aktivitas user dan sistem | Planned / Soon |
| Audit | Immutable Log Review | Melihat log yang tidak dapat diubah/dihapus | Planned / Soon |
| Integration | WA Center Integration | Konfigurasi koneksi WA Center | Planned / Soon |
| Integration | AI Offline Integration | Konfigurasi koneksi workstation AI offline | Planned / Soon |
| Integration | Notification Channel | Konfigurasi kanal notifikasi aplikasi, WA, email, dan SMS fallback | Planned / Soon |
| System | System Health | Monitoring server, database, queue, storage, dan service status | Planned / Soon |
| System | Backup & Recovery | Pengaturan backup, restore, dan disaster recovery | Planned / Soon |
| Settings | System Configuration | Pengaturan umum aplikasi | Planned / Soon |

---

## 6. Supporting / Extended Role Menu

Role berikut belum menjadi baseline utama pada summary, tetapi muncul dalam masukan kebutuhan aplikasi. Role ini dapat dipertimbangkan pada fase lanjutan atau sebagai extended role.

---

### 6.1 Planning & Control Office

#### Possible Mapping

Direktur-21 / Rendalgiatops / fungsi perencanaan, pengendalian, administrasi, analisis, dan evaluasi.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Planning & Control Dashboard | Melihat rekap kegiatan, operasi, laporan, dan evaluasi | Planned / Soon |
| Directive | STR Administration | Administrasi penerbitan dan distribusi STR | Planned / Soon |
| Monitoring | Operation Control | Monitoring pelaksanaan kegiatan/operasi lintas wilayah | Planned / Soon |
| Evaluation | Anev Workspace | Analisis dan evaluasi kegiatan/operasi | Planned / Soon |
| Reports | Coordination Reports | Menghimpun laporan pengoordinasian, evaluasi, dan pengendalian | Planned / Soon |
| Performance | Quarterly Performance Report | Mengelola laporan kinerja triwulan | Planned / Soon |
| Performance | Annual Performance Report | Mengelola laporan kinerja tahunan | Planned / Soon |

---

### 6.2 Final Intelligence Reviewer

#### Possible Mapping

Deputi IX / fungsi analisis dan produksi intelijen.

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Final Review Dashboard | Melihat produk intelijen yang masuk untuk analisis akhir | Planned / Soon |
| Reports | Intelligence Product Inbox | Menerima produk intelijen dari Deputi II | Planned / Soon |
| Analysis | Integration & Interpretation | Melakukan integrasi, interpretasi, dan analisis akhir | Planned / Soon |
| Reports | Final Intelligence Product | Menghasilkan produk intelijen matang | Planned / Soon |
| Archive | Product Archive | Mengarsipkan produk intelijen final | Planned / Soon |

---

### 6.3 Pusdalops / Emergency Control

#### Main Navigation

| Menu Group | Menu | Description | Status |
|---|---|---|---|
| Dashboard | Emergency Control Dashboard | Melihat seluruh panic alert dan kondisi darurat aktif | Planned / Soon |
| Alert | Panic Alert Queue | Daftar panic alert dari lapangan | Planned / Soon |
| Alert | Emergency Detail | Melihat lokasi, situasi, tindakan, dan kebutuhan bantuan | Planned / Soon |
| Response | Response Coordination | Mengoordinasikan dukungan cepat | Planned / Soon |
| Log | Emergency Timeline | Mencatat kronologi penanganan kondisi darurat | Planned / Soon |

---

## 7. Cross-Role Common Menus

Menu berikut dapat muncul pada semua role dengan konten dan permission yang berbeda.

| Menu | Description | Applicable Roles | Status |
|---|---|---|---|
| Dashboard | Ringkasan sesuai role | All internal roles | Planned / Soon |
| Notification Center | Notifikasi tugas, laporan, revisi, alert, dan keamanan | All internal roles | Planned / Soon |
| My Profile | Profil pengguna | All internal roles | Planned / Soon |
| Security Settings | Password, MFA, perangkat aktif | All internal roles | Planned / Soon |
| Help / SOP Guide | Panduan penggunaan aplikasi dan SOP ringkas | All internal roles | Planned / Soon |
| Activity Log | Riwayat aktivitas pribadi | All internal roles | Planned / Soon |

---

## 8. Proposed MVP Menu Candidates

Walaupun seluruh menu di atas dapat dianggap **Planned / Soon**, untuk mengejar MVP, menu berikut layak diprioritaskan karena membentuk alur inti dari DEN CAKRA.

### 8.1 MVP Core Flow

MVP harus membuktikan alur:

**Executive membuat STR/UUK → Regional Commander menerima dan menurunkan arahan → OIM membuat assignment → Field Coordinator membagi task → Field Officer membuat BAKET → OIM verifikasi dan membuat draft report → Regional Commander approve/return/reject → Executive melihat approved report.**

### 8.2 MVP Menu Candidate by Role

| Role | MVP Candidate Menus |
|---|---|
| Executive | Executive Dashboard, STR / Directive Management, Create STR, Directive Tracking, Approved Intelligence Reports |
| Regional Commander | Regional Dashboard, Directive Inbox, Regional Command Direction, Draft Intelligence Report Review, Approval Workspace |
| Operational Intelligence Manager | OIM Dashboard, Assignment Management, BAKET Inbox, BAKET Verification, Neraca Penilaian, Draft Report Builder, Submit for Approval |
| Field Coordinator | Field Coordination Dashboard, Assignment Inbox, Field Task Management, Task Progress Monitoring |
| Field Officer | My Field Dashboard, My Tasks, Incoming Information Inbox, Create BAKET, BAKET Form, Evidence Upload, Submit BAKET |
| WA Center | Intake Dashboard, Incoming Queue, Source Mapping, Routing Management, Raw Intake Archive |
| Admin System | Users, Roles, Permissions, Audit Log, Security Classification |

---

## 9. Menu Prioritization Recommendation

Untuk menjaga MVP tetap realistis, implementasi menu dapat dibagi menjadi 3 layer.

### 9.1 MVP Layer 1 — Core Workflow

Fokus pada alur kerja utama.

| Module | Priority |
|---|---|
| STR / Directive Management | Critical |
| Assignment Management | Critical |
| Field Task Management | Critical |
| Incoming Information | Critical |
| BAKET Management | Critical |
| BAKET Verification | Critical |
| Neraca Penilaian | Critical |
| Draft Report Builder | Critical |
| Approval Workflow | Critical |
| Basic Dashboard per Role | High |
| RBAC Basic | Critical |
| Audit Log Basic | Critical |

### 9.2 MVP Layer 2 — Operational Control

Fokus pada monitoring dan kendali.

| Module | Priority |
|---|---|
| Task Progress Monitoring | High |
| Notification Center | High |
| Report Pipeline | High |
| Personnel Status | Medium |
| GPS Monitoring | Medium |
| Panic Alert | High |
| Evidence Upload | High |

### 9.3 Post-MVP / Soon Layer

Fokus pada advanced intelligence capability.

| Module | Priority |
|---|---|
| AI Offline Review | Soon |
| Entity Link Analysis | Soon |
| Strategic Issue Ranking | Soon |
| Blind Spot Detection | Soon |
| One-Click Executive Briefing | Soon |
| Customizable Dashboard | Soon |
| Advanced Geospatial Heatmap | Soon |
| Advanced Performance Analytics | Soon |

---

## 10. Initial Navigation Structure Recommendation

### 10.1 Desktop Layout

Aplikasi sebaiknya menggunakan sidebar navigation karena DEN CAKRA adalah sistem kompleks berbasis dashboard, workflow, dan role-based access.

#### Recommended Structure

```text
[Logo DEN CAKRA]

Dashboard

Directive / STR

Assignment

Field Tasking

Incoming Information

BAKET

Verification & Assessment

Intelligence Reports

Monitoring

Alerts

Notifications

Administration

Settings
```

Catatan: Tidak semua menu muncul untuk semua role. Sidebar harus difilter berdasarkan role dan permission.

---

### 10.2 Mobile Layout

Untuk Field Officer dan Field Coordinator, mobile interface sebaiknya lebih sederhana.

#### Field Officer Mobile Main Tabs

```text
Home
Tasks
Incoming
BAKET
Alert
```

#### Field Coordinator Mobile Main Tabs

```text
Home
Assignments
Tasks
Personnel
Alerts
```

---

## 11. Key Business Rules for Menu Access

| ID | Business Rule |
|---|---|
| BRU-MENU-001 | System SHALL display menus based on assigned system role and permission. |
| BRU-MENU-002 | System SHALL NOT display internal intelligence menus to Jaring. |
| BRU-MENU-003 | WA Center SHALL NOT create BAKET directly. |
| BRU-MENU-004 | Field Officer SHALL be the role that converts valid Incoming Information into BAKET. |
| BRU-MENU-005 | OIM SHALL submit assignment to Field Coordinator, not directly to Field Officer. |
| BRU-MENU-006 | Field Coordinator SHALL distribute field tasks to Field Officer. |
| BRU-MENU-007 | Regional Commander SHALL review Draft Intelligence Report before it becomes approved report. |
| BRU-MENU-008 | Executive SHALL see approved intelligence outputs and strategic dashboard, not raw BAKET by default. |
| BRU-MENU-009 | System SHALL record every access, create, update, submit, approve, return, reject, and delete action in audit log. |
| BRU-MENU-010 | Data with higher security classification SHALL only be accessible by users with sufficient clearance. |

---

## 12. Open Questions

| ID | Question | Reason |
|---|---|---|
| OQ-001 | Apakah istilah resmi yang akan dipakai: UKK, UUK, KIQ, atau PIR? | Perlu glossary final agar menu dan dokumen konsisten |
| OQ-002 | Apakah Direktur-21 masuk sebagai role inti MVP atau extended role? | Berpengaruh pada menu Planning & Control |
| OQ-003 | Apakah Deputi IX masuk dalam scope aplikasi awal atau hanya integrasi/diseminasi eksternal? | Berpengaruh pada flow produk intelijen final |
| OQ-004 | Apakah Jaring akan menggunakan WA Center saja atau juga aplikasi ringan? | Berpengaruh pada desain akses eksternal |
| OQ-005 | Apakah GPS monitoring masuk MVP atau fase setelah MVP? | Berpengaruh pada effort mobile dan security |
| OQ-006 | Apakah AI Offline masuk MVP atau cukup disiapkan sebagai placeholder menu? | Berpengaruh pada scope teknis dan infrastruktur |
| OQ-007 | Apakah semua jenis produk intelijen langsung didukung di MVP atau hanya Laporan Informasi dan Laporan Intelijen? | Berpengaruh pada kompleksitas Report Builder |

---

## 13. Recommended Next Document

Setelah dokumen ini disetujui, dokumen berikutnya yang perlu dibuat adalah:

1. **MVP Scope Document**
2. **Role Permission Matrix**
3. **User Flow per Role**
4. **Functional Requirement List**
5. **Low-Fidelity Wireframe per Role**
6. **PRD v1.0**
7. **SRS v1.0**

---

## 14. Conclusion

DEN CAKRA membutuhkan struktur menu yang mengikuti alur intelligence workflow, bukan sekadar struktur organisasi.

Menu inti harus mendukung:

1. Pembuatan STR/UUK oleh Executive.
2. Penurunan arahan secara cascade.
3. Assignment dari OIM ke Field Coordinator.
4. Task distribution dari Field Coordinator ke Field Officer.
5. Intake informasi mentah dari WA Center.
6. Validasi informasi oleh Field Officer.
7. Pembuatan BAKET.
8. Verifikasi, Neraca Penilaian, dan analisis oleh OIM.
9. Review dan approval oleh Regional Commander.
10. Penyajian approved intelligence report kepada Executive.

Untuk MVP, sistem harus fokus pada pembuktian alur end-to-end tersebut terlebih dahulu. Fitur lanjutan seperti AI offline, link analysis, blind spot detection, strategic issue ranking, dan advanced geospatial dashboard dapat tetap muncul sebagai menu **Planned / Soon**, tetapi belum menjadi beban implementasi awal.
