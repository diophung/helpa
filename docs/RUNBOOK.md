# Helpa runbook — planning outline

Status: documentation scaffold, 2026-09-08. No operational commands below are implied to exist. Phase 0 will replace this outline with tested commands and host-specific values, with later sections completed in their owning phase.

## Deployment and recovery prerequisites

Record Dio's B3 answer, paid VPS sizing/OS/region, controlled DNS name, public HTTPS callback URL, SSH/operator access, and off-host encrypted backup destination. Production exposes Caddy only. Local development uses local CA trust; local HTTPS alone cannot receive platform webhooks.

Phase 0 README must provide a tested ≤15-step fresh-host procedure: configure DNS, install Docker/Compose, obtain the release, populate documented environment secrets, start Compose/migrations, bootstrap owner/TOTP, verify health, connect Page, validate dry-run and configure backups. Do not publish a pretend `docker compose up` quickstart before those files exist.

The environment reference will document every introduced variable, including mode, database URL, public origin/domain, bootstrap credential, auth/encryption keys, model/provider/cap, OAuth/webhook secrets, SMS/email settings, storage paths, logging/error reporting and backup configuration. Fail fast on missing secrets; never include working credentials as defaults.

## Meta setup and review preparation

Owner preparation checklist (exact console labels and permissions still await official verification):

1. Confirm ownership/admin access to the intended Facebook Page and the business's developer account.
2. Confirm/create the developer app in the official portal; record its app ID and intended Page/business relationship. Store its secret only through deployment configuration.
3. Establish the public HTTPS origin and public privacy/data-deletion information needed by the applicable app setup.
4. Verify the exact current product setup, redirect URIs, Page permissions, access tiers and token lifecycle from official docs before implementing/requesting scopes.
5. Configure the verified callback/webhook paths after Phase 0/2 endpoints exist; test signature failure and durable receipt behavior.
6. Prepare reviewer instructions, test access and recordings showing each requested permission in use. Complete business verification/review where required. Request only capabilities Helpa actually implements.
7. Check granted permissions and Page selection after OAuth, then test with allowed accounts in dry-run. Enable live only after the relevant live acceptance checks pass.

This is a preparation sequence, not a completed/current permission checklist. [API register](API_NOTES.md) lists inaccessible pages and outstanding evidence. Missing review cannot be solved by borrowing a user's personal password.

## TikTok application and audit checklist

1. Resolve the internal-use eligibility issue in [API notes](API_NOTES.md) with TikTok before depending on Direct Post approval. Record the answer and capability state.
2. Confirm app/account ownership, configured redirect URL and the requested Content Posting product/scopes. Obtain actual user authorization; app creation alone grants no access.
3. Verify the current required creator preview/settings, user consent, disclosure controls, upload-source rules and status-reporting UX in the completed publisher.
4. Prepare honest app-purpose, reviewer access and screencast material. Submit the applicable audit if eligible; never describe this internal utility as a public multi-customer product unless its scope actually changes.
5. Validate allowed account/visibility conditions in the unaudited path. Record active mode and reason in the UI.
6. Use separately authorized inbox upload where available; otherwise export media/caption and finish in TikTok manually. A handoff is not a published post; record human completion evidence.
7. Apply separately for business-message/comment capabilities if useful. Keep manual threads until exact APIs and access are verified.

## Normal operation and incidents

- Each day: inspect failed/overdue jobs, unknown outbound outcomes, knowledge freshness, webhook failures, spend remaining and token expiry. Review waiting approvals and fallback ownership.
- Pause incident: owner enables automation pause; all automatic replies including holding replies stop. For broader containment, pause scheduled publishing and set global dry-run. Inspect pending attempts before resume; in-flight external requests cannot be recalled.
- Retry incident: reconcile unknown platform outcomes before retrying. A screenshot/permalink/manual confirmation is marked human evidence. Never clear idempotency history to make a job run.
- Stale data: correct the source or explicitly attest a current observation; syncing an old sheet is not a freshness fix. Recompute pending drafts and their approvals.
- Token rotation: suspend affected dispatch, reconnect or refresh using the platform's documented flow, verify scopes/account identity, audit the change, revoke superseded credentials where supported. Alert seven days before a known expiry; unknown expiry is a visible state. Do not assume every Page token has a refresh endpoint.
- Encryption-key rotation: install a versioned wrapping key, rewrap data keys, verify decryption, preserve keys required by backups, then retire the old key according to backup retention. A database backup without its key material is not recoverable.
- Delegate revocation: revoke membership/sessions and pending authority; verify denial from an existing session and a queued job.

## Backup and restore drill

Phase 0 adds a nightly `pg_dump` and media backup script, encryption, an off-host copy and failure alerts. A consistent media manifest must distinguish referenced immutable assets from incomplete uploads. Suggested targets: RPO 24 hours, RTO 4 hours, validated rather than promised.

Restore drill: provision an isolated host in dry-run with workers paused; restore database/media and separately held encryption keys; run compatible migrations; verify sample attachments, immutable facts, audit history and owner recovery; identify effects possibly sent after the backup; reconcile those before selectively releasing jobs. Record duration, recovered timestamp and missing data. Run the drill before production and after material backup changes.

## Add a channel

Document official capability/access evidence; implement the adapter interface and sanitized contract fixtures; start with manual capabilities and dry-run; add signature/dedup and transport-policy checks; implement UI capability states; verify dispatch/audit/authorization coverage; run live acceptance only with granted access. Core modules must not import the new provider's SDK.

## Remaining sections by phase

- Phase 0: exact install/env/backup/recovery commands, owner MFA recovery, Meta token-connect procedure, release/rollback procedure.
- Phase 1: publication reconciliation, format limits, media cleanup, TikTok operational checklist verified against final UI.
- Phase 2: source mapping/freshness diagnostics, budget failure, pipeline evidence, policy exceptions actually granted, golden-set execution.
- Phase 3: real SMS onboarding, session/TOTP support, on-duty routing, audit export and token expiry recovery.
- Phases 4–5: metric completeness/backfills, digest delivery, insight evidence and proposal rollback.
