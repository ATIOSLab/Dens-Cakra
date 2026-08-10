import { z } from "zod";

import { DOMAIN_TERMS } from "@/lib/domain/terminology";

const provisionRoleSchema = z.enum([
  "EXECUTIVE",
  "REGIONAL_COMMANDER",
  "OPERATIONAL_INTELLIGENCE_MANAGER",
  "FIELD_COORDINATOR",
  "FIELD_OFFICER",
]);
const provisionBranchSchema = z.enum(["PUSAT", "BINDA", "DIRECTORATE"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createUserSchema = z
  .object({
    branch: provisionBranchSchema,
    roleCode: provisionRoleSchema,
    username: z.string().min(2, "Username minimal 2 karakter."),
    email: z.string().email("Masukkan email yang valid.").optional().or(z.literal("")),
    password: z.string().min(8, "Password minimal 8 karakter."),
    validFrom: z.string().min(1, "Tanggal mulai assignment wajib diisi."),
    areaScopeIds: z
      .array(z.string().trim().regex(uuidPattern, "Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar."))
      .min(1, "Pilih minimal satu wilayah."),
  })
  .superRefine((value, context) => {
    if (value.branch === "BINDA" && value.areaScopeIds.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["areaScopeIds"],
        message: "Binda hanya boleh memilih satu wilayah cakupan.",
      });
    }
    if (value.roleCode === "EXECUTIVE" && value.branch !== "PUSAT") {
      context.addIssue({
        code: "custom",
        path: ["branch"],
        message: `Role ${DOMAIN_TERMS.executiveRole} harus menggunakan unit type Pusat.`,
      });
    }
    if (value.branch === "PUSAT" && value.roleCode !== "EXECUTIVE") {
      context.addIssue({
        code: "custom",
        path: ["roleCode"],
        message: `Unit type Pusat hanya tersedia untuk role ${DOMAIN_TERMS.executiveRole}.`,
      });
    }
    if (value.branch === "PUSAT" && value.areaScopeIds.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["areaScopeIds"],
        message: "Pusat harus menggunakan satu scope nasional.",
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
