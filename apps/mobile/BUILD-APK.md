# Android APK 构建运行手册

> 一份覆盖**首次环境搭建 → 签名密钥 → 一键出包 → 安装验证 → 排错**的端到端文档。所有命令在 Windows / macOS / Linux 都可用（Windows 用 PowerShell）。

---

## 0. TL;DR

```powershell
# 仓库根目录执行
npm install
npm run --workspace=@agent-control-plane/mobile keystore:generate   # 仅首次：生成 release 自签名密钥
npm run build:mobile:android                                        # 出 release APK
```

产物路径：

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

把 APK 拷到手机点击安装即可。**首次安装需要在系统设置中信任来源**。

---

## 1. 前置依赖

| 工具 | 版本 | 必需 | 备注 |
| --- | --- | --- | --- |
| Node.js | ≥ 22 | 是 | 与根仓 `package.json` 一致 |
| JDK | 17 | 是 | RN 0.83 + AGP 8 强约束 |
| Android SDK | API 36 | 是 | 含 `platform-tools` / `build-tools;36.0.0` |
| Android NDK | r27+ | 推荐 | Hermes / R8 优化需要 |
| Gradle | 8.7+ | 否（用 `gradlew`） | 构建时自动下载 |

### 1.1 用仓库自带的 `.tools/` 工具链（推荐 Windows）

仓库支持把 JDK17 + Android SDK 解压到 `.tools/` 目录，`apps/mobile/scripts/run-gradle.mjs` 会自动检测并注入 `JAVA_HOME` / `ANDROID_HOME`，无需配置全局环境变量：

```
.tools/
  jdk17/jdk-17.x.x/        ← 解压后的 JDK
  android-sdk/             ← 解压后的 Android SDK（含 platform-tools/、build-tools/、platforms/）
  keystores/               ← 签名密钥存放处
```

> `.tools/` 已在 `.gitignore` 中，不会进版本控制。

### 1.2 用系统全局环境变量（macOS / Linux 推荐）

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

验证：

```bash
java -version          # 应输出 17.x
adb --version          # 应输出 Android Debug Bridge
```

---

## 2. 安装依赖与原生工程生成

```powershell
# 仓库根
npm install

# 首次或修改 app.config.ts 后必须执行：根据 app.config.ts 重新生成 android/ 工程
npm run --workspace=@agent-control-plane/mobile prebuild
```

`prebuild` 会读 `apps/mobile/app.config.ts` + `plugins/with-hardened-android-manifest.js`，重新生成完整的 `apps/mobile/android/` 工程，包括：

- `AndroidManifest.xml`（已 hardened：禁用明文流量、禁止备份、声明权限白名单/黑名单）
- `app/build.gradle`（含 release signing config、R8/resource shrink 开关）
- `gradle.properties`（含 Hermes 开关、新架构开关等）

**禁止**直接手改 `android/` 内文件——这些改动会被下次 `prebuild` 覆盖。需要永久修改请改 `app.config.ts` 或写 Expo Config Plugin（参考 `apps/mobile/plugins/with-hardened-android-manifest.js`）。

---

## 3. Release 签名密钥

### 3.1 一键生成自签名密钥（开发自测 / 内测）

```powershell
npm run --workspace=@agent-control-plane/mobile keystore:generate
```

这会用 `keytool` 在 `.tools/keystores/mobile-selftest-release.p12` 生成一个 RSA-2048 / 25 年有效期的 PKCS#12 自签名证书，并把签名信息打印到终端。`run-gradle.mjs` 会自动从该路径加载；无需额外配置。

> ⚠️ 自签名密钥**只能用于开发自测、内测分发**。**正式发布到应用宝/华为/小米等应用市场必须使用企业正式签名密钥**，并把密钥与口令托管在公司秘密管理系统（KMS / 1Password / Vault）。

### 3.2 使用企业正式签名密钥

将密钥文件放到任意安全位置，然后通过环境变量注入：

```powershell
$env:ACP_ANDROID_KEYSTORE_FILE     = "C:\secrets\acp-release.jks"   # 绝对路径
$env:ACP_ANDROID_KEYSTORE_PASSWORD = "<storePassword>"
$env:ACP_ANDROID_KEY_ALIAS         = "<alias>"
$env:ACP_ANDROID_KEY_PASSWORD      = "<keyPassword>"

npm run build:mobile:android
```

`apps/mobile/android/app/build.gradle` 在 release buildType 中读取这四个环境变量；`run-gradle.mjs` 会在变量不完整时直接 fail。非 CI 环境未提供企业密钥时会使用 `.tools/keystores/mobile-selftest-release.p12` 生成内测签名包；CI 环境必须提供企业密钥，或显式设置 `ACP_ALLOW_SELFTEST_SIGNING=1` 才允许自测签名。

### 3.3 在 CI 中传递密钥

把密钥文件 base64 后存为 secret，构建时 decode 出来：

