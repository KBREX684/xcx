"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getApiBaseUrl } from "@agent-control-plane/config";
import { actionError, type ActionResult } from "./action-result";

const API_BASE_URL = getApiBaseUrl();
const TOKEN_COOKIE = "acp_token";
const REFRESH_TOKEN_COOKIE = "acp_refresh_token";
const MEMBER_COOKIE = "acp_member";
const COOKIE_MAX_AGE = 8 * 60 * 60;
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(MEMBER_COOKIE);
}

function sanitizeLoginRedirect(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string") {
    return "/";
  }

  const candidate = rawValue.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  try {
    const parsed = new URL(candidate, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return "/";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export async function loginAction(formData: FormData): Promise<ActionResult | never> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeLoginRedirect(formData.get("next"));

  if (!email || !password) {
    return actionError("Please enter your email and password.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
    return actionError(message ?? "Login failed. Check your email and password.");
  }

  const data = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    memberId: string;
    name: string;
    role: string;
    requirePasswordReset?: boolean;
  };

  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
  cookieStore.set(
    MEMBER_COOKIE,
    JSON.stringify({
      memberId: data.memberId,
      name: data.name,
      role: data.role,
      requirePasswordReset: Boolean(data.requirePasswordReset),
    }),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  );

  redirect(nextPath);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  await clearSessionCookies();
  redirect("/login");
}
