import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import * as OTPAuth from "otpauth";
import { Pool } from "../src/server/db/index.js";
import { migrate } from "../src/server/db/migrate.js";
import { readConfig } from "../src/server/config.js";
import { buildApp } from "../src/server/app.js";
import { businessInstant, validatePublish } from "../src/shared/publishing.js";
import { dispatchVariant } from "../src/server/scheduler/dispatch.js";
import { encrypt } from "../src/server/channels/crypto.js";
import { facebookPublisher } from "../src/server/channels/facebook-publisher.js";
const adminUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://helpa:helpa-local-test@127.0.0.1:54329/helpa";
const name = `helpa_frontdesk_${process.pid}_${Date.now()}`;
const url = new URL(adminUrl);
url.pathname = "/" + name;
const c = readConfig({
  DATABASE_URL: url.toString(),
  AUTH_SECRET: "publisher-auth-0123456789-0123456789",
  ENCRYPTION_KEY: "ab".repeat(32),
  BOOTSTRAP_TOKEN: "publisher-bootstrap-0123456789-0123456789",
  NODE_ENV: "test",
  META_APP_SECRET: "fixture-meta-secret",
  META_WEBHOOK_VERIFY_TOKEN: "fixture-verification",
  ANTHROPIC_API_KEY: "fixture-key",
  LOG_LEVEL: "silent",
});
const admin = new Pool({ connectionString: adminUrl });
let b: Awaited<ReturnType<typeof buildApp>>;
let actor: any;
const jar = new Map<string, string>();
let channelId: string;
const assetId = randomUUID();
async function request(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: any,
) {
  const r = await b.app.inject({
    method,
    url: "/api" + path,
    headers: {
      origin: c.PUBLIC_URL,
      cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    ...(body ? { payload: body } : {}),
  });
  for (const v of r.cookies) jar.set(v.name, v.value);
  return r;
}
beforeAll(async () => {
  await admin.query(`CREATE DATABASE "${name}"`);
  const p = new Pool({ connectionString: url.toString() });
  await migrate(p);
  await p.end();
  b = await buildApp(c, { serveWeb: false });
  await b.app.ready();
  const boot = await request("POST", "/bootstrap", {
    token: c.BOOTSTRAP_TOKEN,
    email: "publisher@example.org",
    password: "publisher-password-123!",
    name: "Publisher owner",
    businessName: "Publisher fixture",
  });
  expect(boot.statusCode, boot.body).toBe(200);
  const setup = await request("POST", "/auth/two-factor/enable", {
    password: "publisher-password-123!",
  });
  const totp = OTPAuth.URI.parse(setup.json().totpURI) as OTPAuth.TOTP;
  const verified = await request("POST", "/auth/two-factor/verify-totp", {
    code: totp.generate(),
  });
  expect(verified.statusCode, verified.body).toBe(200);
  actor = (await request("GET", "/session")).json().actor;
  channelId = randomUUID();
  await b.pool.query(
    "INSERT INTO channel(id,business_id,platform,external_id,display_name,mode,status,credentials_encrypted,granted_scopes) VALUES($1,$2,'facebook','123','Fixture Facebook','dry_run','connected',$3,ARRAY['pages_manage_posts','pages_read_engagement'])",
    [
      channelId,
      actor.businessId,
      encrypt(
        { accessToken: "fixture" },
        `${actor.businessId}:channel:${channelId}`,
        c,
      ),
    ],
  );
});
afterAll(async () => {
  if (b) await b.app.close();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
});

import { syncRows, currentKnowledge } from "../src/server/knowledge/service.js";
import { parseUpload, googleCsv } from "../src/server/knowledge/import.js";
import {
  reserveCall,
  structuredCall,
  analysisSchema,
} from "../src/server/llm/gateway.js";
import {
  ingestMessage,
  processInquiry,
  dispatchReply,
} from "../src/server/inbox/service.js";
import { processWebhooks } from "../src/server/inbox/routes.js";
import { deliverEmails } from "../src/server/notifications/service.js";
import ExcelJS from "exceljs";
const product = {
  sku: "T20",
  name_vi: "Tôm sú size 20",
  aliases: ["tôm sú size 20"],
  unit: "kg",
  price: 320000,
  currency: "VND",
  stock_status: "in_stock",
  stock_qty: 8,
  updated_at: new Date().toISOString(),
};
const known = {
  language: "vi" as const,
  intents: ["pricing" as const],
  confidence: 0.99,
  entities: {
    products: ["tôm sú size 20"],
    size: "20",
    quantity: null,
    location: null,
    orderId: null,
    phone: null,
  },
};
let sourceId: string;
it("atomically rejects a malformed import and preserves immutable source timestamps across polling", async () => {
  const s = await request("POST", "/knowledge/sources", {
    name: "Products fixture",
    dataset: "products",
    kind: "builtin",
    maxAgeHours: 24,
  });
  expect(s.statusCode, s.body).toBe(200);
  sourceId = s.json().id;
  expect((await syncRows(b.pool, actor, sourceId, [product])).ok).toBe(true);
  const first = await currentKnowledge(b.pool, actor.businessId);
  expect(await syncRows(b.pool, actor, sourceId, [product])).toMatchObject({
    ok: true,
    changed: 0,
  });
  expect((await currentKnowledge(b.pool, actor.businessId))[0].id).toBe(
    first[0].id,
  );
  expect(
    (
      await syncRows(b.pool, actor, sourceId, [
        { ...product, price: "not a price" },
      ])
    ).ok,
  ).toBe(false);
  expect((await currentKnowledge(b.pool, actor.businessId))[0].data.price).toBe(
    320000,
  );
  await expect(
    b.pool.query("UPDATE knowledge_version SET version=2 WHERE id=$1", [
      first[0].id,
    ]),
  ).rejects.toThrow();
  await syncRows(b.pool, actor, sourceId, []);
  await syncRows(b.pool, actor, sourceId, [product]);
  expect((await currentKnowledge(b.pool, actor.businessId))[0].id).toBe(
    first[0].id,
  );
});
it("maps CSV columns and rejects XLSX formulas while accepting plain workbook cells", async () => {
  const csv = await parseUpload(
    "Code,Name,Price,Stock,Unit,Currency,When\nT20,Tôm sú size 20,320000,in_stock,kg,VND," +
      product.updated_at,
    "csv",
  );
  const result = await syncRows(b.pool, actor, sourceId, csv, {
    sku: "Code",
    name_vi: "Name",
    price: "Price",
    stock_status: "Stock",
    unit: "Unit",
    currency: "Currency",
    updated_at: "When",
  });
  expect(result.ok).toBe(true);
  const w = new ExcelJS.Workbook();
  const sheet = w.addWorksheet("Products");
  sheet.addRow(["sku", "price"]);
  sheet.addRow(["T20", 123]);
  expect(
    await parseUpload(
      Buffer.from(await w.xlsx.writeBuffer()).toString("base64"),
      "xlsx",
    ),
  ).toEqual([{ sku: "T20", price: 123 }]);
  sheet.getCell("B2").value = { formula: "1+1", result: 2 };
  await expect(
    parseUpload(
      Buffer.from(await w.xlsx.writeBuffer()).toString("base64"),
      "xlsx",
    ),
  ).rejects.toThrow("XLSX_FORMULA_OR_RICH_VALUE_REJECTED");
  await syncRows(b.pool, actor, sourceId, [product], {});
});
it("does not follow a Google export redirect to a private or unrelated host", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response("", {
        status: 302,
        headers: { location: "http://127.0.0.1/secrets" },
      }),
  );
  await expect(
    googleCsv(
      "https://docs.google.com/spreadsheets/d/e/fixture/pub?output=csv",
      fetcher as any,
    ),
  ).rejects.toThrow("GOOGLE_CSV_REDIRECT_REJECTED");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("serializes budget reservations, encrypts prompts, and keeps uncertain calls charged against the cap", async () => {
  await b.pool.query(
    "UPDATE business SET llm_provider='anthropic',llm_model='claude-haiku-4-5',llm_monthly_cap_usd=.06 WHERE id=$1",
    [actor.businessId],
  );
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      reserveCall(
        b.pool,
        c,
        actor.businessId,
        channelId,
        "fixture",
        { secret: "private-prompt" },
        50000,
        0,
      ),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const calls = (await b.pool.query("SELECT * FROM llm_call")).rows;
  expect(JSON.stringify(calls)).not.toContain("private-prompt");
  await b.pool.query("UPDATE business SET llm_monthly_cap_usd=2 WHERE id=$1", [
    actor.businessId,
  ]);
  const bad = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [{ type: "text", text: '{"oops":true}' }],
          usage: { input_tokens: 2, output_tokens: 3 },
        }),
      ),
  );
  await expect(
    structuredCall(
      b.pool,
      c,
      actor.businessId,
      channelId,
      "fixture",
      "classify",
      "Hi",
      analysisSchema,
      bad as any,
    ),
  ).rejects.toThrow("LLM_INVALID_OR_UNCERTAIN");
  expect(
    (
      await b.pool.query(
        "SELECT count(*) FROM llm_call WHERE status='uncertain'",
      )
    ).rows[0].count,
  ).toBe("1");
});
it("verifies raw webhook signatures, acknowledges durably, and deduplicates both webhook and message IDs", async () => {
  const payload = {
    object: "page",
    entry: [
      {
        id: "123",
        messaging: [
          {
            sender: { id: "customer1" },
            recipient: { id: "123" },
            timestamp: Date.now(),
            message: { mid: "fixture-meta-mid", text: "Cảm ơn shop" },
          },
        ],
      },
    ],
  };
  const body = JSON.stringify(payload);
  const headers = {
    "content-type": "application/json",
    "x-hub-signature-256":
      "sha256=" +
      createHmac("sha256", c.META_APP_SECRET).update(body).digest("hex"),
  };
  expect(
    (
      await b.app.inject({
        method: "POST",
        url: "/webhooks/meta",
        headers,
        payload: body + " ",
      })
    ).statusCode,
  ).toBe(403);
  for (let i = 0; i < 2; i++)
    expect(
      (
        await b.app.inject({
          method: "POST",
          url: "/webhooks/meta",
          headers,
          payload: body,
        })
      ).statusCode,
    ).toBe(200);
  await processWebhooks(b.pool);
  await processWebhooks(b.pool);
  expect(
    (
      await b.pool.query(
        "SELECT count(*) FROM message WHERE external_id='fixture-meta-mid'",
      )
    ).rows[0].count,
  ).toBe("1");
  expect(
    (await b.pool.query("SELECT count(*) FROM webhook_event")).rows[0].count,
  ).toBe("1");
});
async function inquiry(
  text: string,
  kind = "manual",
  sentAt = new Date().toISOString(),
) {
  const m = await ingestMessage(b.pool, {
    businessId: actor.businessId,
    channelId,
    threadId: randomUUID(),
    customerId: "fixture-customer",
    externalId: randomUUID(),
    kind,
    text,
    sentAt,
  });
  return m;
}
it("auto-reply dry run records exact grounded payload once and never invokes a sender", async () => {
  await b.pool.query(
    "UPDATE business SET auto_replies_paused=false WHERE id=$1",
    [actor.businessId],
  );
  const m = await inquiry("Giá tôm sú size 20?");
  const r = await processInquiry(b.pool, c, m.messageId!, async () => known);
  expect(r?.autonomy).toBe("auto_send");
  const send = vi.fn();
  await dispatchReply(b.pool, c, r!.id, "reply", new Date(), send);
  const rows = (
    await b.pool.query("SELECT * FROM reply_delivery WHERE draft_id=$1", [
      r!.id,
    ])
  ).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe("would_have_sent");
  expect(rows[0].payload.text).toContain("320000 VND/kg");
  expect(rows[0].payload.facts.some((f: any) => f.field === "price")).toBe(
    true,
  );
  expect(send).not.toHaveBeenCalled();
});
it("complaints produce only email notifications and holding text, including in dry-run", async () => {
  const m = await inquiry("Tôm bị hỏng, hoàn tiền giúp tôi");
  const r = await processInquiry(b.pool, c, m.messageId!, async () => ({
    ...known,
    intents: ["complaint"],
  }));
  expect(r?.autonomy).toBe("human_only");
  const ns = (
    await b.pool.query(
      "SELECT * FROM notification WHERE kind='complaint' AND dedup_key=$1",
      ["draft:" + r!.id],
    )
  ).rows;
  expect(ns.map((n: any) => n.transport)).toEqual(["email"]);
  await expect(
    b.pool.query("UPDATE notification SET transport='sms' WHERE id=$1", [
      ns[0].id,
    ]),
  ).rejects.toThrow();
  const mail = vi.fn();
  await deliverEmails(b.pool, c, mail);
  expect(mail).not.toHaveBeenCalled();
  expect(
    (
      await b.pool.query("SELECT status FROM notification WHERE id=$1", [
        ns[0].id,
      ])
    ).rows[0].status,
  ).toBe("would_have_sent");
});
it("blocks stale source versions and expired Messenger windows at dispatch", async () => {
  await b.pool.query(
    "UPDATE business SET auto_replies_paused=true WHERE id=$1",
    [actor.businessId],
  );
  const m = await inquiry("Giá tôm sú size 20?");
  const r = await processInquiry(b.pool, c, m.messageId!, async () => known);
  await syncRows(b.pool, actor, sourceId, [{ ...product, price: 330000 }], {});
  await b.pool.query(
    "UPDATE business SET auto_replies_paused=false WHERE id=$1",
    [actor.businessId],
  );
  await dispatchReply(b.pool, c, r!.id, "reply");
  expect(
    (await b.pool.query("SELECT checks FROM reply_draft WHERE id=$1", [r!.id]))
      .rows[0].checks.reasons,
  ).toContain("KNOWLEDGE_CHANGED_REVIEW_REQUIRED");
  const old = await inquiry(
    "Cảm ơn",
    "messenger",
    new Date(Date.now() - 25 * 3600000).toISOString(),
  );
  const closed = await processInquiry(b.pool, c, old.messageId!, async () => ({
    ...known,
    intents: ["compliment"],
  }));
  expect(
    (
      await b.pool.query("SELECT checks FROM reply_draft WHERE id=$1", [
        closed!.id,
      ])
    ).rows[0].checks.reasons,
  ).toContain("MESSENGER_WINDOW_CLOSED");
});
it("captures a human edit and manual approval without claiming an external delivery", async () => {
  const m = await inquiry("Tư vấn giúp mình");
  const r = await processInquiry(b.pool, c, m.messageId!, async () => ({
    ...known,
    intents: ["other"],
  }));
  const approved = await request("POST", `/replies/${r!.id}/approve`, {
    revision: 1,
    text: "Nhân viên đã nhận câu hỏi của anh/chị.",
  });
  expect(approved.statusCode, approved.body).toBe(200);
  await dispatchReply(b.pool, c, r!.id, "reply");
  expect(
    (
      await b.pool.query("SELECT count(*) FROM reply_edit WHERE draft_id=$1", [
        r!.id,
      ])
    ).rows[0].count,
  ).toBe("1");
  expect(
    (
      await b.pool.query(
        "SELECT payload FROM reply_delivery WHERE draft_id=$1 AND kind='reply'",
        [r!.id],
      )
    ).rows[0].payload,
  ).toMatchObject({ humanReviewed: true, facts: [] });
});
