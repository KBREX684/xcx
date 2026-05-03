import type { IconName } from "@agent-control-plane/mobile-ui";

export const ONBOARDING_VERSION = "2026-04-28";

export interface OnboardingPageContent {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon: IconName;
}

export const onboardingIntroPages = [
  {
    id: "control-plane",
    eyebrow: "multi-agent workbench",
    title: "把项目交给一组可信 Agent 协作",
    description:
      "蜂聚合把团队、项目、流程和智能体放到同一个移动工作台里，让你随时知道任务派给了谁、产出了什么、下一步卡在哪里。",
    bullets: ["团队统一管理 Agent", "项目上下文自动贯穿流程", "消息、审批和证据集中收口"],
    icon: "Bot",
  },
  {
    id: "teams-projects",
    eyebrow: "team · project · agent",
    title: "从团队到项目，移动端也能完成关键管理",
    description:
      "创建团队、绑定 Agent、维护项目和选择流程模板，都用适合手机的单列任务流完成，不要求用户理解复杂后台配置。",
    bullets: ["团队绑定 Agent 能力", "项目聚合 Run、任务与产物", "长内容进入详情完整阅读"],
    icon: "Project",
  },
  {
    id: "workflow-loop",
    eyebrow: "workflow · approval · certificate",
    title: "流程、审批、证书形成可验收闭环",
    description:
      "用预设模板触发流程，查看 Agent 回复全文，审批交付结果，并用证书核验把关键结果留痕给客户。",
    bullets: ["无代码流程模板", "审批与异常提醒", "证书核验和证据链"],
    icon: "Certificate",
  },
] as const satisfies ReadonlyArray<OnboardingPageContent>;

export interface ProductGuideStep {
  title: string;
  body: string;
}

export interface ProductGuideSection {
  id: string;
  label: string;
  title: string;
  summary: string;
  steps: ProductGuideStep[];
}

export const productGuideContent = [
  {
    id: "quickstart",
    label: "快速开始",
    title: "第一次使用蜂聚合",
    summary: "先理解工作区、团队、项目和 Agent 的关系，再开始派发真实流程。",
    steps: [
      {
        title: "登录工作区",
        body: "使用管理员分配的企业邮箱和密码登录。当前版本不开放公开注册，新成员需要联系工作区管理员开通账号。",
      },
      {
        title: "查看首页待办",
        body: "首页聚合未读消息、待审批、异常 Run、重点项目和常用入口。数字异常时先下拉刷新，再进入对应详情核对。",
      },
      {
        title: "从底部导航进入核心区域",
        body: "移动端底部导航保留首页、团队、项目、我的四个入口，审批和收件箱放在首页待办与我的页中，避免底部导航过载。",
      },
    ],
  },
  {
    id: "teams",
    label: "团队",
    title: "团队与 Agent 管理",
    summary: "团队用于组织一组 Agent 的协作边界，也是项目默认使用的执行班组。",
    steps: [
      {
        title: "创建团队",
        body: "进入团队页后点击创建团队，填写团队名称、说明，并选择默认负责的 Agent。名称建议体现交付阶段或业务域。",
      },
      {
        title: "绑定 Agent",
        body: "在团队详情的 Agent 页签中绑定或解绑 Agent。一个 Agent 可以服务多个团队，但生产流程建议只绑定必要能力。",
      },
      {
        title: "查看团队项目",
        body: "团队详情会聚合关联项目和事项，适合排查某个协作班组当前承担的工作量。",
      },
    ],
  },
  {
    id: "projects",
    label: "项目",
    title: "项目与流程触发",
    summary: "项目承载客户目标、任务上下文、流程运行记录和最终产物。",
    steps: [
      {
        title: "创建项目",
        body: "在项目页点击创建项目，填写项目名、客户、说明、团队、优先级和健康状态。项目名会出现在消息、Run 和证书中。",
      },
      {
        title: "选择流程模板",
        body: "项目概览中的流程入口会打开完整模板选择页，长模板名、节点数、团队和最近触发时间都会完整展示。",
      },
      {
        title: "触发并查看 Run",
        body: "触发流程后进入 Run 详情查看执行状态、Agent 输出、产物摘要和失败原因。重复点击会通过幂等策略避免重复创建。",
      },
    ],
  },
  {
    id: "workflow",
    label: "流程",
    title: "无代码流程模板",
    summary: "模板用预设 + 节点列表编辑，移动端不要求手写 JSON。",
    steps: [
      {
        title: "选择预设",
        body: "创建模板时先选择网站建设、交付复核或运营巡检等预设，系统会生成可编辑的节点结构。",
      },
      {
        title: "编辑节点",
        body: "逐个节点维护名称、说明、绑定 Agent、transport、条件和并行字段。复杂 DAG 能力以展示和保存为主。",
      },
      {
        title: "保存后跨端可见",
        body: "移动端保存的模板会出现在 Web 控制台，可从项目中选择并触发，便于管理员在桌面端继续精修。",
      },
    ],
  },
  {
    id: "approval",
    label: "审批证书",
    title: "审批与证书核验",
    summary: "审批保证关键结果经过人工确认，证书用于向客户或第三方证明交付结果。",
    steps: [
      {
        title: "处理审批",
        body: "待审批从首页或我的页进入。进入详情后先阅读证据和 Agent 回复，再通过或驳回。提交后按钮会禁用并刷新状态。",
      },
      {
        title: "查看证据链",
        body: "审批详情和证书详情会展示关联 Run、产物、校验码和时间线，便于追溯交付过程。",
      },
      {
        title: "核验证书",
        body: "证书中心支持手输核验码和扫码核验。相机权限只会在扫码时请求，拒绝权限后仍可手动输入。",
      },
    ],
  },
  {
    id: "inbox",
    label: "收件箱",
    title: "消息、归档与常见问题",
    summary: "收件箱用于集中处理任务回执、提及、异常、审批和已归档消息。",
    steps: [
      {
        title: "筛选消息",
        body: "使用全部、未读、@我、审批、异常、已归档筛选。未读页标已读不会跳回全部，归档不会增加未读数。",
      },
      {
        title: "阅读完整回复",
        body: "列表只展示摘要；Agent 长回复、Run 输出和消息正文都可以进入详情页完整阅读。",
      },
      {
        title: "遇到网络不可用",
        body: "先确认 API 服务和网络状态。移动端会区分离线缓存、接口失败和登录过期，恢复网络后可下拉刷新。",
      },
    ],
  },
] as const satisfies ReadonlyArray<ProductGuideSection>;
