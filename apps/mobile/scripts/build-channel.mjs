#!/usr/bin/env node
// 多渠道打包入口：根据 --channel 设置 EXPO_PUBLIC_CHANNEL 环境变量后执行 expo prebuild / expo export。
//
// 使用方式：
//   node apps/mobile/scripts/build-channel.mjs --channel=yingyongbao [--dry]
//   node apps/mobile/scripts/build-channel.mjs --channel=huawei
//
// 渠道与隐私文案、SDK 集成、加固包、备案号绑定，详见
// docs/delivery/mobile-channel-differences-matrix.md。
//
// 注意：本脚本不会改变权限白/黑名单或个人信息处理逻辑，仅注入渠道标识。

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ALLOWED_CHANNELS = new Set([
  "yingyongbao",
  "huawei",
  "xiaomi",
  "oppo",
  "vivo",
  "internal",
]);

function parseArgs(argv) {
  const out = { channel: null, dry: false, command: "export" };
  for (const a of argv) {
    if (a.startsWith("--channel=")) out.channel = a.slice("--channel=".length);
    else if (a === "--dry") out.dry = true;
    else if (a.startsWith("--command=")) out.command = a.slice("--command=".length);
  }
  return out;
}

function fail(msg) {
  console.error(`✘ ${msg}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.channel) fail("缺少 --channel 参数（可选：yingyongbao/huawei/xiaomi/oppo/vivo/internal）");
if (!ALLOWED_CHANNELS.has(args.channel)) fail(`未知渠道：${args.channel}`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, "..");

console.log(`✔ 渠道：${args.channel}`);
console.log(`✔ 工作目录：${cwd}`);
console.log(`✔ 注入环境：EXPO_PUBLIC_CHANNEL=${args.channel}`);

if (args.dry) {
  console.log("⚠ dry 模式：仅校验参数，未执行打包命令。");
  process.exit(0);
}

const env = {
  ...process.env,
  EXPO_PUBLIC_CHANNEL: args.channel,
};

const cmd = args.command === "prebuild" ? ["expo", "prebuild", "--non-interactive"] : ["expo", "export"];
console.log(`▶ 执行：npx ${cmd.join(" ")}`);

const child = spawn("npx", cmd, { cwd, env, stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 1));
