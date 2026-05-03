import { z } from "zod";
import { inboxItemKinds } from "../status";

const ISO8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})$/;

export const inboxCursorSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(ISO8601, "lastSeenAt must be ISO8601");

export const miniappInboxFilterValues = [
  "all",
  "mentions",
  "approvals",
  "failures",
  "proof",
  "unread",
  "archived",
] as const;

export const miniappInboxFilterSchema = z.enum(miniappInboxFilterValues);

export const miniappInboxQuerySchema = z.object({
  filter: miniappInboxFilterSchema.default("all"),
  lastSeenAt: inboxCursorSchema.optional(),
});

export const miniappInboxItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(inboxItemKinds),
  title: z.string(),
  subtitle: z.string(),
  body: z.string().nullable().optional(),
  href: z.string(),
  createdAt: z.string(),
  status: z.string().nullable(),
  unread: z.boolean(),
  archived: z.boolean(),
});

export const miniappInboxActionInputSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(50),
});

export type InboxCursor = z.infer<typeof inboxCursorSchema>;
export type MiniappInboxFilter = z.infer<typeof miniappInboxFilterSchema>;
export type MiniappInboxQuery = z.infer<typeof miniappInboxQuerySchema>;
export type MiniappInboxItem = z.infer<typeof miniappInboxItemSchema>;
export type MiniappInboxActionInput = z.infer<typeof miniappInboxActionInputSchema>;

export function encodeInboxCursor(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function decodeInboxCursor(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const result = inboxCursorSchema.safeParse(raw);
  if (!result.success) return null;
  const date = new Date(result.data);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pickLatestCursor<T extends { createdAt: string | Date }>(
  items: readonly T[],
): string {
  if (items.length === 0) return "";
  let latest = 0;
  for (const item of items) {
    const t =
      item.createdAt instanceof Date
        ? item.createdAt.getTime()
        : Date.parse(String(item.createdAt));
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  return latest > 0 ? new Date(latest).toISOString() : "";
}
