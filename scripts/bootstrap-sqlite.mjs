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

const hasWorkspaceTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Workspace'")
  .get();

if (!hasWorkspaceTable) {
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  db.exec(migrationSql);
  console.log(`[db] applied initial migration to ${databasePath}`);
} else {
  console.log(`[db] schema already present at ${databasePath}`);
}

db.close();
