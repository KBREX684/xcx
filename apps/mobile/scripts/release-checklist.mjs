#!/usr/bin/env node
// 移动端发布前自动门禁：检查 package.json 版本、app.config.ts 权限、必要文档存在。
// 退出码 0 = 通过；非 0 = 不通过，CI 阻断发布。
//
// 用法：node ./scripts/release-checklist.mjs
//   或：npm run -w @agent-control-plane/mobile release-checklist
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, "..");
const repoRoot = resolve(mobileRoot, "../..");

let failed = 0;
const fail = (msg) => {
  failed += 1;
  console.error(`✘ ${msg}`);
};
const ok = (msg) => console.log(`✔ ${msg}`);

function readTextIfExists(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function collectFiles(root, out = []) {
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    out.push(full);
  }
  return out;
}

// 1. package.json 版本必须语义化
const pkg = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  fail(`package.json version 必须是 X.Y.Z，当前 ${pkg.version}`);
} else {
  ok(`package.json version=${pkg.version}`);
}

// 2. app.config.ts 中权限必须与权限矩阵一致
const appConfig = readFileSync(resolve(mobileRoot, "app.config.ts"), "utf8");
const REQUIRED_PERMS = ["INTERNET", "ACCESS_NETWORK_STATE", "CAMERA", "POST_NOTIFICATIONS"];
const FORBIDDEN_PERMS = [
  "READ_PHONE_STATE",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "READ_CONTACTS",
  "READ_SMS",
  "READ_CALL_LOG",
  "READ_CALENDAR",
  "WRITE_CALENDAR",
  "BODY_SENSORS",
  "REQUEST_INSTALL_PACKAGES",
  "READ_EXTERNAL_STORAGE",
  "WRITE_EXTERNAL_STORAGE",
  "RECORD_AUDIO",
  "SYSTEM_ALERT_WINDOW",
  "VIBRATE",
  "RECEIVE_BOOT_COMPLETED",
  "WAKE_LOCK",
  "USE_BIOMETRIC",
  "USE_FINGERPRINT",
  "com.google.android.c2dm.permission.RECEIVE",
  "com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE",
  "com.sec.android.provider.badge.permission.READ",
  "com.sec.android.provider.badge.permission.WRITE",
  "com.htc.launcher.permission.READ_SETTINGS",
  "com.htc.launcher.permission.UPDATE_SHORTCUT",
  "com.sonyericsson.home.permission.BROADCAST_BADGE",
  "com.sonymobile.home.permission.PROVIDER_INSERT_BADGE",
  "com.anddoes.launcher.permission.UPDATE_COUNT",
  "com.majeur.launcher.permission.UPDATE_BADGE",
  "com.huawei.android.launcher.permission.CHANGE_BADGE",
  "com.huawei.android.launcher.permission.READ_SETTINGS",
  "com.huawei.android.launcher.permission.WRITE_SETTINGS",
  "android.permission.READ_APP_BADGE",
  "com.oppo.launcher.permission.READ_SETTINGS",
  "com.oppo.launcher.permission.WRITE_SETTINGS",
  "me.everything.badger.permission.BADGE_COUNT_READ",
  "me.everything.badger.permission.BADGE_COUNT_WRITE",
];
for (const p of REQUIRED_PERMS) {
  if (!appConfig.includes(`"${p}"`)) fail(`app.config.ts 缺少必需权限 ${p}`);
}
for (const p of FORBIDDEN_PERMS) {
  // 必须出现在 blockedPermissions 中，但不应出现在 permissions 数组里
  // 简化判断：blockedPermissions 块内必须包含
  const blockedMatch = appConfig.match(/blockedPermissions:\s*\[([\s\S]*?)\]/);
  if (!blockedMatch || !blockedMatch[1].includes(`"${p}"`)) {
    fail(`app.config.ts blockedPermissions 缺少 ${p}`);
  }
}
if (failed === 0) ok("app.config.ts 权限白/黑名单与权限矩阵一致");

