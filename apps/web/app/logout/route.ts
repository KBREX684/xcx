import { NextResponse } from "next/server";

const TOKEN_COOKIE = "acp_token";
const REFRESH_TOKEN_COOKIE = "acp_refresh_token";
const MEMBER_COOKIE = "acp_member";

export function GET(request: Request) {
  const url = new URL(request.url);
  const reason = url.searchParams.get("reason");
  const redirectUrl = new URL("/login", url.origin);
  if (reason) {
    redirectUrl.searchParams.set("reason", reason);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(MEMBER_COOKIE);
  return response;
}
