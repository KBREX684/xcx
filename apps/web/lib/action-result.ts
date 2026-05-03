import { toFriendlyError } from "./error-messages";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export function actionOk<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError<T = never>(error: string): ActionResult<T> {
  return { ok: false, error: toFriendlyError(error) };
}
