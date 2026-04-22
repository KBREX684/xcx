# Web 页面地图

## 1. 文档目标

本文件用于固化 `Agent 指挥台` 当前 Web 控制台的页面结构，并给出 P2 阶段应补齐的页面清单。

它是以下事项的统一参考源：

- P1 当前已经落地的 Web 路由范围
- P2 页面补齐的优先级与边界
- PRD、执行计划与研发任务拆解时的页面口径

## 2. P1 当前页面总览

P1 当前只有 2 个业务页面，目标是先把最小闭环跑通，而不是提前铺开完整后台。

| 路由 | 页面名称 | 页面定位 | 当前主要模块 | 状态 |
| --- | --- | --- | --- | --- |
| `/` | 工作区首页 | 工作区总览与项目入口 | 概览 Hero、项目列表、项目创建表单、P1 策略说明 | 已实现 |
| `/projects/[projectId]` | 项目指挥台 | 单项目 cockpit 控制面 | 项目摘要、任务列表、流程触发、审批面板、当前 Run、Artifact 列表、事件时间线、手动建任务 | 已实现 |

## 3. P1 页面层级

```text
/
└── 工作区首页
    ├── 项目概览
    ├── 项目列表入口
    └── 创建项目

/projects/[projectId]
└── 项目指挥台
    ├── 项目摘要
    ├── Task Board
    ├── Trigger Workflow
    ├── Approval Panel
    ├── Current Run
    ├── Artifact List
    ├── Event Timeline
    └── Create Task
```

## 4. P1 页面边界说明

- 工作区首页负责“总览 + 进入项目”，不承载细颗粒度执行详情。
- 项目指挥台是 P1 的核心控制面，承担 `Project -> Task -> Run -> Approval -> Artifact -> Event Timeline` 的最小闭环展示。
- P1 暂不拆分任务详情页、Run 详情页、审批中心等二级页面，避免在领域模型尚未稳定前过早扩张页面数量。

## 5. P2 应补页面清单

以下页面建议在 P2 阶段补齐，用来支撑“功能完善”阶段的 Web 能力闭环。

### 5.1 必补页面

| 优先级 | 路由 | 页面名称 | 主要目的 |
| --- | --- | --- | --- |
| Must | `/projects` | 项目列表页 | 从首页摘要中拆出标准列表视图，支持筛选、排序和批量查看项目状态 |
| Must | `/projects/[projectId]/tasks/[taskId]` | 任务详情页 | 查看任务描述、负责人、依赖、关联 Run、审批结论和产物留痕 |
| Must | `/runs/[runId]` | Run 详情页 | 展示输入、输出摘要、状态流转、错误信息、耗时和 Trace 关联 |
| Must | `/approvals` | 审批中心 | 集中查看待审批事项、历史审批记录和驳回原因 |
| Must | `/artifacts/[artifactId]` | Artifact 详情页 | 查看单个产物的元数据、来源 Run、摘要、哈希和存储位置 |
| Must | `/agents` | Agent 列表页 | 展示 Agent 注册信息、状态、角色和最近活动 |
| Must | `/workflows` | 工作流模板页 | 查看可用模板、模板版本、适用场景和触发入口 |
| Must | `/certificates` | 证明书中心 | 查看项目过程证明书列表、生成状态和验证入口 |

### 5.2 应补但可后置到 P2 后半段

| 优先级 | 路由 | 页面名称 | 主要目的 |
| --- | --- | --- | --- |
| Should | `/agents/[agentId]` | Agent 详情页 | 深入展示单个 Agent 的能力、接入方式、项目绑定和执行记录 |
| Should | `/workflows/[templateId]` | 工作流模板详情页 | 查看模板节点结构、版本信息、适用项目和最近触发记录 |
| Should | `/projects/[projectId]/settings` | 项目设置页 | 管理项目负责人、客户信息、目标日期和默认模板绑定 |
| Should | `/settings/integrations` | 接入配置页 | 配置 OpenAPI Agent、Webhook、对象存储和第三方集成 |

## 6. 页面补齐顺序建议

P2 阶段建议按下面顺序落地：

1. `Run 详情页 + 审批中心`
2. `任务详情页 + Artifact 详情页`
3. `项目列表页 + Agent 列表页`
4. `工作流模板页 + 证明书中心`
5. `详情页与设置页补齐`

这个顺序的原因是：P2 先优先补足执行链路和审批链路，其次再扩展管理类与配置类页面。
