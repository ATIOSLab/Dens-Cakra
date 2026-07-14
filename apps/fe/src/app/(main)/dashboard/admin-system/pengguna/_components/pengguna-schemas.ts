import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Nama akun minimal 2 karakter."),
  email: z.email("Masukkan email yang valid."),
  username: z.string().min(2, "Username minimal 2 karakter."),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter."),
  phone: z.string().optional(),
  roleCode: z.string().min(1, "Pilih role target untuk mempersempit jabatan."),
  positionId: z.uuid("Pilih jabatan aktif untuk user."),
  validFrom: z.string().min(1, "Tanggal mulai assignment wajib diisi."),
  areaScopeIds: z
    .array(z.uuid("Scope area tidak valid."))
    .min(1, "Pilih minimal satu area scope."),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  username: z.string().min(2, "Username minimal 2 karakter."),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter."),
  phone: z.string().optional(),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
