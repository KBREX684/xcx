import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack, Inline, Grid, EmptyStateBlock, ErrorBanner, DataList } from "./primitives";

const meta: Meta = {
  title: "Primitives/Layout & Feedback",
};

export default meta;

type Story = StoryObj;

export const StackVertical: Story = {
  render: () => (
    <Stack gap="md">
      <div className="acp-card" style={{ padding: 12 }}>
        第一项
      </div>
      <div className="acp-card" style={{ padding: 12 }}>
        第二项
      </div>
      <div className="acp-card" style={{ padding: 12 }}>
        第三项
      </div>
    </Stack>
  ),
};

export const InlineRow: Story = {
  render: () => (
    <Inline gap="sm" align="center">
      <button type="button" className="action-button">
        主操作
      </button>
      <button type="button" className="action-button action-button--ghost">
        次要操作
      </button>
      <span className="supporting-text">辅助说明文本</span>
    </Inline>
  ),
};

export const GridResponsive: Story = {
  render: () => (
    <Grid minItemWidth={220} gap="md">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="acp-card" style={{ padding: 16 }}>
          网格项 {i + 1}
        </div>
      ))}
    </Grid>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <EmptyStateBlock
      title="暂无审批待处理"
      description="新任务通过工作流推进时会出现在这里。"
      action={
        <button type="button" className="action-button">
          创建工作流
        </button>
      }
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ErrorBanner
      title="加载失败"
      description="无法连接到控制面 API（trace: 4f81c0a2）。请稍后重试或检查网络。"
      onRetry={() => alert("retry")}
    />
  ),
};

export const KeyValueList: Story = {
  render: () => (
    <DataList
      items={[
        { label: "项目编号", value: "PRJ-2024-0481" },
        { label: "负责人", value: "张三" },
        { label: "状态", value: "进行中" },
        { label: "更新时间", value: "2025-04-26 11:24" },
      ]}
    />
  ),
};
