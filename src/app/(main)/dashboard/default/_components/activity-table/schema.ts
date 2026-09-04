import { z } from "zod";

export const activityRowSchema = z.object({
  id: z.string(),
  serviceType: z.string(), // "CHAT" | "IMAGE" | "REFUNDED"
  details: z.string(),
  creditsUsed: z.number(),
  createdAt: z.string(), // ISO string
  status: z.string().default("Completed"),
});

export type ActivityRow = z.infer<typeof activityRowSchema>;
