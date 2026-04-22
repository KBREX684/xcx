# 智能代理指挥台 · MVP P2

当前版本已经从 P1 的最小闭环，推进到 P2 的可运营 Web 控制台。现在仓库里包含：

- `Next.js` Web 控制台
- `NestJS` API
- 独立 `worker` 轮询执行器
- `Prisma` 领域建模
- 本地 `SQLite + 文件产物` 存储
- `huashu-design + ui-ux-pro-max` 驱动的全中文双主题控制面

当前已经打通的主链路：

`Project -> Task -> Run -> Approval -> Artifact -> Event Timeline`

P2 进一步补齐了：

- 工作台总览
- 项目总览与项目设置
- 审批中心
- 执行代理列表与详情
- 流程模板列表与详情
- 证明书中心
- 接入配置页
- 任务、执行记录、交付产物下钻详情
- `system / light / dark` 三态主题切换

文档入口：

- [项目文档总览](./docs/README.md)
- [Web 页面地图](./docs/product/web-page-map.md)
- [MVP 执行计划](./docs/delivery/mvp-execution-plan.md)

## 快速开始

```bash
npm install
npm run setup
npm run dev
```

默认地址：

- Web：`http://localhost:3000`
- API：`http://localhost:3101`
- Health：`http://localhost:3101/health`

## 常用命令

```bash
npm run setup        # 生成 Prisma Client + 初始化 SQLite + seed
npm run dev          # 同时启动 web/api/worker
npm run build        # 构建并检查所有工作区
npm run test         # 运行单元测试和集成测试
npm run db:reset     # 重建本地数据库并重新 seed
```

## 目录结构

```text
apps/
  api/       NestJS 控制平面 API
  web/       Next.js Web 控制台
  worker/    本地轮询 worker + mock executor
packages/
  domain/    状态枚举、DTO、端口接口、模板常量
  ui/        主题令牌与字体配置
  config/    端口与 bootstrap 配置
prisma/
  schema.prisma
  migrations/0001_init/migration.sql
```

## 当前边界

- 已做：
  - 项目创建与项目设置
  - 任务创建与任务详情
  - 模板触发与执行记录详情
  - worker 执行
  - 待审批 Run
  - 审批通过/驳回
  - 产物登记与产物详情
  - 事件时间线
  - 执行代理、流程模板、证明书、接入配置页面
  - 全中文明暗主题控制台
- 未做：
  - 微信小程序代码
  - 证明书详情导出
  - MCP Relay
  - 真实开放接口执行器接入
  - 完整鉴权与权限体系

## 当前 Web 页面

- `/` 工作台总览
- `/projects` 项目总览
- `/projects/[projectId]` 项目指挥台
- `/projects/[projectId]/tasks/[taskId]` 任务详情页
- `/projects/[projectId]/settings` 项目设置页
- `/runs/[runId]` 执行记录详情页
- `/artifacts/[artifactId]` 交付产物详情页
- `/approvals` 审批中心
- `/agents` 执行代理列表页
- `/agents/[agentId]` 执行代理详情页
- `/workflows` 流程模板页
- `/workflows/[templateId]` 流程模板详情页
- `/certificates` 证明书中心
- `/settings/integrations` 接入配置页

## 说明

- 当前机器上的 Prisma Schema Engine 对 `db push` 不稳定，所以仓库保留 `Prisma schema + Client`，数据库初始化改为执行仓库内的首版 SQL migration。
- 这不影响当前业务代码结构，后续仍可切回标准 Prisma migration 流程。
