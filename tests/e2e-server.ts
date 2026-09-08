import { spawn } from "node:child_process";
import { Pool } from "../src/server/db/index.js";
import { migrate } from "../src/server/db/migrate.js";
import { readConfig } from "../src/server/config.js";
import { buildApp } from "../src/server/app.js";
const adminUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://helpa:helpa-local-test@127.0.0.1:54329/helpa";
const admin = new Pool({ connectionString: adminUrl });
const dbName = `helpa_e2e_${process.pid}_${Date.now()}`;
const url = new URL(adminUrl);
url.pathname = `/${dbName}`;
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  PUBLIC_URL: "http://localhost:3101",
  PORT: "3101",
  NODE_ENV: "test",
  AUTH_SECRET: "e2e-fixture-auth-secret-0123456789-0123456789",
  ENCRYPTION_KEY: "cd".repeat(32),
  BOOTSTRAP_TOKEN: "e2e-fixture-bootstrap-0123456789-0123456789",
  META_APP_ID: "",
  META_APP_SECRET: "",
  OPENAI_API_KEY: "",
  ANTHROPIC_API_KEY: "",
  HELPA_MODE: "dry_run",
  LLM_MONTHLY_CAP_USD: "0",
  LOG_LEVEL: "silent",
};
await admin.query(`CREATE DATABASE "${dbName}"`);
const pool = new Pool({ connectionString: url.toString() });
await migrate(pool);
await pool.end();
const { app } = await buildApp(readConfig(env));
await app.listen({ host: "127.0.0.1", port: 3101 });
const worker = spawn(
  process.execPath,
  ["--import", "tsx", "src/server/worker.ts"],
  { env, stdio: "inherit" },
);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  worker.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    if (worker.exitCode !== null) resolve();
    else worker.once("exit", () => resolve());
  });
  await app.close();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.end();
  process.exit(0);
}
process.on("SIGTERM", () => void close());
process.on("SIGINT", () => void close());
