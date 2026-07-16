# Real Client IP

## Goal
Mencatat IP publik pengguna yang sebenarnya pada sesi dan audit login di balik reverse proxy Dokploy.

## Tasks
- [x] Telusuri proxy autentikasi, Better Auth, normalisasi IP, dan tampilan audit.
- [x] Prioritaskan header IP publik yang disediakan reverse proxy pada Better Auth.
- [x] Hentikan konversi alamat IPv6 kosong menjadi `127.0.0.1`.
- [x] Tampilkan alamat lama yang tidak valid sebagai data tidak tersedia, bukan localhost palsu.
- [x] Tambahkan pengujian normalisasi IPv4, IPv6, proxy chain, dan nilai kosong.
- [x] Verifikasi perubahan terarah sesuai aturan repository.

## Done When
- [x] Login production baru menyimpan IP publik dari `X-Real-IP` atau `X-Forwarded-For` yang valid.
- [x] Nilai `::` tidak lagi ditampilkan sebagai `127.0.0.1`.

## Notes
- Data historis tidak dapat direkonstruksi; perubahan berlaku saat sesi baru dibuat.
- Pada akses lokal tanpa reverse proxy, server memang hanya dapat melihat loopback.
