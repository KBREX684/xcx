import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusPill, SectionCard, DataTable, EmptyState } from "./components";

const meta: Meta = {
  title: "Components/Building Blocks",
};

export default meta;

type Story = StoryObj;

export const StatusPills: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[
        "idle",
        "running",
        "waiting_review",
        "blocked",
        "offline",
        "succeeded",
        "failed",
        "cancelled",
      ].map((status) => (
        <StatusPill key={status} status={status} />
      ))}
    </div>
  ),
};

export const Section: Story = {
  render: () => (
    <SectionCard
      eyebrow="项目工作台"
      title="近期执行"
      action={
        <button type="button" className="action-button action-button--ghost">
          查看全部
        </button>
      }
    >
      <p className="supporting-text">这里是一个示意 SectionCard，用于把模块化内容收拢在统一的卡片样式中。</p>
    </SectionCard>
  ),
};

export const Table: Story = {
  render: () => (
    <DataTable headers={["项目", "负责人", "状态", "更新时间"]}>
      <tr>
        <td>报名活动小程序</td>
        <td>张三</td>
        <td>
          <StatusPill status="running" />
        </td>
        <td>2025-04-26 10:42</td>
      </tr>
      <tr>
        <td>客户成功仪表盘</td>
        <td>李四</td>
        <td>
          <StatusPill status="waiting_review" />
        </td>
        <td>2025-04-25 18:11</td>
      </tr>
    </DataTable>
  ),
};

export const EmptyStateExample: Story = {
  render: () => (
    <EmptyState
      title="暂无相关项目"
      description="切换其他筛选条件，或创建新项目以开始追踪。"
      actions={
        <button type="button" className="action-button">
          新建项目
        </button>
      }
    />
  ),
};
