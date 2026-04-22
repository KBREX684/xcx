# 接口与接入规范

## 1. 目标

定义控制平面对内对外接口的统一规范，保证 Web、小程序、外部 Agent、Webhook 触发器和后续第三方生态都能在一致的协议下接入。

## 2. API 设计原则

- 资源导向，优先 REST
- 关键状态变更具备幂等能力
- 所有请求传递 `X-Trace-Id`
- 错误格式统一，便于前端和外部执行器处理
- 对外接入通过 Adapter 归一化为统一 Run 语义

## 3. 鉴权模型

## 3.1 人类用户

- Web / 小程序使用 `JWT Access Token + Refresh Token`
- 工作区成员权限绑定到 Workspace 和 Project

## 3.2 外部 Agent / 执行器

- 使用 `API Key` 或签名方式鉴权
- 每个 Agent 或 Adapter 使用独立凭证
- 高风险执行器支持 IP 白名单和时间戳签名

## 3.3 内部服务

- 使用服务间密钥或私有网络调用
- Worker 与 API 共用内部信任域

## 4. 错误返回规范

```json
{
  "code": "RUN_EXECUTION_FAILED",
  "message": "Agent execution failed",
  "traceId": "trc_01J...",
  "details": {
    "runId": "run_01J..."
  }
}
```

## 5. 核心业务 API

以下为建议的 MVP 资源面设计。

## 5.1 Workspace / Member

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/:workspaceId/members`

## 5.2 Project

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- `POST /api/v1/projects/:projectId/deliver`

## 5.3 Task

- `GET /api/v1/projects/:projectId/tasks`
- `POST /api/v1/projects/:projectId/tasks`
- `GET /api/v1/tasks/:taskId`
- `PATCH /api/v1/tasks/:taskId`
- `POST /api/v1/tasks/:taskId/comments`
- `POST /api/v1/tasks/:taskId/reminders`

## 5.4 Agent Registry

- `GET /api/v1/agents`
- `POST /api/v1/agents`
- `GET /api/v1/agents/:agentId`
- `PATCH /api/v1/agents/:agentId`
- `POST /api/v1/agents/:agentId/enable`
- `POST /api/v1/agents/:agentId/disable`
- `POST /api/v1/agents/:agentId/heartbeat`

## 5.5 Workflow

- `GET /api/v1/workflow-templates`
- `POST /api/v1/workflow-templates`
- `GET /api/v1/workflow-templates/:templateId`
- `POST /api/v1/workflow-templates/:templateId/publish`
- `POST /api/v1/projects/:projectId/workflows/:templateId/trigger`

## 5.6 Run

- `GET /api/v1/runs`
- `GET /api/v1/runs/:runId`
- `POST /api/v1/runs/:runId/retry`
- `POST /api/v1/runs/:runId/cancel`
- `POST /api/v1/runs/:runId/approve`
- `POST /api/v1/runs/:runId/reject`

## 5.7 Artifact

- `GET /api/v1/projects/:projectId/artifacts`
- `GET /api/v1/runs/:runId/artifacts`
- `POST /api/v1/runs/:runId/artifacts`

## 5.8 Certificate

- `GET /api/v1/projects/:projectId/certificates`
- `POST /api/v1/projects/:projectId/certificates/generate`
- `GET /api/v1/certificates/:certificateId`
- `GET /api/v1/certificates/:certificateId/verify`

## 6. OpenAPI Adapter 规范

MVP 首先支持 OpenAPI 执行器接入。平台对每个可执行 Agent 统一要求以下能力：

## 6.1 Agent 注册

`POST /adapter/v1/agents/register`

请求体建议：

```json
{
  "name": "frontend-agent",
  "adapterType": "openapi",
  "baseUrl": "https://agent.example.com",
  "capabilities": [
    {
      "code": "frontend.build-page",
      "name": "Build Page"
    }
  ],
  "auth": {
    "type": "api_key",
    "headerName": "X-Agent-Key"
  }
}
```

## 6.2 发起执行

平台调用外部执行器建议协议：

`POST {agentBaseUrl}/runs`

```json
{
  "runId": "run_01J...",
  "traceId": "trc_01J...",
  "taskId": "tsk_01J...",
  "projectId": "prj_01J...",
  "capabilityCode": "frontend.build-page",
  "input": {
    "goal": "实现首页首屏"
  },
  "callback": {
    "url": "https://control-plane.example.com/api/v1/adapter/openapi/callback",
    "token": "cb_***"
  }
}
```

## 6.3 执行回调

`POST /api/v1/adapter/openapi/callback`

```json
{
  "runId": "run_01J...",
  "traceId": "trc_01J...",
  "status": "succeeded",
  "summary": "首页首屏已实现",
  "artifacts": [
    {
      "type": "code",
      "title": "landing-page",
      "uri": "s3://bucket/artifacts/run_01J/output.zip",
      "sha256": "..."
    }
  ]
}
```

## 7. MCP Adapter 规范

MVP 中 MCP 适合作为标准能力接入补充，建议策略如下：

- 平台只维护 Agent 级接入信息和可调用 capability 列表
- 通过 MCP Relay 服务屏蔽直接连接复杂性
- 对外仍归一到 `Run request -> Run result` 模型
- MVP 不直接暴露底层 MCP 协议细节给业务层

建议内部抽象接口：

- `connect(agentId)`
- `listCapabilities(agentId)`
- `execute(agentId, capabilityCode, payload)`
- `healthcheck(agentId)`

## 8. Webhook 触发规范

## 8.1 入站 Webhook

用于第三方系统触发工作流：

- `POST /api/v1/webhooks/:webhookKey/trigger`

请求体：

```json
{
  "eventType": "customer.requirement.updated",
  "occurredAt": "2026-04-22T10:30:00Z",
  "payload": {
    "projectCode": "PRJ-001",
    "source": "feishu"
  }
}
```

## 8.2 出站 Webhook

用于平台向外同步状态：

- `workflow.run.succeeded`
- `workflow.run.failed`
- `approval.requested`
- `certificate.issued`

## 9. 幂等与重试

- 创建 Run 时使用 `idempotency_key`
- 外部回调以 `runId + callbackSequence` 去重
- 出站 Webhook 失败后采用指数退避重试
- 审批接口必须防止重复提交

## 10. 版本策略

- 统一前缀：`/api/v1`
- 破坏性变更仅通过 `v2` 发布
- Adapter 协议与前台 API 独立版本化

## 11. 日志与追踪要求

所有接口必须记录以下字段：

- `trace_id`
- `workspace_id`
- `project_id`
- `task_id`
- `run_id`
- `actor_type`
- `actor_id`
- `latency_ms`
- `result_status`

## 12. MVP 接入门槛

- 至少支持 1 种 OpenAPI 执行器和 1 种 MCP Relay 接入
- 执行器必须支持健康检查和结果回调
- 所有外部执行结果必须能回填为 Run、Artifact 和 Event
