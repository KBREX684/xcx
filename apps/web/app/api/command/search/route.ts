import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@agent-control-plane/config";
import { getSessionToken } from "../../../../lib/auth";

export async function GET(request: Request) {
  const token = await getSessionToken();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/command/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ items: [], query: q }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