const manifestPath = resolve(mobileRoot, "android/app/src/main/AndroidManifest.xml");
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, "utf8");
  for (const p of FORBIDDEN_PERMS) {
    const permissionName = p.includes(".") ? p : `android.permission.${p}`;
    const escaped = permissionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<uses-permission[^>]+android:name="${escaped}"[^>]*>`, "g");
    const matches = manifest.match(re) ?? [];
    if (matches.some((line) => !line.includes('tools:node="remove"'))) {
      fail(`AndroidManifest.xml 仍主动声明禁止权限 ${p}`);
    }
  }
  if (!manifest.includes('android:allowBackup="false"')) {
    fail('AndroidManifest.xml 必须设置 android:allowBackup="false"');
  }
  if (!manifest.includes('android:usesCleartextTraffic="false"')) {
    fail('AndroidManifest.xml 必须设置 android:usesCleartextTraffic="false"');
  }
  if (failed === 0) ok("AndroidManifest.xml 安全权限检查通过");
}

// 2b. 发布包必须显式注入 HTTPS API 地址，且不能把本地/示例主机带进 runtime。
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
if (!apiBaseUrl) {
  fail("发布门禁要求 EXPO_PUBLIC_API_BASE_URL 显式注入生产 HTTPS API 地址");
} else {
  try {
    const url = new URL(apiBaseUrl);
    const forbiddenHosts = new Set(["api.example.com", "localhost", "127.0.0.1", "10.0.2.2"]);
    if (url.protocol !== "https:") {
      fail("EXPO_PUBLIC_API_BASE_URL 必须使用 https://");
    } else if (forbiddenHosts.has(url.hostname)) {
      fail(`EXPO_PUBLIC_API_BASE_URL 不能使用本地/示例主机：${url.hostname}`);
    } else {
      ok(`生产 API 地址 ${url.origin}`);
    }
  } catch {
    fail("EXPO_PUBLIC_API_BASE_URL 不是合法 URL");
  }
}

const signingKeys = [
  "ACP_ANDROID_KEYSTORE_FILE",
  "ACP_ANDROID_KEYSTORE_PASSWORD",
  "ACP_ANDROID_KEY_ALIAS",
  "ACP_ANDROID_KEY_PASSWORD",
];
const providedSigningKeys = signingKeys.filter((key) => Boolean(process.env[key]));
const allowSelfTestSigning = process.env.ACP_ALLOW_SELFTEST_SIGNING === "1";
if (providedSigningKeys.length > 0 && providedSigningKeys.length < signingKeys.length) {
  fail(`Android release signing env is incomplete. Missing: ${signingKeys.filter((key) => !process.env[key]).join(", ")}`);
} else if (providedSigningKeys.length === signingKeys.length) {
  ok("Android release signing env is explicitly provided");
} else if (allowSelfTestSigning) {
  ok("Android release signing uses ACP_ALLOW_SELFTEST_SIGNING=1; this is a pre-submission candidate APK only");
} else {
  fail("Store release requires ACP_ANDROID_* signing secrets. Set ACP_ALLOW_SELFTEST_SIGNING=1 only for candidate APKs");
}

const forbiddenRuntimeHosts = [
  "https://api.example.com",
  "http://localhost",
  "https://localhost",
  "http://127.0.0.1",
  "https://127.0.0.1",
  "http://10.0.2.2",
  "https://10.0.2.2",
];
const runtimeFiles = [
  resolve(mobileRoot, "src/config/env.ts"),
  ...collectFiles(resolve(mobileRoot, "android/app/build/generated/assets/createBundleReleaseJsAndAssets")),
  ...collectFiles(resolve(mobileRoot, "android/app/build/intermediates/assets/release")),
  ...collectFiles(resolve(mobileRoot, "android/app/build/outputs/apk/release")),
].filter((file) => /\.(ts|tsx|js|json|bundle|map|apk)$/i.test(file));

for (const file of runtimeFiles) {
  const stat = statSync(file);
  if (stat.size > 100 * 1024 * 1024) continue;
  const contents = readFileSync(file);
  for (const host of forbiddenRuntimeHosts) {
    if (contents.includes(Buffer.from(host))) {
      fail(`发布产物/配置包含禁止 API 主机 ${host}: ${file}`);
    }
  }
}
if (failed === 0) ok("runtime API 主机扫描通过");

// 3. 必要文档存在
const REQUIRED_DOCS = [
  "docs/operations/mobile-permission-matrix.md",
  "docs/operations/mobile-sdk-inventory.md",
  "docs/delivery/mobile-yingyongbao-submission-gate.md",
  "docs/operations/mobile-performance-baseline.md",
  "docs/operations/mobile-bundle-and-r8.md",
  "docs/operations/mobile-crash-symbolication.md",
  "docs/operations/mobile-multi-channel-build.md",
  "docs/operations/mobile-certificate-pinning-rfc.md",
  "docs/operations/mobile-security-audit-risk-acceptance.md",
  "docs/delivery/mobile-channel-differences-matrix.md",
  "docs/delivery/mobile-ios-spike-report.md",
  "docs/delivery/mobile-ios-app-store-compliance.md",
  "docs/delivery/mobile-mdm-enterprise-deployment-whitepaper.md",
  "docs/quality/mobile-self-test-plan.md",
];
for (const d of REQUIRED_DOCS) {
  if (!existsSync(resolve(repoRoot, d))) fail(`缺少必要合规文档 ${d}`);
  else ok(`文档存在 ${d}`);
}

// 4. PrivacyConsent 文案版本号
const privacyVersion = (appConfig.match(/privacyVersion:[\s\S]*?\?\?\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/) ?? [])[1];
if (!privacyVersion) {
  fail(`隐私版本号格式错误，期望 YYYY-MM-DD`);
} else {
  ok(`隐私版本号 ${privacyVersion}`);
}

// 5. 检查是否引用了 telemetry sanitizer
const telemetry = readFileSync(resolve(mobileRoot, "src/telemetry/telemetryClient.ts"), "utf8");
if (!telemetry.includes("FORBIDDEN_KEY_PATTERNS")) {
  fail("telemetryClient.ts 缺少 FORBIDDEN_KEY_PATTERNS 字段过滤");
} else {
  ok("telemetry sanitizer 已启用");
}

if (!telemetry.includes("setConsentEnabled") || !telemetry.includes("if (!consentEnabled) return")) {
  fail("telemetryClient.ts 缺少隐私同意闸门");
} else {
  ok("telemetry 隐私同意闸门已启用");
}

const appSource = readTextIfExists(resolve(mobileRoot, "App.tsx"));
if (!appSource.includes("if (!consent) return") || !appSource.includes("setConsentEnabled(true)")) {
  fail("App.tsx 必须在隐私同意后才启动 telemetry");
} else {
  ok("App.tsx telemetry 启动顺序通过");
}

if (failed > 0) {
  console.error(`\n发布门禁未通过：${failed} 项失败`);
  process.exit(1);
}
console.log("\n发布门禁全部通过");
