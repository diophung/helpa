import { readConfig } from "./config.js";
import { Pool } from "./db/index.js";
import { startQueue, probeQueue } from "./queue.js";
import { recordDryRun } from "./channels/dispatch.js";

import { dispatchVariant } from "./scheduler/dispatch.js";
import { inspectMedia, makeReel } from "./media/service.js";
import { can } from "../shared/permissions.js";
const c = readConfig();
const pool = new Pool({ connectionString: c.DATABASE_URL, max: 6 });
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
await boss.work<any>(
  "helpa-media-rendition",
  { localConcurrency: 1 },
  async (jobs) => {
    for (const job of jobs) {
      const a = (
        await pool.query(
          "SELECT * FROM membership WHERE business_id=$1 AND user_id=$2 AND revoked_at IS NULL",
          [job.data.businessId, job.data.actorId],
        )
      ).rows[0];
      const m = (
        await pool.query(
          "SELECT * FROM media_asset WHERE business_id=$1 AND id=$2",
          [job.data.businessId, job.data.assetId],
        )
      ).rows[0];
      if (
        !a ||
        !m ||
        m.scope.some(
          (p: string) => !can(a.role, a.channel_scope, "posts.write", p),
        )
      )
        continue;
      await makeReel(pool, c, m, {
        businessId: a.business_id,
        userId: a.user_id,
      } as any);
    }
  },
);
let ticking = false;
async function workPending() {
  if (ticking) return;
  ticking = true;
  try {
    const pending = await pool.query(
      "SELECT id FROM post_variant WHERE status IN ('scheduled','publishing') AND scheduled_at<=now() ORDER BY scheduled_at LIMIT 20",
    );
    for (const v of pending.rows) await dispatchVariant(pool, c, v.id);
    const media = await pool.query(
      "SELECT id FROM media_asset WHERE status='processing' ORDER BY created_at LIMIT 5",
    );
    for (const m of media.rows) await inspectMedia(pool, c, m.id);
  } finally {
    ticking = false;
  }
}
const workTimer = setInterval(
  () =>
    void workPending().catch(() =>
      console.error('{"event":"worker_tick_failed"}'),
    ),
  5000,
);
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
  clearInterval(workTimer);
  await boss.stop();
  await pool.end();
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
