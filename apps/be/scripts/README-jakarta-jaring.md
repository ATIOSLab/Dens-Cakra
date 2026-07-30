# Import Jaring Jakarta Selatan

Folder ini adalah paket siap-impor dari tabel `folder/jakarta.html`. Data tabel
berasal dari HTML, sedangkan foto diekstrak dari pasangan
`folder/JAKARTA SELATAN.docx` karena URL gambar pada ekspor HTML masih menunjuk
ke folder Word yang tidak tersedia.

Isi paket:

- `manifest.json`: 298 baris Jaring dengan index stabil, kode, alias,
  kecamatan/kelurahan resmi, profil, status sumber, hasil validasi, checksum,
  dan `storageKey`.
- `validation-report.json`: selisih rekap dan daftar baris yang perlu review.
- `index.html`: index visual seluruh baris dengan URL foto relatif yang sudah
  dinormalisasi.
- `photos/`: foto per kecamatan dan kelurahan. Semua path memakai huruf kecil,
  karakter ASCII, tanda hubung, dan `/`.

## Membuat ulang paket

Jalankan dari `apps/be`:

```powershell
python scripts/prepare-jakarta-jaring.py --clean
```

Script memvalidasi urutan HTML terhadap DOCX, 10 kecamatan, 65 kelurahan,
checksum foto, normalisasi tahap `Assessment/Development/Recruitment`, serta
status sumber.

## Validasi terhadap database tanpa menulis

```powershell
npm run seed:jaring:jakarta-selatan:check
```

Pemeriksaan memastikan seluruh kelurahan target, master pekerjaan, satu Field
Officer aktif per kecamatan, 298 foto, ukuran file, checksum, index, alias, dan
storage path valid.

## Impor idempoten

```powershell
npm run seed:jaring:jakarta-selatan
```

Baris bersih masuk sebagai `ACTIVE` + `APPROVED`. Baris dengan nomor WhatsApp
kosong/duplikat atau konflik wilayah sumber tetap masuk, tetapi sebagai
`INACTIVE` + `PENDING` agar dapat diperiksa tanpa menghilangkan data sumber.
Nomor kosong memakai placeholder internal unik dan teks asli tetap disimpan
pada catatan audit.

Pada deployment Docker, set:

```env
RUN_JAKARTA_JARING_IMPORT_ON_STARTUP=true
```

Docker menyalin folder ini ke `LOCAL_STORAGE_ROOT` sebelum importer berjalan.
Jangan mengubah nama file/folder secara manual karena `manifest.json` menyimpan
path dan checksum yang menjadi kontrak importer.
