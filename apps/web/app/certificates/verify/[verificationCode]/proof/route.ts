import type { NextRequest } from "next/server";
import { getCertificateProof } from "../../../../../lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public proof JSON download.
 *
 * Streams the offline-verifiable proof bundle for a certificate
 * (verificationCode is the bearer). Used by the "下载证明 JSON" button on
 * the public verification page so clients can archive an auditable copy.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ verificationCode: string }> },
) {
  const { verificationCode } = await params;

  try {
    const proof = await getCertificateProof(verificationCode);
    const body = JSON.stringify(proof, null, 2);
    const filename = `certificate-proof-${proof.result.certificateNo || verificationCode}.json`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "证书核验失败或不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
