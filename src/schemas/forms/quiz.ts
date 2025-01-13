import { z } from "zod";

export const quizCreationSchema = z.object({
  topic: z
    .string()
    .min(4, {
      message: "El tema debe tener al menos 4 caracteres.",
    })
    .max(50, {
      message: "El tema debe tener como máximo 50 caracteres.",
    }),
  type: z.enum(["mcq", "open_ended"]),
  amount: z.number().min(1).max(10),
});
