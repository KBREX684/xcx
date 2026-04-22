const executorTypeLabels = {
  mock: "本地模拟执行器",
  openapi: "开放接口执行器"
} as const;

const storageProviderLabels = {
  "local-file": "本地文件存储",
  "s3-compatible": "S3 兼容对象存储"
} as const;

const notificationChannelLabels = {
  none: "暂不通知",
  wechat: "微信通知",
  feishu: "飞书通知",
  wecom: "企微通知"
} as const;

const approvalModeLabels = {
  manual: "人工审批",
  assisted: "辅助审批"
} as const;

const healthStatusLabels = {
  healthy: "健康",
  degraded: "降级",
  offline: "离线"
} as const;

const triggerTypeLabels = {
  manual: "手动触发",
  webhook: "回调触发",
  scheduled: "定时触发"
} as const;

const scenarioTypeLabels = {
  "mini-program-delivery": "小程序项目交付"
} as const;

const nodeTypeLabels = {
  task: "任务节点",
  approval: "审批节点",
  end: "结束节点"
} as const;

function formatWithOptions(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions
) {
  if (!value) {
    return "暂无";
  }

  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", options).format(normalized);
}

export function formatDateTime(value: string | null | undefined) {
  return formatWithOptions(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDate(value: string | null | undefined) {
  return formatWithOptions(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "刚刚";
  }

  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    return "刚刚";
  }

  const diffMs = normalized.getTime() - Date.now();
  const absoluteSeconds = Math.round(Math.abs(diffMs) / 1000);
  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(Math.round(diffMs / 1000), "second");
  }

  const absoluteMinutes = Math.round(absoluteSeconds / 60);
  if (absoluteMinutes < 60) {
    return formatter.format(Math.round(diffMs / (1000 * 60)), "minute");
  }

  const absoluteHours = Math.round(absoluteMinutes / 60);
  if (absoluteHours < 24) {
    return formatter.format(Math.round(diffMs / (1000 * 60 * 60)), "hour");
  }

  const absoluteDays = Math.round(absoluteHours / 24);
  if (absoluteDays < 30) {
    return formatter.format(Math.round(diffMs / (1000 * 60 * 60 * 24)), "day");
  }

  return formatDate(value);
}

export function shortTrace(traceId: string | null | undefined, length = 8) {
  if (!traceId) {
    return "暂无";
  }

  return traceId.slice(0, length);
}

export function formatJsonBlock(value: string | null | undefined) {
  if (!value) {
    return "暂无结构化内容";
  }

  try {
    return JSON.stringify(JSON.parse(value) as unknown, null, 2);
  } catch {
    return value;
  }
}

export function getExecutorTypeLabel(value: string) {
  return executorTypeLabels[value as keyof typeof executorTypeLabels] ?? value;
}

export function getStorageProviderLabel(value: string) {
  return storageProviderLabels[value as keyof typeof storageProviderLabels] ?? value;
}

export function getNotificationChannelLabel(value: string) {
  return notificationChannelLabels[value as keyof typeof notificationChannelLabels] ?? value;
}

export function getApprovalModeLabel(value: string) {
  return approvalModeLabels[value as keyof typeof approvalModeLabels] ?? value;
}

export function getHealthStatusLabel(value: string) {
  return healthStatusLabels[value as keyof typeof healthStatusLabels] ?? value;
}

export function getTriggerTypeLabel(value: string) {
  return triggerTypeLabels[value as keyof typeof triggerTypeLabels] ?? value;
}

export function getScenarioTypeLabel(value: string) {
  return scenarioTypeLabels[value as keyof typeof scenarioTypeLabels] ?? value;
}

export function getNodeTypeLabel(value: string) {
  return nodeTypeLabels[value as keyof typeof nodeTypeLabels] ?? value;
}
