import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "acp_token";
const PUBLIC_PATHS = ["/login", "/logout", "/certificates/verify"];
const CERTIFICATE_VERIFY_PREFIX = "/certificates/verify/";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
}

function statusPage(status: number, title: string, message: string) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy":
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
    },
  );
}

async function verifyPublicCertificatePath(pathname: string) {
  if (!pathname.startsWith(CERTIFICATE_VERIFY_PREFIX)) {
    return null;
  }

  const verificationCode = pathname.slice(CERTIFICATE_VERIFY_PREFIX.length).split("/")[0];
  if (!verificationCode) {
    return statusPage(
      404,
      "Certificate not found",
      "The certificate verification code is missing.",
    );
  }

  const verifyUrl = new URL(
    `/api/v1/certificates/verify/${encodeURIComponent(verificationCode)}`,
    getApiBaseUrl(),
  );

  try {
    const response = await fetch(verifyUrl, { cache: "no-store" });

    if (response.status === 404) {
      return statusPage(
        404,
        "Certificate not found",
        "The certificate verification code does not exist.",
      );
    }

    if (!response.ok) {
      return statusPage(
        502,
        "Verification unavailable",
        "The certificate verification service returned an error.",
      );
    }
  } catch {
    return statusPage(
      503,
      "Verification unavailable",
      "The certificate verification service is unavailable.",
    );
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const certificateResponse = await verifyPublicCertificatePath(pathname);

  if (certificateResponse) {
    return certificateResponse;
  }

  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!hasToken && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasToken && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
