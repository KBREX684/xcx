import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Modal, Dropdown, Tooltip } from "./overlays";

const meta: Meta = {
  title: "Primitives/Overlays",
};

export default meta;

type Story = StoryObj;

export const ModalConfirm: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" className="action-button" onClick={() => setOpen(true)}>
          打开 Modal
        </button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="确认批量驳回"
          description="即将驳回选中的 3 条审批，操作不可撤销。"
          footer={
            <>
              <button
                type="button"
                className="action-button action-button--ghost"
                onClick={() => setOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="bulk-bar__danger"
                onClick={() => setOpen(false)}
                autoFocus
              >
                确认驳回
              </button>
            </>
          }
        >
          <p className="supporting-text">影响 3 条任务，覆盖 2 个项目。</p>
        </Modal>
      </>
    );
  },
};

export const DropdownMenu: Story = {
  render: () => (
    <div style={{ padding: 40 }}>
      <Dropdown
        items={[
          { id: "view", label: "查看详情", onSelect: () => alert("view") },
          { id: "edit", label: "编辑", onSelect: () => alert("edit") },
          { id: "duplicate", label: "复制", onSelect: () => alert("duplicate"), disabled: true },
          { id: "delete", label: "删除", onSelect: () => alert("delete"), destructive: true },
        ]}
      >
        <button type="button" className="action-button">
          更多操作 ▾
        </button>
      </Dropdown>
    </div>
  ),
};

export const TooltipHover: Story = {
  render: () => (
    <div style={{ padding: 80, display: "flex", gap: 24 }}>
      <Tooltip content="复制 trace ID 到剪贴板">
        <button type="button" className="action-button action-button--ghost">
          复制 trace
        </button>
      </Tooltip>
      <Tooltip content="切换至深色 / 浅色主题" placement="bottom">
        <button type="button" className="action-button action-button--ghost">
          主题
        </button>
      </Tooltip>
    </div>
  ),
};