```yaml
# 示例（GitHub Actions）
env:
  ACP_ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ACP_ANDROID_KEYSTORE_PASSWORD }}
  ACP_ANDROID_KEY_ALIAS:         ${{ secrets.ACP_ANDROID_KEY_ALIAS }}
  ACP_ANDROID_KEY_PASSWORD:      ${{ secrets.ACP_ANDROID_KEY_PASSWORD }}
steps:
  - run: echo "${{ secrets.ACP_ANDROID_KEYSTORE_B64 }}" | base64 -d > /tmp/release.jks
  - run: ACP_ANDROID_KEYSTORE_FILE=/tmp/release.jks npm run build:mobile:android
```

---

## 4. 一键出包

| 命令 | 产物 | 用途 |
| --- | --- | --- |
| `npm run --workspace=@agent-control-plane/mobile build:android:debug` | `app-debug.apk` | 本机调试 |
| `npm run build:mobile:android` | `app-release.apk` | **发布**，含 prebuild + ARM 架构过滤 + R8/resource shrink + 签名 |
| `npm run check:mobile-release` | （只检查） | 应用宝提交前门禁 |

构建产物路径：

```
apps/mobile/android/app/build/outputs/apk/{debug|release}/app-{debug|release}.apk
```

如启用了 split APK / AAB，路径见 Gradle 输出。

### 4.1 渠道包

```powershell
$env:EXPO_PUBLIC_CHANNEL = "yingyongbao"   # 或 huawei / xiaomi / oppo / vivo
npm run build:mobile:android
```

`app.config.ts` 中 `extra.channel` 会读取该变量，应用内可通过 `expo-constants` 读到。具体渠道差异见 [docs/delivery/mobile-channel-differences-matrix.md](../../docs/delivery/mobile-channel-differences-matrix.md)。

---

## 5. 安装与验证

### 5.1 用 adb 安装到已连接设备

```powershell
adb devices                              # 确认设备已连
adb install -r apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

### 5.2 直接拷贝到手机

把 APK 文件通过 USB / 微信 / 钉钉发到手机，点击文件管理器中的 APK 即可安装。

### 5.3 安装后必查项（自测 checklist）

参考 [docs/quality/mobile-self-test-plan.md](../../docs/quality/mobile-self-test-plan.md)：

- [ ] 启动无白屏 / 无崩溃
- [ ] 隐私协议弹窗与版本号一致
- [ ] 登录 → 首页 → 审批 → 项目 主流程畅通
- [ ] 通知权限按需弹出，拒绝后 App 不应崩溃
- [ ] 摄像头仅在扫码核验时被调用
- [ ] 网络异常时显示降级页（非白屏）

---

## 6. 发布门禁

应用市场提交前，本地必须先跑通：

```powershell
npm run check:mobile-release
```

该脚本会检查：

1. `package.json` 版本号是 `X.Y.Z` 格式
2. `app.config.ts` 权限白/黑名单与 `docs/operations/mobile-permission-matrix.md` 一致
3. `AndroidManifest.xml` 已设 `allowBackup=false` + `usesCleartextTraffic=false`
4. 所有应用宝合规文档存在（隐私政策、SDK 清单、自测计划等共 14 份）
5. 隐私协议版本号与提交日期对齐

任意检查失败都会非 0 退出，**CI 必须把这一步当作必过门禁**。

---

## 7. 常见问题

| 问题 | 原因 | 解决 |
| --- | --- | --- |
| `Could not find tools.jar` | JDK 不是 17 | 用 JDK 17，删除其他 JAVA_HOME |
| `SDK location not found` | 没设 ANDROID_HOME | 见 §1 |
| `Execution failed for task ':app:mergeReleaseResources'` | gradle 缓存损坏 | `cd apps/mobile/android ; .\gradlew clean` |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | 同包名签名不一致 | `adb uninstall com.fengjuhe.acp` 后重装 |
| Release APK 启动黑屏 | JS bundle 没打进 | 重跑 `prebuild`；确认 `npx expo export:embed` 在 gradle 中被调用 |
| 安装后报"未签名" | release 走了 debug 签名回退 | 检查 §3.2 四个环境变量是否齐 |

---

## 8. 相关文档

- [docs/operations/mobile-permission-matrix.md](../../docs/operations/mobile-permission-matrix.md) — 权限矩阵
- [docs/operations/mobile-sdk-inventory.md](../../docs/operations/mobile-sdk-inventory.md) — SDK 清单
- [docs/operations/mobile-bundle-and-r8.md](../../docs/operations/mobile-bundle-and-r8.md) — Hermes / R8 调优
- [docs/operations/mobile-crash-symbolication.md](../../docs/operations/mobile-crash-symbolication.md) — 崩溃符号化
- [docs/delivery/mobile-yingyongbao-submission-gate.md](../../docs/delivery/mobile-yingyongbao-submission-gate.md) — 应用宝提交门禁
- [docs/quality/mobile-self-test-plan.md](../../docs/quality/mobile-self-test-plan.md) — 自测计划
