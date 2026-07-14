# Detail Baket: Wilayah Lengkap dan Peta GPS

## Goal

Menampilkan hierarki administratif lengkap yang sudah tersimpan dan peta GPS pada seluruh detail Baket aktif.

## Tasks

- [x] Buat formatter hierarki wilayah bersama untuk level RT sampai negara. Verifikasi: label berurutan dari area kejadian ke induk tertinggi.
- [x] Jadikan komponen peta Baket reusable lintas role. Verifikasi: marker, popup, pilihan peta, dan mode 3D tetap berfungsi.
- [x] Terapkan wilayah lengkap dan peta pada detail Field Officer serta OIM. Verifikasi: kedua detail memakai koordinat dan `eventArea` versi Baket.
- [x] Lengkapi include induk area backend sampai seluruh level administratif. Verifikasi: query Baket dan versi Baket lolos TypeScript/test terkait.
- [x] Jalankan format, lint, typecheck, test relevan, dan build. Verifikasi: perubahan bersih atau blocker lama dilaporkan terpisah.

## Done When

- [x] Detail Baket tidak lagi hanya menampilkan nama kecamatan dan selalu menampilkan peta jika koordinat tersedia.

## Notes

Wilayah berasal dari hasil resolusi PostGIS yang sudah disimpan pada `eventAreaId`; frontend tidak melakukan pencocokan koordinat ulang.
