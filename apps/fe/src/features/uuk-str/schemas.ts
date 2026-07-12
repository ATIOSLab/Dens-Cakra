import { z } from "zod";

export const uukSectionItemSchema = z.object({
  itemCode: z.string().min(1),
  content: z.string().min(3),
  orderNumber: z.number().int().min(1),
});

export const uukSectionSchema = z.object({
  sectionType: z.string().min(1),
  title: z.string().min(3),
  orderNumber: z.number().int().min(1),
  items: z.array(uukSectionItemSchema).min(1),
});

export const uukCreateSchema = z.object({
  directiveVersionId: z.string().uuid(),
  ownerUnitId: z.string().uuid(),
  title: z.string().min(3),
  sections: z.array(uukSectionSchema).length(9),
});

export const uukEditSchema = z.object({
  title: z.string().min(3),
  changeReason: z.string().optional(),
  sections: z.array(uukSectionSchema).length(9),
});

export type UukCreateInput = z.infer<typeof uukCreateSchema>;
export type UukEditInput = z.infer<typeof uukEditSchema>;
