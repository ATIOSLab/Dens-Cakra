import { z } from "zod";

export const taskBuilderSchema = z.object({
  ownerUnitId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  directiveVersionId: z.string().uuid().optional(),
  uukStrVersionId: z.string().uuid().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  targetAreaIds: z.array(z.string().uuid()).min(1),
});

export const assigneeSelectionSchema = z.object({
  assignments: z
    .array(
      z.object({
        assigneeAssignmentId: z.string().uuid(),
        dueDate: z.string().optional(),
        assignmentNote: z.string().optional(),
      }),
    )
    .min(1),
});

export const assignmentProgressSchema = z.object({
  note: z.string().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

export type TaskBuilderInput = z.infer<typeof taskBuilderSchema>;
export type AssigneeSelectionInput = z.infer<typeof assigneeSelectionSchema>;
export type AssignmentProgressInput = z.infer<typeof assignmentProgressSchema>;
