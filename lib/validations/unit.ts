import { z } from "zod";

export const unitSchema = z.object({
  name: z.string().min(2, "Nama unit minimal 2 karakter"),
  code: z.string().min(2, "Kode unit minimal 2 karakter"),
  address: z.string().optional(),
  timezone: z.string().default("Asia/Jakarta"),
});

export type UnitInput = z.infer<typeof unitSchema>;
