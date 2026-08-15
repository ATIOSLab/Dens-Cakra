import { z } from "zod";

export const coachingReportSchema = z.object({
  jaringId: z.string().min(1, "Silakan pilih Jaring terlebih dahulu."),
  title: z
    .string()
    .trim()
    .min(1, "Judul laporan pembinaan wajib diisi.")
    .max(300, "Judul laporan maksimal 300 karakter."),
  content: z
    .string()
    .trim()
    .min(1, "Isi laporan pembinaan wajib diisi.")
    .max(10000, "Isi laporan maksimal 10.000 karakter."),
  reportedAt: z.string().min(1, "Tanggal dan waktu pelaporan wajib diisi."),
});
