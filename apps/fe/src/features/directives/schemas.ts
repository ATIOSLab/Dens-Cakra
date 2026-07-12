import { z } from "zod";

const recipientSchema = z
  .object({
    targetUnitId: z.string().uuid().optional().or(z.literal("")),
    targetPositionId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine(
    (value) => Number(Boolean(value.targetUnitId)) + Number(Boolean(value.targetPositionId)) === 1,
    "Setiap penerima wajib memilih tepat satu target unit atau jabatan.",
  );

const uukSectionSchema = z.object({
  sectionType: z.string().min(1),
  title: z.string().min(1),
  orderNumber: z.number().int().min(1),
  content: z.string(),
});

export const directiveWizardSchema = z.object({
  ownerUnitId: z.string().uuid(),
  commandNumber: z.string().min(3),
  classification: z.enum(["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"]),
  commandSource: z.string().min(2),
  commandIssuer: z.string().min(2),
  commandDate: z.string().min(1),
  dueDate: z.string().optional(),
  strategicIssue: z.string().optional(),
  commandDescription: z.string().min(10),
  uukTitle: z.string().min(3, "Judul STR/UUK wajib diisi."),
  uukSections: z
    .array(uukSectionSchema)
    .min(1)
    .refine(
      (sections) => sections.some((section) => section.content.trim().length > 0),
      "Minimal satu bagian UUK/KIQ/PIR wajib diisi.",
    ),
  targetAreaIds: z.array(z.string().uuid()).min(1),
  recipients: z.array(recipientSchema).min(1),
});

export const directiveEditSchema = z.object({
  dueDate: z.string().optional(),
  strategicIssue: z.string().optional(),
  commandDescription: z.string().min(10),
  uukTitle: z.string().min(3, "Judul STR/UUK wajib diisi."),
  uukSections: z
    .array(uukSectionSchema)
    .min(1)
    .refine(
      (sections) => sections.some((section) => section.content.trim().length > 0),
      "Minimal satu bagian UUK/KIQ/PIR wajib diisi.",
    ),
  targetAreaIds: z.array(z.string().uuid()).min(1),
  recipients: z.array(recipientSchema).min(1),
});

export type DirectiveWizardInput = z.infer<typeof directiveWizardSchema>;
export type DirectiveEditInput = z.infer<typeof directiveEditSchema>;
