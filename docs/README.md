# 智能代理指挥台文档集

## 目的

本目录将 [agent-control-plane-project-intro.md](../agent-control-plane-project-intro.md) 中的项目设想，收束为一套可直接用于启动项目、对齐团队、指导研发和推进交付的首版文档包。

这套文档默认服务于以下目标：

- 统一产品方向，避免需求失焦
- 明确 MVP 边界，避免过度设计
- 固化首版架构决策，减少技术摇摆
- 形成可执行的研发、测试、发布和风控基线
- 为后续原型、代码仓、数据库设计和客户沟通提供统一口径

## 默认假设

除非后续项目评审明确调整，本套文档采用以下默认方案：

- 产品中文名：`Agent 指挥台`
- 产品内部英文名：`Agent Control Plane`
- 产品定位：面向中国 OPC 的 Agent 团队管理与可信交付平台
- MVP 交付形态：`Web 控制台 + 微信小程序轻指挥端 + 后端控制平面`
- 主开发语言：`TypeScript`
- 辅助开发语言：`Python`
- 首选技术栈：`Next.js + NestJS + Taro + PostgreSQL + Redis + S3 兼容对象存储 + OpenTelemetry`
- Python 使用边界：`AI 试验脚本、离线任务、数据处理、独立 Worker 或特定 Agent 执行器`
- 工作流引擎策略：`MVP 先自研轻量状态机引擎，保留向 Temporal 迁移边界`
- 小程序职责：`控制面，不承担实际执行`

## 文档清单

- [项目章程](./product/project-charter.md)
- [MVP 产品需求文档](./product/prd-mvp.md)
- [Web 页面地图](./product/web-page-map.md)
- [系统架构设计](./architecture/system-architecture.md)
- [核心数据模型设计](./architecture/data-model.md)
- [接口与接入规范](./architecture/api-and-integration.md)
- [项目过程证明规范](./architecture/provenance-spec.md)
- [MVP 执行计划](./delivery/mvp-execution-plan.md)
- [测试与质量保障计划](./quality/test-and-quality-plan.md)
- [风险、安全与运维基线](./operations/risk-security-ops.md)

## 推荐阅读顺序

1. 项目章程
2. MVP 产品需求文档
3. Web 页面地图
4. 系统架构设计
5. 核心数据模型设计
6. 接口与接入规范
7. 项目过程证明规范
8. MVP 执行计划
9. 测试与质量保障计划
10. 风险、安全与运维基线

## 使用方式

- 面向发起人/合伙人：优先看项目章程、PRD、执行计划
- 面向产品/设计：优先看 PRD、Web 页面地图、系统架构中的信息架构和关键流程
- 面向研发：优先看系统架构、数据模型、接口规范、测试计划
- 面向交付/客户成功：优先看项目过程证明规范、执行计划、风险文档

## 下一步建议

当前文档与代码已经完成 P2 Web 控制台主体，下一步建议按如下顺序继续推进：

1. 继续打磨 P3 阶段的 UI/UX 细节与响应式体验
2. 启动微信小程序轻指挥端骨架并复用当前共享 DTO
3. 接入一个真实开放接口执行器，替换当前 mock 执行器
4. 深化证明书详情、导出与验证页
5. 邀请 3-5 位真实 OPC 用户试用当前 Web 主路径
