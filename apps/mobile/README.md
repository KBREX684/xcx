# apps/mobile · 蜂聚合移动控制面（Android · React Native + Expo）

> 适用阶段：P0（应用宝首发候选）
> 状态：移动端 P0 客户端工程已整理；Android 真机回归与应用市场提审待执行
> 后端要求：需提供 `/api/v1/mobile/*`、登录、项目、审批、证据和证书核验接口

## 技术栈

- React 19 + React Native 0.83 + Expo SDK 55（Bare/Prebuild 工作流）
- TypeScript 5.6 + Zod 4
- 数据：`@tanstack/react-query` + React Navigation
- 安全存储：`expo-secure-store`（Android KeyStore）
- 设计系统：`@agent-control-plane/mobile-ui`（Claude 暖白米 + Linear 系统化网格）
- DTO：`@agent-control-plane/domain` 的 `mobile` 命名空间

## 目录结构

```
apps/mobile/
├── app.config.ts            # Expo / Android 权限白黑名单 / 渠道注入
├── babel.config.js
├── metro.config.js          # monorepo watchFolders + disableHierarchicalLookup
├── tsconfig.json            # 继承 tsconfig.base.json + jsx=react-native
├── App.tsx                  # Provider + RootNavigator + telemetry
├── index.js                 # Expo registerRootComponent 入口
├── android/                 # Expo prebuild 生成并纳入版本管理的 Android 工程
├── scripts/
│   ├── release-checklist.mjs   # 提审门禁脚本（npm run check:mobile-release）
│   └── run-gradle.mjs          # 统一 Gradle debug/release 构建入口
└── src/
    ├── config/env.ts        # 运行时环境聚合（API base / 隐私版本 / 渠道）
    ├── navigation/          # RootNavigator + MainNavigator + routes（React Navigation）
    ├── screens/
    │   ├── auth/            # PrivacyConsent / Legal / Login
    │   ├── home/            # HomeScreen（聚合首屏）
    │   ├── approval/        # 列表 + 详情（带 EvidenceSummaryBlock + 幂等动作）
    │   ├── project/         # 列表 + 概览 + Run/Task 详情
    │   ├── agent/           # 列表 + 详情
    │   ├── certificate/     # 手输 + 扫码 + 详情
    │   └── settings/        # 设置 + 退出登录 + 撤回同意
    ├── services/            # apiClient / authService / deviceService / controlPlane
    ├── storage/             # secureTokenStore / consentStore / deviceIdStore
    ├── permissions/         # 业务触发的权限服务
    ├── telemetry/           # sanitizer + 队列上报
    └── state/               # AuthContext / ConsentContext
```

## 开发与发布命令

```bash
# 安装依赖（首次 / 添加新依赖时）
npm install

# 启动开发（在已连接 Android 设备上）
npm run -w @agent-control-plane/mobile prebuild     # Android 原生配置变更后刷新 android/ 目录
npm run -w @agent-control-plane/mobile android      # 启动 Metro + 编译 debug APK 推到设备

# 类型检查（独立于工作区 typecheck）
npm run typecheck:mobile

# 发布门禁（本地或 CI 必须通过）
npm run check:mobile-release

# 打 Release APK
npm run build:mobile:android
```

Release 构建要求设置 `EXPO_PUBLIC_API_BASE_URL=https://...`。正式上架包必须通过
`ACP_ANDROID_KEYSTORE_FILE`、`ACP_ANDROID_KEYSTORE_PASSWORD`、`ACP_ANDROID_KEY_ALIAS`、
`ACP_ANDROID_KEY_PASSWORD` 注入企业签名密钥；仓库不会提交任何真实签名材料。

## 关键合规决策

1. **隐私同意先于一切**：未同意时不允许进入登录页；拒绝同意 = 退出 App。同意状态由
   `expo-secure-store` 持久化，隐私版本号变化会重置同意。
2. **权限按业务触发**：相机权限只在用户点击「打开扫码」时申请；通知权限在登录后首次进入
   主页时提示；冷启动期不弹任何权限对话框。
3. **设备唯一标识**：使用本地生成的 UUID（`acp.device.id` 落 SecureStore），不申请
   `READ_PHONE_STATE`，不读取 IMEI / IMSI / IDFA。
4. **遥测白名单**：`telemetryClient.sanitizeAttrs` 在入队前过滤密钥/令牌/邮箱/手机号/
   身份证号；失败回滚队列保留最近 1000 条。
5. **审批幂等**：每个 ApprovalDetailScreen mount 时生成一个 `clientRequestId`，重试不会
   重复决策（后端 `IdempotencyLedger` 去重；P0 内存版，P1 接 Prisma）。

## 后端联动

客户端默认调用以下后端接口；本发布包只同步 Web/Mobile 客户端，不包含后端实现：

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/v1/mobile/devices` | 设备注册（必须 `privacyConsent=true`） |
| `DELETE` | `/api/v1/mobile/devices/:deviceId` | 设备注销 |
| `PATCH` | `/api/v1/mobile/devices/:deviceId/push-token` | 更新推送令牌 |
| `POST` | `/api/v1/mobile/telemetry` | 匿名遥测批量上报（限速 60 次/分钟） |
| `GET` | `/api/v1/mobile/releases/current` | 版本检查（按渠道返回最低/最新版本） |
| `GET` | `/api/v1/mobile/home` | 首屏聚合（占位，P1 接入聚合 Service） |

## 后续工作（非 P0）

- [ ] **P1 推送通道**：HMS Push / MiPush / OPPO Push 渠道分发
- [ ] **P1 Inbox 全量**：消息中心、@提醒、批量已读
- [ ] **P1 Task 详情接口**：与 Web 项目详情对齐
- [ ] **P2 工作流触发**：从移动端发起 workflow（带审批）
- [ ] **P2 离线队列**：弱网时审批/动作排队 + 联网回放（带冲突合并）
