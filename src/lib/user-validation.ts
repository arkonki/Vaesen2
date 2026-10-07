import { z } from "zod";

export const passwordSchema = z.string().min(12, "Use at least 12 characters").max(72)
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes");
export const userProfileSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["PLAYER", "GM", "ADMIN"]),
});
