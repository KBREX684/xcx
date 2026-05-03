# 蜂聚合 · Web + Mobile Clients

面向中国 OPC（一人公司/超轻团队）的 Agent 指挥台客户端工程。当前分支聚焦同步
Web 控制台与 Android 移动控制面，以及二者共享的领域模型、设计系统和前端配置。

> 后端控制面、Worker、Prisma 迁移、小程序和 Agent Adapter 不属于本次发布包范围。
> Web 与 Mobile 默认通过环境变量连接外部 API 服务。

## 当前内容

```text
apps/
  web/        Next.js 16 Web 控制台
  mobile/     React 19 + React Native 0.83 + Expo 55 Android 客户端
packages/
  domain/     状态枚举、DTO、移动端 schema、证明/签名类型
  ui/         Web 设计 token 与通用 UI primitive
  mobile-ui/  移动端设计 token 与 React Native 组件
  config/     Web/API URL 与客户端 bootstrap 配置
tests/
  web/        Playwright Web 回归与可访问性用例
```

## 快速开始

```bash
npm install

# Web 控制台
npm run dev:web

# Android 移动端
npm run dev:mobile
```

默认开发地址：

- Web：`http://localhost:3000`
- Web API base：`NEXT_PUBLIC_API_URL`，未设置时使用 `http://localhost:3101`
- Mobile API base：`EXPO_PUBLIC_API_BASE_URL`，未设置时使用 Android 模拟器地址 `http://10.0.2.2:3101`

## 常用命令

```bash
npm run build:web             # Next.js 生产构建
npm run build:shared          # 共享包类型检查
npm run typecheck:mobile      # 移动端 TypeScript 检查
npm run test:mobile           # 移动端单元测试
npm run test:web              # Web Playwright 用例
npm run test:a11y             # Web axe 可访问性扫描
npm run check:mobile-release  # Android 提审门禁
```

## 环境变量

复制 `.env.example` 后按本地环境调整：

```bash
NEXT_PUBLIC_API_URL="http://localhost:3101"
EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:3101"
EXPO_PUBLIC_PRIVACY_VERSION="2026-04-26"
EXPO_PUBLIC_CHANNEL="yingyongbao"
```

Release Android 构建必须使用 HTTPS API：

```bash
ACP_MOBILE_RELEASE=1
EXPO_PUBLIC_API_BASE_URL="https://api.example.com"
```

正式上架签名通过 `ACP_ANDROID_KEYSTORE_FILE`、`ACP_ANDROID_KEYSTORE_PASSWORD`、
`ACP_ANDROID_KEY_ALIAS`、`ACP_ANDROID_KEY_PASSWORD` 注入。仓库不会提交任何真实 keystore、
debug keystore、构建产物或本地机器配置。

## 质量基线

本发布包整理时采用以下门禁作为最低验收：

- `npm run build -w @agent-control-plane/web`
- `npm run typecheck:mobile`
- `npm run test:mobile`
- `npm run build -w @agent-control-plane/domain`
- `npm run build -w @agent-control-plane/ui`
- `npm run build -w @agent-control-plane/mobile-ui`
- `npm run build -w @agent-control-plane/config`

## 边界说明

- Web 与 Mobile 是控制面客户端，不在本仓库分支内启动后端服务。
- 所有登录、审批、项目、Agent、证据、证书和移动设备接口均由外部 API 提供。
- Android 原生工程已纳入版本管理，便于应用市场合规审查和 release 构建复现。

## 许可与商业授权

本仓库采用专有商业许可证，未授予任何开源许可。除非获得项目所有者的单独书面商业授权，任何人不得复制、镜像、分发、转售、托管、训练、二次开发或以竞争性产品形式使用本仓库代码、设计、文档、截图与工作流材料。

完整条款见 [LICENSE](./LICENSE)。第三方依赖仍遵循其各自许可证。
