# Regional Commander Command Intelligence

Tujuan: menyelesaikan alur kerja Komandan Regional dari membaca produk, memberi keputusan, mengendalikan personel/jaring, memantau wilayah, sampai mengevaluasi KPI berbasis kualitas HUMINT.

## Tasks

- [x] Satukan daftar produk dan antrean persetujuan regional.
- [x] Hapus route dan navigasi persetujuan regional yang duplikat.
- [x] Batasi lokasi personel dan data jaring ke hierarki komando aktif.
- [x] Sajikan personel, organisasi, wilayah tugas, dan jaring dari API aktual.
- [x] Bangun peta bersama dengan boundary, Baket, personel, alert, dan insiden.
- [x] Gunakan peta bersama pada Komandan Regional dan Eksekutif.
- [x] Bangun KPI Engine IDX.1–IDX.5 dengan drill-down organisasi/wilayah/personel.
- [x] Tambahkan rekomendasi taktis/strategis yang dapat ditelusuri ke bukti.
- [x] Jalankan pemeriksaan tipe, lint terarah, dan build.

## Verification criteria

- Komandan Regional hanya melihat assignment, jaring, lokasi, dan wilayah dalam scope turunannya.
- Persetujuan berhasil tanpa berpindah ke modul terpisah.
- Boundary mencapai kecamatan ketika zoom mendukung dan marker memuat data aktual.
- KPI menyertakan periode, sampel, dan sumber perhitungan; tidak memakai angka mock.
- Route lama tidak lagi direferensikan oleh navigasi atau komponen.
