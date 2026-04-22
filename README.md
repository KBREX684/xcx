# Agent 指挥台 · MVP P1

P1 目标是从零搭起一个可本地运行的 `web + api + worker` monorepo，并跑通最小闭环：

`Project -> Task -> Run -> Approval -> Artifact -> Event Timeline`

这一版已经包含：

- `Next.js` Web 控制台
- `NestJS` API
- 独立 `worker` 轮询执行器
- `Prisma` 领域建模
- 本地 `SQLite + 文件产物` 存储
- `huashu-design` 风格的关键控制面界面

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
  ui/        P1 设计令牌
  config/    端口与 bootstrap 配置
prisma/
  schema.prisma
  migrations/0001_init/migration.sql
```

## P1 当前边界

- 已做：
  - 项目创建
  - 任务创建
  - 模板触发
  - worker 执行
  - 待审批 Run
  - 审批通过/驳回
  - 产物登记
  - 事件时间线
- 未做：
  - 小程序代码
  - 证书生成
  - MCP Relay
  - 真实 OpenAPI Agent 接入
  - 完整鉴权与权限体系

## 说明

- 当前机器上的 Prisma Schema Engine 对 `db push` 不稳定，所以仓库保留 `Prisma schema + Client`，数据库初始化改为执行仓库内的首版 SQL migration。
- 这不影响 P1 的业务代码结构，后续仍可切回标准 Prisma migration 流程。
