# Helpa

A self-hosted back office for a Vietnamese seafood business: connect social accounts, schedule content, answer customers from approved facts, and delegate work without sharing platform passwords.

**Foundation and the first Publisher slice are implemented.** Secure owner setup/MFA, Facebook/TikTok OAuth, encrypted tokens, scoped access, private media/ffmpeg renditions, calendar variants/approvals and a durable dry-run publishing worker are runnable. See [Publisher evidence and limitations](docs/PHASE_1.md). Real-account publication still needs credentials and live acceptance. Inbox, delegation and analytics are the next slices.

## Run locally with Docker

Requires Docker Engine/Desktop with Compose. Node is optional on the host.

1. Generate `.env` with `docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:22.22.0-bookworm-slim node scripts/setup-env.mjs` (or `npm run setup:env` with Node 22).
2. Review [.env.example](.env.example). Keep `HELPA_MODE=dry_run`; configure Meta app credentials when ready. Defaults use local HTTPS on port 8443.
3. Run `docker compose up -d --build`.
4. For local certificate verification: `mkdir -p .local && docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt .local/caddy-root.crt`. Trust this development CA in your browser/OS only if you want to use the local HTTPS UI. The [setup guide](docs/SETUP.md) explains local trust and production certificates.
5. Open [Helpa locally](https://localhost:8443). Create the owner using `BOOTSTRAP_TOKEN` from your private `.env`; enroll TOTP and privately save the recovery codes.
6. Open System → Verify dry-run. The separate worker records the exact diagnostic payload as “would have sent”; it makes no platform call.
7. Add `PUBLIC_URL/api/channels/facebook/callback` as the exact Meta OAuth redirect, configure `META_APP_ID`/`META_APP_SECRET`, recreate app/worker, then connect and select your Page. Localhost needs Meta to accept your configured development redirect; a public hostname is the dependable account/webhook setup.

For your existing VPS/domain, follow [SETUP.md](docs/SETUP.md): real hostname, HTTPS origin, ports 80/443 and an ACME email. No hosting vendor is assumed. First image build needs internet access for dependency/image downloads; the installed app has no requirement for a free hosting tier.

## Develop and test

Use Node 22.22+ and a dedicated local Postgres 17. `npm ci --legacy-peer-deps`, then `npm run setup:env -- --local`. Set `DATABASE_URL` to your database and `NODE_ENV=development`, `PUBLIC_URL=http://localhost:3000`. Run `npm run migrate`, `npm run build`, then `npm run dev` and `npm run worker` in separate terminals. Browse localhost:3000. For Vite hot reload, use PUBLIC_URL=http://localhost:5173 and `npm run dev:web` alongside the API.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

`TEST_DATABASE_URL` defaults to `postgresql://helpa:helpa-local-test@127.0.0.1:54329/helpa`; point it at a **dedicated test Postgres** whose user can create/drop databases. Tests create uniquely named databases, then remove only those databases. Start the local default with:

```sh
docker run -d --name helpa-dev-postgres \
  -e POSTGRES_USER=helpa -e POSTGRES_PASSWORD=helpa-local-test -e POSTGRES_DB=helpa \
  -p 127.0.0.1:54329:5432 postgres:17-alpine
```

Tests use local Postgres and synthetic API fixtures; no platform or LLM credentials are needed and no external API is called. Dependency/browser installation is a separate online setup step. The end-to-end test covers signup, TOTP, settings, a real worker diagnostic, audit visibility, mobile layout and re-login. It also uploads synthetic media, creates/approves a Reel and observes the real worker dry-run payload. Install ffmpeg/ffprobe for host testing (the Docker image includes them).

## Decisions and documentation

- OpenAI or Anthropic via API keys; selectable provider/model and monthly USD cap. **Cap 0 disables paid calls.** Phase 0 stores configuration only; the enforced execution gateway arrives in Phase 2.
- Twilio chosen for Phase 3 OTP; 24/7/365 coverage; complaints notify by email only.
- Data/voice examples will arrive as Markdown; [input instructions](docs/inputs/README.md).
- [Plan](docs/PLAN.md) · [Architecture](docs/ARCHITECTURE.md) · [ADRs](docs/adr/README.md) · [API evidence](docs/API_NOTES.md) · [Runbook](docs/RUNBOOK.md) · [Delivery status](docs/PHASE_0.md).

Front Desk: [knowledge, inbox, rules, providers and validation](docs/PHASE_2.md).
