import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.startsWith("file:")) {
  throw new Error("DATABASE_URL must use the file: protocol for local SQLite bootstrap.");
}

const relativePath = databaseUrl.slice("file:".length);
const databasePath = path.isAbsolute(relativePath)
  ? relativePath
  : path.resolve(process.cwd(), "prisma", relativePath.replace(/^\.\//, ""));
const migrationPath = path.resolve(process.cwd(), "prisma/migrations/0001_init/migration.sql");
const forceReset = process.env.FORCE_RESET === "1";

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

if (forceReset) {
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-journal`, { force: true });
}

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");

function hasTable(name) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
}

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  return columns.some((column) => column.name === columnName);
}

const hasWorkspaceTable = hasTable("Workspace");

if (!hasWorkspaceTable) {
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  db.exec(migrationSql);
  console.log(`[db] applied initial migration to ${databasePath}`);
} else {
  const upgradeStatements = [];

  if (!hasColumn("Project", "currentCertificateId")) {
    upgradeStatements.push(`ALTER TABLE "Project" ADD COLUMN "currentCertificateId" TEXT;`);
  }

  upgradeStatements.push(
    `CREATE TABLE IF NOT EXISTS "Certificate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ready',
      "verificationCode" TEXT NOT NULL,
      "summaryJson" TEXT,
      "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Certificate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_verificationCode_key" ON "Certificate"("verificationCode");`,
    `CREATE INDEX IF NOT EXISTS "Certificate_projectId_generatedAt_idx" ON "Certificate"("projectId", "generatedAt" DESC);`,
    `CREATE TABLE IF NOT EXISTS "WorkspaceIntegrationConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "defaultExecutorType" TEXT NOT NULL DEFAULT 'mock',
      "objectStorageProvider" TEXT NOT NULL DEFAULT 'local-file',
      "notificationChannel" TEXT NOT NULL DEFAULT 'none',
      "callbackBaseUrl" TEXT,
      "agentEndpoint" TEXT,
      "approvalMode" TEXT NOT NULL DEFAULT 'manual',
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "WorkspaceIntegrationConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceIntegrationConfig_workspaceId_key" ON "WorkspaceIntegrationConfig"("workspaceId");`
  );

  db.exec(upgradeStatements.join("\n"));
  console.log(`[db] schema already present at ${databasePath}, ensured P2 extensions`);
}

db.close();
