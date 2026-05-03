import { z } from "zod";

export const miniappTokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  memberId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  requirePasswordReset: z.boolean(),
});

export const miniappWechatLoginInputSchema = z.object({
  code: z.string().trim().min(1),
});

export const miniappWechatBindInputSchema = z.object({
  code: z.string().trim().min(1),
});

export const miniappWechatUnbindInputSchema = z.object({
  confirm: z.literal(true),
});

export type MiniappTokenPair = z.infer<typeof miniappTokenPairSchema>;
export type MiniappWechatLoginInput = z.infer<typeof miniappWechatLoginInputSchema>;
export type MiniappWechatBindInput = z.infer<typeof miniappWechatBindInputSchema>;
export type MiniappWechatUnbindInput = z.infer<typeof miniappWechatUnbindInputSchema>;
