import type { NextConfig } from "next";

function getProductionApiOrigin() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    const productionApiOrigin = getProductionApiOrigin();
    const scriptSrc = isProduction
      ? ["script-src 'self' 'unsafe-inline'"]
      : ["script-src 'self' 'unsafe-inline' 'unsafe-eval'"];
    const connectSrc = isProduction
      ? ["connect-src 'self'", productionApiOrigin].filter(Boolean).join(" ")
      : "connect-src 'self' http://localhost:* http://127.0.0.1:*";
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          ...scriptSrc,
          connectSrc,
          "form-action 'self'",
        ].join("; "),
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: [
    "@agent-control-plane/config",
    "@agent-control-plane/domain",
    "@agent-control-plane/ui",
  ],
};

export default nextConfig;
