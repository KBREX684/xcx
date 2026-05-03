#!/usr/bin/env node
// 包体分析：扫描 apps/mobile 依赖树，输出 top-N 大包 + 资源体积报告。
// 不调用真实的 metro/expo bundle，因为打包阶段才能产出 bundle.js。
// 这里只读 package.json 与 node_modules（如存在）做静态评估，提示开发者哪些依赖需要 keep-rules。
//
// 使用方式：
//   node apps/mobile/scripts/analyze-bundle.mjs
//
// 输出：
//   - 安装大小 top 20 的依赖
//   - 标记需要 R8 keep-rules 的原生模块（react-native-*, expo-*, @react-native-*）

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(mobileRoot, "..", "..");

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const pkg = readJson(path.join(mobileRoot, "package.json"));
if (!pkg) {
  console.error("✘ apps/mobile/package.json 不存在");
  process.exit(1);
}

const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
console.log(`apps/mobile 直接依赖：${deps.length}`);

function dirSizeBytes(dir) {
  let total = 0;
  let stack = [dir];
  while (stack.length) {
    const p = stack.pop();
    let stat;
    try {
      stat = fs.lstatSync(p);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      let entries;
      try {
        entries = fs.readdirSync(p);
      } catch {
        continue;
      }
      for (const e of entries) stack.push(path.join(p, e));
    } else {
      total += stat.size;
    }
  }
  return total;
}

function findInstalled(name) {
  const candidates = [
    path.join(mobileRoot, "node_modules", name),
    path.join(monorepoRoot, "node_modules", name),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const NATIVE_PREFIXES = ["react-native", "expo-", "expo", "@react-native", "@expo", "react-native-"];
function isNativeMod(name) {
  return NATIVE_PREFIXES.some((p) => name === p.replace(/-$/, "") || name.startsWith(p));
}

const rows = [];
for (const dep of deps) {
  const installed = findInstalled(dep);
  if (!installed) {
    rows.push({ name: dep, size: 0, native: isNativeMod(dep), missing: true });
    continue;
  }
  rows.push({ name: dep, size: dirSizeBytes(installed), native: isNativeMod(dep), missing: false });
}

rows.sort((a, b) => b.size - a.size);

console.log("");
console.log("依赖体积 top 20（安装大小）：");
console.log("─".repeat(80));
for (const r of rows.slice(0, 20)) {
  const sizeMb = r.missing ? "未安装" : `${(r.size / 1024 / 1024).toFixed(2)} MB`;
  const tag = r.native ? "[native]" : "        ";
  console.log(`  ${tag} ${r.name.padEnd(40)} ${sizeMb}`);
}

console.log("");
console.log("需在 R8/Proguard 写 keep-rules 的原生模块：");
for (const r of rows.filter((x) => x.native)) {
  console.log(`  - ${r.name}`);
}

// L-CODE-13：如果传入 --bundle=<path>，读取真实 metro bundle 输出做尺寸估算。
//   生成命令（release 阶段执行）：
//     npx react-native bundle \
//       --platform android \
//       --dev false \
//       --entry-file index.js \
//       --bundle-output dist/index.android.bundle \
//       --sourcemap-output dist/index.android.bundle.map
//   然后：
//     node apps/mobile/scripts/analyze-bundle.mjs --bundle=dist/index.android.bundle
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
if (args.bundle) {
  const bundlePath = path.resolve(process.cwd(), args.bundle);
  if (!fs.existsSync(bundlePath)) {
    console.error(`\n✘ 指定的 bundle 文件不存在：${bundlePath}`);
    process.exit(1);
  }
  const stat = fs.statSync(bundlePath);
  const mapPath = `${bundlePath}.map`;
  console.log("");
  console.log("metro bundle 实测：");
  console.log(`  • bundle 路径    : ${path.relative(mobileRoot, bundlePath)}`);
  console.log(`  • bundle 大小    : ${(stat.size / 1024).toFixed(1)} KB`);
  if (fs.existsSync(mapPath)) {
    const mapStat = fs.statSync(mapPath);
    console.log(`  • source map     : ${(mapStat.size / 1024).toFixed(1)} KB`);
    // 简版"按文件来源聚合"估算（不解析 mappings；仅按 sources 数量提示）
    try {
      const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
      const sources = Array.isArray(map.sources) ? map.sources : [];
      const groups = new Map();
      for (const s of sources) {
        const key = (s.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/) ?? [])[1] ?? "<app>";
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }
      const top = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
      console.log(`  • 来源条目 top 15（按 sources 计数，仅供参考）：`);
      for (const [name, count] of top) {
        console.log(`      ${String(count).padStart(5)}  ${name}`);
      }
    } catch {
      console.log("  • source map 解析失败（非致命）");
    }
  } else {
    console.log(`  • source map     : 未找到（建议同时输出 .map 以便符号化）`);
  }
}

console.log("");
console.log("✔ 完成。详细 keep rules 模板见 docs/operations/mobile-bundle-and-r8.md。");
