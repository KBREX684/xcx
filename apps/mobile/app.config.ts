// Expo 应用配置（Bare/Prebuild）。所有运行时变量都从 EXPO_PUBLIC_* 读取，避免在仓库
// 中硬编码 API 主机。腾讯应用宝渠道包通过 `--profile yingyongbao` 在打包时注入。
import type { ExpoConfig } from "expo/config";

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const isReleaseBuild =
  process.env.ACP_MOBILE_RELEASE === "1" ||
  process.env.NODE_ENV === "production" ||
  process.env.EAS_BUILD === "1";

if (isReleaseBuild && !rawApiBaseUrl) {
  throw new Error("Release mobile builds require EXPO_PUBLIC_API_BASE_URL.");
}

if (isReleaseBuild && rawApiBaseUrl && !rawApiBaseUrl.startsWith("https://")) {
  throw new Error("Release mobile builds require an HTTPS EXPO_PUBLIC_API_BASE_URL.");
}

const apiBaseUrl = rawApiBaseUrl ?? "http://10.0.2.2:3101";

const config: ExpoConfig = {
  name: "蜂聚合",
  slug: "agent-control-plane-mobile",
  scheme: "acp",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#f7f3ec",
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.fengjuhe.acp",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#f7f3ec",
    },
    allowBackup: false,
    // P0 阶段只声明业务必需权限。日历 / 通讯录 / 短信 / 位置 / IMEI / 设备唯一标识等
    // 一律不申请，避免应用宝合规审查命中"超范围申请权限"。
    permissions: ["INTERNET", "ACCESS_NETWORK_STATE", "CAMERA", "POST_NOTIFICATIONS"],
    blockedPermissions: [
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
    ],
  },
  plugins: [
    "./plugins/with-hardened-android-manifest",
    [
      "expo-camera",
      {
        cameraPermission: "本应用仅在你扫码核验证书时使用相机。",
      },
    ],
    [
      "expo-secure-store",
      {
        faceIDPermission: "用于安全保管登录令牌。",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#b07b48",
      },
    ],
  ],
  extra: {
    apiBaseUrl,
    privacyVersion: process.env.EXPO_PUBLIC_PRIVACY_VERSION ?? "2026-04-26",
    channel: process.env.EXPO_PUBLIC_CHANNEL ?? "yingyongbao",
  },
  experiments: {
    typedRoutes: false,
  },
};

export default config;
