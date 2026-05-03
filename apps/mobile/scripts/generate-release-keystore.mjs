#!/usr/bin/env node
/**
 * 一键生成 Android Release 自签名密钥（仅用于开发自测 / 内测分发）。
 *
 * 产物：.tools/keystores/<name>.p12
 * 别名：acp-selftest
 * 口令：通过 ACP_KEYSTORE_PASSWORD 环境变量覆盖；未设置时使用本地自测默认值。
 *
 * 与 apps/mobile/scripts/run-gradle.mjs 中的默认探测路径完全对齐——
 * 生成完成后无需配置任何环境变量，直接 `npm run build:mobile:android` 即可。
 *
 * 正式发布到应用市场必须使用企业签名密钥，详见 BUILD-APK.md §3.2。
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, "..");
const repoRoot = resolve(mobileRoot, "../..");

const keystoreDir = resolve(repoRoot, ".tools/keystores");
const keystorePath = resolve(keystoreDir, "mobile-selftest-release.p12");

const password = process.env.ACP_KEYSTORE_PASSWORD || "changeit";
const alias = process.env.ACP_KEY_ALIAS || "acp-selftest";
const dname =
  process.env.ACP_KEYSTORE_DNAME ||
  "CN=ACP Mobile Self-Test, OU=Engineering, O=Agent Control Plane, L=Beijing, ST=Beijing, C=CN";

function findKeytool() {
  // 1) JAVA_HOME
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const candidate = resolve(javaHome, "bin", process.platform === "win32" ? "keytool.exe" : "keytool");
    if (existsSync(candidate)) return candidate;
  }
  // 2) .tools/jdk17/<release>/bin/keytool
  const localJdkRoot = resolve(repoRoot, ".tools/jdk17");
  if (existsSync(localJdkRoot)) {
    try {
      const releases = readdirSync(localJdkRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
      for (const r of releases) {
        const candidate = resolve(
          localJdkRoot,
          r.name,
          "bin",
          process.platform === "win32" ? "keytool.exe" : "keytool",
        );
        if (existsSync(candidate)) return candidate;
      }
    } catch {
      /* ignore */
    }
  }
  // 3) PATH
  return "keytool";
}

function main() {
  if (existsSync(keystorePath)) {
    const stat = statSync(keystorePath);
    console.log(
      `✔ 已存在自签名密钥：${keystorePath} (${(stat.size / 1024).toFixed(1)} KB, mtime ${stat.mtime.toISOString()})`,
    );
    console.log("  如需重新生成，请先手动删除该文件后重跑此脚本。");
    process.exit(0);
  }

  if (!existsSync(keystoreDir)) {
    mkdirSync(keystoreDir, { recursive: true });
  }

  const keytool = findKeytool();
  const args = [
    "-genkeypair",
    "-v",
    "-keystore",
    keystorePath,
    "-storetype",
    "PKCS12",
    "-storepass",
    password,
    "-keypass",
    password,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    String(365 * 25),
    "-dname",
    dname,
  ];

  console.log(`▶ 调用 ${keytool} 生成 ${keystorePath} …`);
  const result = spawnSync(keytool, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("✘ 生成失败。请确认 JDK 17 已安装（JAVA_HOME 或 .tools/jdk17/）。");
    process.exit(result.status ?? 1);
  }

  console.log("");
  console.log("✔ 自签名密钥已生成");
  console.log(`  路径   : ${keystorePath}`);
  console.log(`  别名   : ${alias}`);
  console.log("  口令   : 已从环境变量或本地自测默认值读取（不会打印明文）");
  console.log(`  DN     : ${dname}`);
  console.log("");
  console.log("apps/mobile/scripts/run-gradle.mjs 会自动探测该路径，无需配置环境变量。");
  console.log("现在可以运行：npm run build:mobile:android");
}

main();
