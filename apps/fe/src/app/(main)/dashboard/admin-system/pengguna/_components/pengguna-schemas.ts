import { z } from "zod";

const provisionRoleSchema = z.enum([
  "REGIONAL_COMMANDER",
  "OPERATIONAL_INTELLIGENCE_MANAGER",
  "FIELD_COORDINATOR",
  "FIELD_OFFICER",
]);
const provisionBranchSchema = z.enum(["BINDA", "DIRECTORATE"]);

export const createUserSchema = z
  .object({
    branch: provisionBranchSchema,
    roleCode: provisionRoleSchema,
    username: z.string().min(2, "Username minimal 2 karakter."),
    email: z.string().email("Masukkan email yang valid.").optional().or(z.literal("")),
    password: z.string().min(8, "Password minimal 8 karakter."),
    validFrom: z.string().min(1, "Tanggal mulai assignment wajib diisi."),
    areaScopeIds: z.array(z.string().uuid("Scope area tidak valid.")).min(1, "Pilih minimal satu wilayah."),
  })
  .superRefine((value, context) => {
    if (value.branch === "BINDA" && value.areaScopeIds.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["areaScopeIds"],
        message: "Binda hanya boleh memilih satu wilayah cakupan.",
      });
    }
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  username: z.string().min(2, "Username minimal 2 karakter."),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter."),
  phone: z.string().regex(/^\d*$/, "Nomor telepon hanya boleh berisi angka.").optional(),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
