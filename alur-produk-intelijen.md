# Alur Produk Intelijen

## Goal
Menyederhanakan analisis OIM menjadi draft/final, membentuk Laporan Intelijen otomatis dari banyak Baket, lalu menguncinya saat dikirim untuk approval Regional Commander sebelum dibaca Executive.

## Tasks
- [x] Finalisasi analisis langsung dari draft dan kunci versi final. Verify: endpoint finalisasi mengubah status menjadi `VALIDATED` tanpa tahap review.
- [x] Muat detail sumber Baket lengkap dengan wilayah spasial dan Field Officer. Verify: detail analisis memuat judul, wilayah, materi, dan pembuat setiap Baket.
- [x] Bentuk tabel jurnal otomatis dengan nomor urut, permasalahan/agenda, daerah kejadian, serta materi/sumber. Verify: preview dan payload memakai baris yang berasal dari Baket analisis terpilih.
- [x] Sediakan hanya Simpan Draft dan Final & Kirim pada alur OIM. Verify: produk yang terkirim berstatus `UNDER_REGIONAL_REVIEW` dan tidak dapat diedit.
- [x] Jadikan approval Regional Commander sebagai satu-satunya keputusan approval. Verify: approval menyelesaikan workflow dan mengubah produk menjadi `APPROVED_REGIONAL`.
- [x] Tampilkan produk approved secara read-only pada menu Executive. Verify: Executive dapat membuka produk, jurnal, sumber Baket, dan hasil analisis.
- [x] Validasi backend dan frontend. Verify: unit test terkait, type-check, dan build lulus.

## Done When
- [x] Alur OIM -> Regional Commander -> Executive berjalan tanpa review/validasi analisis dan tanpa pilihan nomor format produk.

## Notes
- Status database `VALIDATED` dipertahankan sebagai representasi teknis dari analisis `FINAL` agar relasi produk lama tetap kompatibel.
- Template internal `JURNAL_INFORMASI` dipakai untuk struktur tabel, tetapi nama yang tampil kepada pengguna adalah `Laporan Intelijen`.
