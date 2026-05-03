/**
 * 移动端设计令牌（80% Claude DNA / 20% Linear DNA）。
 * 所有颜色 / 间距 / 字号 / 阴影都来自这里——业务页面禁止写裸 hex 与裸 px。
 *
 * 与 Web tokens.css 一一对齐，跨端唯一真源：
 *   - 主画布 #faf6ee：奶油米
 *   - 主表面 #fffdf8：暖白
 *   - 次级 #f1ebe0：淡陶土
 *   - 强调 #8a6a4f：深胡桃（CTA / 选中态）
 *   - 暖陶 #b08968：品牌点缀（蜂聚合 logo / 高亮装饰）
 *   - 文本 #2a2520 深石墨棕，避免纯黑硬感
 *   - 圆角 6 / 10 / 14：Linear 风格精准；阴影单层羽化、温度向暖
 */

export const palette = {
  bgPrimary: "#f7f3eb",
  bgSurface: "#fffefa",
  bgElevated: "#fffefa",
  bgSubtle: "#eee7da",
  bgSunken: "#e7dece",
  border: "rgba(45,38,30,0.1)",
  borderStrong: "rgba(45,38,30,0.18)",
  textPrimary: "#211d18",
  textSecondary: "#51483d",
  textMuted: "#81776a",
  textInverse: "#fffefa",
  accent: "#7b5f45",
  accentStrong: "#614a36",
  accentSoft: "rgba(123,95,69,0.13)",
  brandWarm: "#b28a56",
  success: "#527165",
  warning: "#b37a1d",
  danger: "#ad4f3f",
  info: "#5862a8",
  overlay: "rgba(23,20,16,0.48)",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  body: 14,
  bodyLg: 16,
  title: 18,
  titleLg: 22,
  display: 28,
} as const;

export const lineHeight = {
  caption: 16,
  body: 20,
  bodyLg: 24,
  title: 26,
  titleLg: 30,
  display: 36,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const shadow = {
  /** 卡片：极薄单层羽化（Linear DNA），不破坏整页静谧。 */
  card: {
    shadowColor: "#211d18",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 1,
  },
  /** 强调：详情页关键卡 / 模态。 */
  raised: {
    shadowColor: "#211d18",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 4,
  },
} as const;

export const motion = {
  durationFast: 120,
  durationBase: 200,
  durationSlow: 320,
  /** Linear 标志性 ease-out cubic-bezier，用于 LayoutAnimation / Animated.timing。 */
  easeOut: { x1: 0.22, y1: 1, x2: 0.36, y2: 1 } as const,
} as const;

export type Palette = typeof palette;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
