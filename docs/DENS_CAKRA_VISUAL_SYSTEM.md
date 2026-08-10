# DENS CAKRA Visual System

Dokumen ini menjadi kuncian visual aplikasi DENS CAKRA. Setiap perubahan UI wajib mengikuti file ini dan token di `apps/fe/src/lib/domain/visual-system.ts`.

## Prinsip

- Satu entitas domain memakai satu ikon dan satu warna utama di menu, card, tabel, dropdown, peta, dan detail.
- Font UI memakai Inter. Metadata, kode, nomor referensi, timestamp, dan label tabel memakai IBM Plex Mono.
- Ukuran kontrol standar adalah 36px (`h-9`). Kontrol padat boleh memakai 32px (`h-8`) hanya untuk toolbar atau tabel.
- Radius card dan kontrol mengikuti standar enterprise: 4-6px, bukan rounded besar.
- Jangan membuat warna baru di komponen halaman jika maknanya sudah ada di token domain atau token urgensi.

## Ikon Dan Warna Domain

| Domain | Ikon | Warna |
| --- | --- | --- |
| Laporan Jaring | `DOMAIN_VISUALS.jaringReport.Icon` | Cyan `#0ea5e9` |
| Bahan Keterangan (Baket) | `DOMAIN_VISUALS.baket.Icon` | Violet `#7c3aed` |
| Laporan Intelijen | `DOMAIN_VISUALS.intelligenceReport.Icon` | Emerald `#10b981` |
| Jaring | `DOMAIN_VISUALS.jaring.Icon` | Cyan `#0ea5e9` |
| Petugas Wilayah (Gaswil) | `DOMAIN_VISUALS.gaswil.Icon` | Emerald `#22c55e` |
| Peta Jejaring Intelijen | `DOMAIN_VISUALS.intelligenceNetworkMap.Icon` | Cyan `#0ea5e9` |
| Administrasi Sistem | `DOMAIN_VISUALS.admin.Icon` | Amber `#f59e0b` |

## Warna Urgensi

| Urgensi | Warna |
| --- | --- |
| Mendesak | Rose `#e11d48` |
| Tinggi | Amber `#f59e0b` |
| Normal | Emerald `#10b981` |
| Rendah | Cyan `#0ea5e9` |

## Lokasi Petugas Wilayah

| Status | Warna |
| --- | --- |
| Aktif / online | Emerald `#22c55e` |
| Tidak terhubung / offline | Slate `#64748b` |

## Laporan Jaring

- Tidak ada lagi kategori kelengkapan pada Laporan Jaring.
- Live Location wajib dikirim oleh Jaring melalui bot WhatsApp sebelum Laporan Jaring dapat masuk ke sistem.
- Kategori isu/informasi ditentukan pada Bahan Keterangan (Baket), bukan pada Laporan Jaring.
- Jika komponen wajib belum terpenuhi, gunakan istilah `komponen wajib belum terpenuhi`; jangan membuat kategori kelengkapan pada Laporan Jaring.

## Font Dan Tipografi

Gunakan token `DC_TYPOGRAPHY`:

- `pageTitle`: judul halaman.
- `sectionTitle`: judul section.
- `cardTitle`: judul card.
- `body`: paragraf dan deskripsi.
- `tableHeader`: header tabel dan label teknis.
- `metadata`: timestamp, nomor referensi, kode, dan informasi ringkas.
- `control`: teks tombol, select, dropdown, dan input.

## Kontrol Dan Dropdown

Gunakan token `DC_CONTROLS` dan komponen bersama:

- Dropdown dengan daftar panjang wajib searchable.
- Filter wilayah wajib berjenjang: Provinsi -> Kabupaten/Kota -> Kecamatan -> Kelurahan/Desa jika tersedia.
- Filter hanya ditampilkan jika relevan dengan data halaman dan RBAC aktif.
- Jangan menampilkan filter kelengkapan Laporan Jaring.

## Peta

- Marker Laporan Jaring memakai ikon dan warna Laporan Jaring.
- Marker Baket memakai ikon dan warna Baket.
- Marker Gaswil aktif memakai warna online; Gaswil offline memakai lokasi terakhir dengan warna offline.
- Legend peta harus memakai token domain yang sama dengan card dan tabel.
