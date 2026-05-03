// 证书核验：手动输入校验码 / 摄像头扫码 / 详情。
//
// 安全：
// - 摄像头权限按业务触发申请；用户首次拒绝则在页面内引导到系统设置。
// - 扫描结果只接受 `acp://cert/<code>` 或纯校验码，其它内容拒绝并提示。
// - 详情页对外公开（anonymous=true），便于客户在 App 中扫描他人证书。
import * as React from "react";
import { Alert, Linking, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  EmptyState,
  EvidenceSummaryBlock,
  LoadingState,
  StatusBadge,
  Typography,
  palette,
  radius,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { certificateService } from "../../services/controlPlaneService";
import { telemetryClient } from "../../telemetry/telemetryClient";
import type { RouteContext } from "../../navigation/routes";

const CODE_PATTERN = /^[A-Za-z0-9._:-]{6,128}$/;

function parseScanContent(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (CODE_PATTERN.test(trimmed)) return trimmed;
  // 接受 acp://cert/<code> 与 https://acp.example.com/c/<code>
  const m = trimmed.match(/^(?:acp:\/\/cert\/|https?:\/\/[^/]+\/c\/)([A-Za-z0-9._:-]{6,128})$/);
  return m && m[1] ? m[1] : null;
}

export function CertificateVerifyScreen({ navigate, goBack }: RouteContext) {
  const [code, setCode] = React.useState("");
  return (
    <AppScreen padded={false}>
      <AppBar title="证书核验" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Typography variant="title" weight="semibold">
            手动输入
          </Typography>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="请输入证书校验码"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={{ marginTop: spacing.sm }}>
            <Button
              label="核验"
              fullWidth
              onPress={() => {
                const parsed = parseScanContent(code);
                if (!parsed) {
                  Alert.alert("提示", "校验码格式不合法");
                  return;
                }
                navigate({ name: "CertificateDetail", verificationCode: parsed });
              }}
            />
          </View>
        </Card>
        <Card style={{ marginTop: spacing.lg }}>
          <Typography variant="title" weight="semibold">
            扫码核验
          </Typography>
          <Typography variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
            打开摄像头对准证书二维码，系统会立即解析并跳转到详情页。
          </Typography>
          <View style={{ marginTop: spacing.sm }}>
            <Button label="打开扫码" variant="secondary" fullWidth onPress={() => navigate({ name: "CertificateScan" })} />
          </View>
        </Card>
      </ScrollView>
    </AppScreen>
  );
}

export function CertificateScanScreen({ navigate, goBack }: RouteContext) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = React.useState(true);

  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <AppScreen>
        <LoadingState label="检查相机权限…" />
      </AppScreen>
    );
  }

  if (!permission.granted) {
    return (
      <AppScreen padded={false}>
        <AppBar title="扫码核验" onBack={goBack} />
        <EmptyState
          title="未授权使用相机"
          description="本应用仅在你扫码核验证书时使用相机，且不会上传任何图像。请在系统设置中授予权限。"
          actionLabel={permission.canAskAgain ? "授予权限" : "前往系统设置"}
          onAction={() => {
            if (permission.canAskAgain) {
              void requestPermission();
            } else {
              void Linking.openSettings();
            }
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <AppBar title="扫码核验" onBack={goBack} />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scanning
              ? (event) => {
                  const parsed = parseScanContent(event.data ?? "");
                  if (!parsed) {
                    void telemetryClient.track("scan_failed", {
                      outcome: "error",
                      attrs: { reason: "format" },
                    });
                    return; // 继续扫描
                  }
                  setScanning(false);
                  void telemetryClient.track("scan_succeeded");
                  navigate({ name: "CertificateDetail", verificationCode: parsed });
                }
              : undefined
          }
        />
        <View style={styles.frame} pointerEvents="none" />
      </View>
    </AppScreen>
  );
}

export function CertificateDetailScreen({
  verificationCode,
  ctx,
}: {
  verificationCode: string;
  ctx: RouteContext;
}) {
  const detailQuery = useQuery({
    queryKey: ["mobile.cert.detail", verificationCode],
    queryFn: async () => {
      const r = await certificateService.fetchByCode(verificationCode);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });
  const evidenceQuery = useQuery({
    queryKey: ["mobile.cert.evidence", verificationCode],
    queryFn: async () => {
      const r = await certificateService.fetchEvidence(verificationCode);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  React.useEffect(() => {
    if (detailQuery.isSuccess) {
      void telemetryClient.track("certificate_verified");
    } else if (detailQuery.isError) {
      void telemetryClient.track("certificate_verify_failed", { outcome: "error" });
    }
  }, [detailQuery.isSuccess, detailQuery.isError]);

  return (
    <AppScreen padded={false}>
      <AppBar title="证书详情" onBack={ctx.goBack} />
      {detailQuery.isLoading ? (
        <LoadingState />
      ) : detailQuery.isError || !detailQuery.data ? (
        <EmptyState
          tone="danger"
          title="未找到证书"
          description={
            detailQuery.error instanceof Error ? detailQuery.error.message : "请确认校验码或扫描内容是否正确"
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Card>
            <View style={styles.headRow}>
              <Typography variant="titleLg" weight="semibold">
                {detailQuery.data.title}
              </Typography>
              <StatusBadge
                label={detailQuery.data.status}
                tone={
                  detailQuery.data.status === "issued"
                    ? "success"
                    : detailQuery.data.status === "revoked"
                      ? "danger"
                      : "warning"
                }
                dot
              />
            </View>
            <Typography variant="caption" tone="muted">
              证书编号 {detailQuery.data.certificateNo}
            </Typography>
            <Typography variant="caption" tone="muted">
              校验码 {detailQuery.data.verificationCode}
            </Typography>
          </Card>
          <View style={{ marginTop: spacing.lg }}>
            <EvidenceSummaryBlock summary={evidenceQuery.data ?? null} />
          </View>
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  input: {
    marginTop: spacing.sm,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: spacing.md,
    color: palette.textPrimary,
    backgroundColor: palette.bgSurface,
  },
  cameraWrap: {
    flex: 1,
    backgroundColor: "#000",
  },
  frame: {
    position: "absolute",
    top: "20%",
    bottom: "20%",
    left: "10%",
    right: "10%",
    borderColor: palette.accent,
    borderWidth: 2,
    borderRadius: radius.lg,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
