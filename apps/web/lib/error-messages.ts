const FRIENDLY_MESSAGES: Array<{ match: RegExp; message: string }> = [
  {
    match: /invalid credentials|incorrect password|user not found/i,
    message: "邮箱或密码不正确，请重试。",
  },
  { match: /rate limit|too many requests|throttler/i, message: "操作过于频繁，请稍后再试。" },
  {
    match: /token.*expired|jwt expired|unauthorized|missing token/i,
    message: "会话已过期，请重新登录。",
  },
  {
    match: /insufficient permission|forbidden|access denied|admin role is required/i,
    message: "当前账号权限不足，请联系管理员。",
  },
  { match: /not found/i, message: "目标记录不存在或已被删除。" },
  {
    match: /validation failed|request validation|route parameter|query validation/i,
    message: "请求参数不合法，请检查表单填写。",
  },
  { match: /already exists|capability.*already/i, message: "目标记录已经存在，请勿重复提交。" },
  { match: /nonce.*already used|replay/i, message: "本次操作的签名已被使用，请重新发起。" },
  {
    match: /signature.*invalid|digest mismatch|signed.*expired/i,
    message: "行为签名校验失败，请检查密钥或重新登录 Agent。",
  },
  {
    match: /password must|password.*uppercase|password.*special/i,
    message: "密码强度不符合要求：至少 10 位，包含大小写字母、数字和符号。",
  },
  { match: /only failed webhook deliveries/i, message: "只有失败的 Webhook 投递可以手动重试。" },
];

const GENERIC = "操作失败，请稍后再试。";

export function toFriendlyError(raw: string | null | undefined): string {
  if (!raw) return GENERIC;
  const text = String(raw).trim();
  if (!text) return GENERIC;
  for (const entry of FRIENDLY_MESSAGES) {
    if (entry.match.test(text)) {
      return entry.message;
    }
  }
  return text.length > 160 ? GENERIC : text;
}
