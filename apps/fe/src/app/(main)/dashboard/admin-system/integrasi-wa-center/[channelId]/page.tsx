import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function DetailIntegrasiWhatsAppPage() {
  return (
    <DensModulePage
      title="Detail Integrasi WhatsApp"
      roleLabel="Admin Sistem"
      description="Detail kanal WhatsApp Center, status koneksi, cakupan wilayah, dan pengendalian sinkronisasi."
      highlights={[
        "Status koneksi kanal dan waktu sinkronisasi terakhir.",
        "Cakupan wilayah dan pengguna yang menggunakan kanal.",
        "Jejak tindakan kanal untuk kebutuhan audit integrasi.",
      ]}
    />
  );
}
