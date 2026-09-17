import { PetaApelClient } from "./_components/peta-apel-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Peta Apel & Absensi Jaring | Kedeputian II",
  description: "Pemantauan spasial kehadiran jaring terverifikasi secara real-time pada sesi apel",
};

export default function PetaApelPage() {
  return <PetaApelClient />;
}
