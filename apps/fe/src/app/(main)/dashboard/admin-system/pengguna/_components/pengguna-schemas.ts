import { z } from "zod";

const optionalText = z.string().optional();

const optionalYear = z
  .string()
  .regex(/^\d*$/, "Tahun lulus hanya boleh berisi angka.")
  .refine((value) => !value || value.length === 4, "Tahun lulus harus 4 digit.")
  .refine((value) => !value || (Number(value) >= 1900 && Number(value) <= 2100), "Tahun lulus tidak valid.")
  .optional();

const positionHistorySchema = z
  .object({
    title: z.string().min(2, "Nama jabatan minimal 2 karakter."),
    organizationUnit: optionalText,
    area: optionalText,
    startedAt: z.string().min(1, "Tanggal mulai jabatan wajib diisi."),
    endedAt: optionalText,
    status: z.enum(["ACTIVE", "COMPLETED"], "Pilih status riwayat jabatan."),
  })
  .superRefine((value, context) => {
    if (value.status === "COMPLETED" && !value.endedAt) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "Tanggal selesai wajib diisi untuk jabatan selesai.",
      });
    }
  });

const assignmentHistorySchema = z.object({
  name: z.string().min(2, "Nama penugasan minimal 2 karakter."),
  unit: optionalText,
  location: optionalText,
  period: optionalText,
  description: optionalText,
});

const personnelGenderSchema = z
  .enum(["MALE", "FEMALE"])
  .optional()
  .refine(Boolean, "Pilih jenis kelamin personel.");

const personnelStatusSchema = z
  .enum(["ACTIVE", "INACTIVE", "RETIRED", "CONTRACT"])
  .optional()
  .refine(Boolean, "Pilih status personel.");

export const createUserSchema = z.object({
  name: z.string().min(2, "Nama akun minimal 2 karakter."),
  email: z.email("Masukkan email yang valid."),
  username: z.string().min(2, "Username minimal 2 karakter."),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter."),
  phone: z.string().regex(/^\d*$/, "Nomor telepon hanya boleh berisi angka.").optional(),
  nationalIdNumber: z.string().regex(/^\d{16}$/, "NIK harus terdiri dari tepat 16 digit angka."),
  birthPlace: z.string().min(2, "Tempat lahir minimal 2 karakter."),
  birthDate: z.string().min(1, "Tanggal lahir wajib diisi."),
  gender: personnelGenderSchema,
  religion: optionalText,
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  bloodType: optionalText,
  personnelNumber: optionalText,
  rankGrade: optionalText,
  personnelStatus: personnelStatusSchema,
  joinedAt: z.string().min(1, "Tanggal bergabung wajib diisi."),
  lastEducation: optionalText,
  educationInstitution: optionalText,
  educationMajor: optionalText,
  graduationYear: optionalYear,
  positionHistory: z.array(positionHistorySchema).optional(),
  assignmentHistory: z.array(assignmentHistorySchema).optional(),
  competencies: z.array(z.string().min(2, "Kompetensi minimal 2 karakter.")).optional(),
  positionId: z.uuid("Pilih jabatan aktif untuk user."),
  validFrom: z.string().min(1, "Tanggal mulai assignment wajib diisi."),
  areaScopeIds: z.array(z.uuid("Scope area tidak valid.")).optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  username: z.string().min(2, "Username minimal 2 karakter."),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter."),
  phone: z.string().regex(/^\d*$/, "Nomor telepon hanya boleh berisi angka.").optional(),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
