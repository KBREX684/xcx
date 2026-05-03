#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, "..");
const repoRoot = path.resolve(mobileRoot, "../..");
const androidRoot = path.resolve(here, "..", "android");
const task = process.argv.slice(2);

if (task.length === 0) {
  console.error("Missing Gradle task, for example: assembleRelease");
  process.exit(1);
}

function firstDirectory(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))[0] ?? null;
}

const localJdk = firstDirectory(path.join(repoRoot, ".tools", "jdk17"));
const localAndroidSdk = path.join(repoRoot, ".tools", "android-sdk");
const env = { ...process.env };

if (!env.JAVA_HOME && localJdk) {
  env.JAVA_HOME = localJdk;
}
if (!env.ANDROID_HOME && fs.existsSync(localAndroidSdk)) {
  env.ANDROID_HOME = localAndroidSdk;
}
if (!env.ANDROID_SDK_ROOT && env.ANDROID_HOME) {
  env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
}
const localSelfTestKeystore = path.join(repoRoot, ".tools", "keystores", "mobile-selftest-release.p12");
const signingKeys = [
  "ACP_ANDROID_KEYSTORE_FILE",
  "ACP_ANDROID_KEYSTORE_PASSWORD",
  "ACP_ANDROID_KEY_ALIAS",
  "ACP_ANDROID_KEY_PASSWORD",
];
const providedSigningKeys = signingKeys.filter((key) => Boolean(env[key]));
const isReleaseTask = task.some((arg) => /assembleRelease|bundleRelease/i.test(arg));
const allowSelfTestSigning = env.ACP_ALLOW_SELFTEST_SIGNING === "1";

if (!env.NODE_ENV) {
  env.NODE_ENV = isReleaseTask ? "production" : "development";
}

if (providedSigningKeys.length > 0 && providedSigningKeys.length < signingKeys.length) {
  const missing = signingKeys.filter((key) => !env[key]).join(", ");
  console.error(`Incomplete Android release signing environment. Missing: ${missing}`);
  process.exit(1);
}

if (isReleaseTask && providedSigningKeys.length === 0 && !allowSelfTestSigning) {
  console.error(
    "Release signing keystore is missing. Provide all ACP_ANDROID_* secrets for a store build, or set ACP_ALLOW_SELFTEST_SIGNING=1 to produce a non-store candidate APK.",
  );
  process.exit(1);
}

if (isReleaseTask && providedSigningKeys.length === 0 && allowSelfTestSigning && !fs.existsSync(localSelfTestKeystore)) {
  const generated = spawnSync(process.execPath, [path.join(here, "generate-release-keystore.mjs")], {
    cwd: mobileRoot,
    env,
    stdio: "inherit",
  });
  if (generated.status !== 0) {
    process.exit(generated.status ?? 1);
  }
}

if (!env.ACP_ANDROID_KEYSTORE_FILE && allowSelfTestSigning && fs.existsSync(localSelfTestKeystore)) {
  env.ACP_ANDROID_KEYSTORE_FILE = localSelfTestKeystore;
  env.ACP_ANDROID_KEYSTORE_PASSWORD = "changeit";
  env.ACP_ANDROID_KEY_ALIAS = "acp-selftest";
  env.ACP_ANDROID_KEY_PASSWORD = "changeit";
}

const pathEntries = [];
if (env.JAVA_HOME) pathEntries.push(path.join(env.JAVA_HOME, "bin"));
if (env.ANDROID_HOME) {
  pathEntries.push(
    path.join(env.ANDROID_HOME, "cmdline-tools", "latest", "bin"),
    path.join(env.ANDROID_HOME, "platform-tools"),
  );
}
const existingPath = env.Path ?? env.PATH ?? "";
env.Path = [...pathEntries, existingPath].filter(Boolean).join(path.delimiter);
env.PATH = env.Path;

const command = process.platform === "win32" ? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe") : "./gradlew";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "gradlew.bat", ...task] : task;
const child = spawn(command, args, {
  cwd: androidRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
