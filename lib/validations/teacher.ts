import { z } from "zod";

export const teacherSchema = z.object({
  unit_id: z.string().uuid("Unit ID tidak valid"),
  name: z.string().min(2, "Nama guru minimal 2 karakter"),
  nip: z.string().min(5, "NIP minimal 5 karakter"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["aktif", "nonaktif", "cuti"]).default("aktif"),
});

export type TeacherInput = z.infer<typeof teacherSchema>;
