// 冷启动计时锚点：模块在 App 入口被首次 import 时立刻拍下时间戳，
// 等到首屏 (HomeScreen) 第一次完成首帧渲染时再上报 app_first_screen.durationMs。
//
// 注意：模块级单例。HomeScreen 多次进入只上报第一次，避免污染冷启动 P95。

const startedAt = Date.now();
let firstScreenReported = false;

export function getColdStartMark(): number {
  return startedAt;
}

export function consumeFirstScreenMark(): number | null {
  if (firstScreenReported) return null;
  firstScreenReported = true;
  return Date.now() - startedAt;
}
