---
name: DENS CAKRA Command Intelligence
description: Sistem komando HUMINT gelap, padat, dan berbasis need-to-know untuk keputusan operasional.
version: 1.0.0
tokens:
  colors:
    canvas: "#090e0b"
    sidebar: "#0c130f"
    surface: "#111a15"
    surface_raised: "#17231c"
    surface_hover: "#1c2a22"
    border_subtle: "#223028"
    border: "#2b3a31"
    border_strong: "#3b5042"
    text_primary: "#f4f8f5"
    text_secondary: "#b6c2ba"
    text_muted: "#849289"
    primary: "#39d982"
    success: "#43d17b"
    warning: "#f4b844"
    danger: "#ff6565"
    info: "#64b5f6"
  typography:
    body: Geist, system-ui, sans-serif
    data: Geist Mono, ui-monospace, monospace
    scale:
      xs: 0.75rem
      sm: 0.875rem
      base: 1rem
      lg: 1.125rem
      xl: 1.25rem
      title: 1.5rem
  spacing:
    base: 4px
    page_gutter: 24px
    card_padding: 20px
    section_gap: 24px
  rounded:
    sm: 6px
    md: 10px
    lg: 14px
    pill: 999px
  components:
    card: surface with one-pixel border and restrained shadow
    metric: compact evidence-first card with label, value, delta, and provenance
    map: dominant operational canvas with layer controls and contextual inspector
    table: dense rows, sticky header, explicit status, and keyboard reachable actions
    alert: severity color paired with icon and text, never color alone
---

# Design direction

DENS CAKRA adalah command center HUMINT, bukan dashboard pemasaran. Informasi yang paling menentukan keputusan harus terlihat pertama: eskalasi wilayah, laporan yang menunggu keputusan, blind spot, personel dalam kendali, serta bukti pembentuk skor KPI.

## Visual language

- Gunakan tema gelap hijau yang sudah menjadi token aplikasi. Warna hijau menandai kendali atau status baik; kuning menandai perhatian; merah hanya untuk risiko dan kegagalan.
- Pertahankan permukaan datar, garis batas tipis, kepadatan tinggi, dan satu aksen utama. Hindari kartu dekoratif, gradien, serta efek glow.
- Peta menjadi kanvas utama pada halaman spasial. Panel data membantu membaca peta dan tidak boleh menutupinya secara permanen di layar kecil.
- Gunakan sans-serif untuk narasi dan monospace hanya untuk kode, waktu, koordinat, indeks, dan angka operasional.

## Interaction

- Setiap aksi persetujuan harus menyebut objek, tahap, dan akibatnya, lalu memberi umpan balik berhasil atau gagal.
- Drill-down wilayah mengikuti Nasional > Provinsi/BINDA > Kabupaten/Kota > Kecamatan > Unit > Personel. Breadcrumb harus selalu menunjukkan posisi pengguna.
- Marker dan boundary dapat dipilih dengan keyboard atau melalui daftar pendamping. Detail titik memuat sumber data dan waktu pembaruan.
- Lokasi personel hanya ditampilkan dalam scope komando; stealth mode tidak pernah dibuka lewat kontrol frontend.
- Animasi dibatasi pada transisi panel, perubahan filter, dan indikator pemuatan singkat. Hormati reduced motion.

## Responsive behavior

- Desktop: peta atau tabel utama memakai lebar terbesar, inspector berada di samping.
- Tablet: inspector menjadi panel bawah dan filter dapat dilipat.
- Mobile: ringkasan, filter, daftar kejadian, lalu peta; semua target sentuh minimal 44px.

## Accessibility

- Status selalu memakai teks dan ikon selain warna.
- Fokus keyboard harus terlihat pada kontrol, marker alternatif dalam daftar, tautan, dan dialog.
- Tabel memakai header semantik dan nilai kosong ditulis sebagai "Belum tersedia".
- Angka KPI menyertakan definisi, periode, sampel, dan bukti agar tidak tampil sebagai skor tanpa dasar.

## Provenance

Struktur visual mengambil prinsip enterprise dari IBM Carbon berupa grid rapat, surface berlapis tipis, tipografi data yang jelas, dan penggunaan warna fungsional. Implementasi tetap mengikuti token serta komponen DENS CAKRA yang sudah ada.
