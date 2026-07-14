# Endpoint Marker Peta Terpadu

## Goal

Menyediakan `GET /api/v1/map/markers` berbentuk GeoJSON untuk marker BAKET dan lokasi personel dengan scope hierarki, pencocokan poligon wilayah, serta filter siap pakai oleh frontend.

## Tasks

- [x] Audit model BAKET, ping personel, boundary PostGIS, dan `DomainScopeService`.
- [x] Tambahkan DTO filter multi-value, viewport, waktu, freshness, kategori, status, unit, dan wilayah.
- [x] Tambahkan query BAKET dan lokasi personel yang selalu dibatasi reporting-line pengguna.
- [x] Cocokkan setiap koordinat ke seluruh tingkat wilayah melalui boundary aktif dan tampilkan hierarchy pada marker.
- [x] Bentuk satu `FeatureCollection` beserta style key, ringkasan, dan facets filter.
- [x] Daftarkan modul/controller tanpa mengubah endpoint peta lama.
- [x] Tambahkan unit test untuk scope/filter/freshness dan jalankan validasi backend.

## Done When

- [x] Endpoint hanya mengembalikan marker dalam scope pengguna.
- [x] BAKET dapat dibedakan berdasarkan kategori dan difilter berdasarkan wilayah hasil point-in-polygon.
- [x] Lokasi personel membedakan `active` dan `last_known`, serta tidak membocorkan stealth ping.
- [x] Typecheck, lint, test, dan build backend lulus atau blocker pr-existing terdokumentasi.

## Notes

- Marker lokasi tidak memakai centroid wilayah sebagai lokasi palsu.
- Stealth ping sengaja tidak masuk endpoint umum; akses khusus harus memiliki kontrak terpisah.
