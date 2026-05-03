#!/usr/bin/env node
// Source map / mapping 上传脚手架（L-CODE-11）
//
// 当前实现：
// - 校验 release 产物目录是否存在 JS source map 与 Android R8 mapping.txt；
// - 计算每个文件的 sha256；
// - 写出清单 dist/source-map-manifest.json，供后续接入崩溃后台时使用；
// - 不调用任何外部上传服务，避免在未选定崩溃 SDK 前形成泄漏面。
//
// 后续接入步骤（选定崩溃后台时再补，参考 docs/operations/mobile-crash-symbolication.md）：
// - 选 Bugly / Sentry / 自研后端时，本脚本扩展上传 endpoint + token 注入。
// - token 必须从环境变量读取，禁止入库。
//
// 用法：
//   node apps/mobile/scripts/upload-source-map.mjs --version=0.1.0 --commit=$(git rev-parse HEAD) [--dry]
//
// 退出码：
//   0  manifest 生成或 dry run 成功
//   1  缺产物 / 参数错误

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

if (!args.version) {
  console.error("✘ --version=X.Y.Z 必填");
  process.exit(1);
}
if (!args.commit) {
  console.error("✘ --commit=<sha> 必填（git rev-parse HEAD）");
  process.exit(1);
}
const dry = args.dry === "true";

function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(next);
      else if (entry.isFile() && predicate(next)) out.push(next);
    }
  }
  return out;
}

const expoExportMaps = listFiles(path.join(mobileRoot, "dist-expo"), (file) => file.endsWith(".hbc.map")).map((file) => ({
  kind: "js-bundle-map",
  file,
}));

// 候选 source map / mapping 路径（按优先级）
const candidates = [
  { kind: "js-bundle-map", file: path.join(mobileRoot, "android/app/build/generated/sourcemaps/react/release/index.android.bundle.map") },
  { kind: "android-r8-mapping", file: path.join(mobileRoot, "android/app/build/outputs/mapping/release/mapping.txt") },
  ...expoExportMaps,
];

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const manifest = {
  appVersion: args.version,
  commit: args.commit,
  generatedAt: new Date().toISOString(),
  artifacts: [],
  missing: [],
};

for (const c of candidates) {
  if (fs.existsSync(c.file)) {
    const stat = fs.statSync(c.file);
    manifest.artifacts.push({
      kind: c.kind,
      path: path.relative(mobileRoot, c.file),
      sizeBytes: stat.size,
      sha256: sha256(c.file),
    });
  } else {
    manifest.missing.push({ kind: c.kind, path: path.relative(mobileRoot, c.file) });
  }
}

if (manifest.artifacts.length === 0) {
  console.error("✘ 未找到任何 source map / mapping 产物。请先执行 release 构建后再上传。");
  if (!dry) process.exit(1);
}

const outDir = path.join(mobileRoot, "dist");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "source-map-manifest.json");

if (dry) {
  console.log("DRY RUN — 将写入 manifest：");
  console.log(JSON.stringify(manifest, null, 2));
} else {
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`✔ manifest 已写入 ${path.relative(process.cwd(), outFile)}`);
  for (const a of manifest.artifacts) console.log(`  • ${a.kind}: ${a.path} (sha256=${a.sha256.slice(0, 12)}…)`);
  for (const m of manifest.missing) console.log(`  ⚠ 缺失 ${m.kind}: ${m.path}`);
}

console.log("\n下一步（待选定崩溃后台后接入）：");
console.log("  1. 在 CI Secret 中配置上传 token");
console.log("  2. 扩展本脚本 POST manifest + 二进制到崩溃后台");
console.log("  3. 在 release-checklist 中加入 'manifest 生成成功' 作为门禁");
