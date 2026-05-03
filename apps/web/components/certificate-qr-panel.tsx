"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function CertificateQrPanel({
  verificationUrl,
  verificationCode,
}: {
  verificationUrl: string;
  verificationCode: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err instanceof Error ? err.message : err));
      });
    return () => {
      cancelled = true;
    };
  }, [verificationUrl]);

  function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `certificate-${verificationCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--panel-bg-strong)",
      }}
    >
      <div
        style={{
          width: 150,
          height: 150,
          background: "#fff",
          borderRadius: 6,
          padding: 8,
          display: "grid",
          placeItems: "center",
        }}
      >
        {error ? (
          <p className="field-error">二维码生成失败</p>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={`Certificate ${verificationCode} verification QR code`}
            width={134}
            height={134}
          />
        ) : (
          <div className="skeleton skeleton--card" style={{ width: 134, height: 134 }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div>
          <p className="eyebrow-text">扫码验证</p>
          <p className="page-description" style={{ margin: 0 }}>
            客户用手机扫码可直达公开验证页，无需登录。
          </p>
        </div>
        <code className="field-code" style={{ fontSize: 12 }}>
          {verificationUrl}
        </code>
        <div className="link-row">
          <button
            type="button"
            className="secondary-action"
            onClick={handleDownload}
            disabled={!dataUrl}
          >
            下载二维码
          </button>
          <button type="button" className="secondary-action" onClick={handlePrint}>
            打印证书
          </button>
        </div>
      </div>
    </div>
  );
}
