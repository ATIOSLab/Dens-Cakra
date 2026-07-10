export type DashboardNotification = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  unread?: boolean;
};

export const dashboardNotifications: DashboardNotification[] = [
  {
    id: "notif-1",
    title: "Komentar baru pada laporan",
    description: 'Analis wilayah memberi catatan pada "Evaluasi situasi triwulan".',
    timeLabel: "5 menit lalu",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Produk intelijen diterima",
    description: "Satu produk intelijen baru telah masuk ke antrean review pimpinan.",
    timeLabel: "2 jam lalu",
    unread: true,
  },
  {
    id: "notif-3",
    title: "Build dashboard selesai",
    description: "Pembaruan frontend DENS CAKRA berhasil dibangun tanpa error.",
    timeLabel: "8 jam lalu",
  },
  {
    id: "notif-4",
    title: "Anggota tim baru ditambahkan",
    description: "Pengguna operasional baru telah masuk ke workspace DENS CAKRA.",
    timeLabel: "1 hari lalu",
  },
];

export const unreadNotificationsCount = dashboardNotifications.filter((item) => item.unread).length;
