import { z } from "zod";

export const activitySchema = z.object({
  unit_id: z.string().uuid("Unit ID tidak valid"),
  name: z.string().min(2, "Nama kegiatan minimal 2 karakter"),
  description: z.string().optional(),
  activity_date: z.string(), // YYYY-MM-DD
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrence_days: z.array(z.string()).optional(),
  recurrence_end_date: z.string().optional(),
});

export type ActivityInput = z.infer<typeof activitySchema>;
