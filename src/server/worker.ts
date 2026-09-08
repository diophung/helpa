import { readConfig } from "./config.js";
import { Pool } from "./db/index.js";
import { startQueue, probeQueue } from "./queue.js";
import { recordDryRun } from "./channels/dispatch.js";

const c = readConfig();
const pool = new Pool({ connectionString: c.DATABASE_URL, max: 3 });
const boss = await startQueue(c);
type Probe = {
  businessId: string;
  actorId: string;
  operationKey: string;
  payload: unknown;
};
await boss.work<Probe>(probeQueue, { localConcurrency: 1 }, async (jobs) => {
  for (const job of jobs) await recordDryRun(pool, c, job.data);
});
async function heartbeat() {
  await pool.query(
    "INSERT INTO system_heartbeat(name,last_seen_at,details) VALUES('worker',now(),$1) ON CONFLICT(name) DO UPDATE SET last_seen_at=excluded.last_seen_at,details=excluded.details",
    [JSON.stringify({ mode: c.HELPA_MODE })],
  );
  await pool.query("DELETE FROM oauth_state WHERE expires_at<now()");
  await pool.query("DELETE FROM oauth_selection WHERE expires_at<now()");
  await pool.query("DELETE FROM login_limit WHERE resets_at<now()");
}
await heartbeat();
const timer = setInterval(
  () =>
    void heartbeat().catch(() => console.error('{"event":"heartbeat_failed"}')),
  15000,
);
console.log(JSON.stringify({ event: "worker_started", mode: c.HELPA_MODE }));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await boss.stop();
  await pool.end();
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
