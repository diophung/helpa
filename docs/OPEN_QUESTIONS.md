# Decisions needed from Dio

Date: 2026-09-08. All answers are pending. Questions B1–B3 block application code, as requested in the brief. Planning and documentation can continue. Selecting a provider does not require pasting its secret into chat; credentials will be installed locally through the documented environment/secret configuration.

## Blocking before Phase 0

| ID | Question | Proposal / information needed |
| --- | --- | --- |
| B1 | Which LLM provider/key should the gateway use, and what monthly budget cap should Helpa enforce? | Propose Anthropic Claude, configurable model, provider-agnostic gateway. Confirm provider, API key availability, and USD/month cap. No paid default or unlimited budget will be silently selected. |
| B2 | Which SMS provider should handle OTP for Vietnamese phone numbers? | Two options below. Confirm provider and account availability; a console provider will support local development. |
| B3 | Do you already have a VPS and domain, or should we document a recommended setup? | If existing: provider, OS, RAM/CPU, region, intended hostname, and whether you control DNS. Otherwise, authorize documenting a paid 2-vCPU/4-GB VPS setup with Docker and Caddy. No infrastructure purchase is implied. |

### SMS options and cost basis

Prices checked 2026-09-08; USD, excluding taxes, retries, extra message segments, account-specific rates, and any additional carrier charges.

1. **Twilio Verify — proposed for the first integration.** Public Verify fee is $0.05 per successful verification, plus channel charges. Published Vietnam SMS rate is $0.2852 per segment. A planning estimate with one successful verification and one SMS segment is **$0.3352**, or **$33.52 for 100**. This combines public prices, not an account-specific Verify quote. Confirm the actual Vietnam route/rate and sender requirements in the account before activation. Sources: [Verify pricing](https://www.twilio.com/en-us/verify/pricing), [Vietnam SMS pricing](https://www.twilio.com/en-us/sms/pricing/vn).
2. **Vonage Verify Conversion.** Public Verify fee is **$0.06084 per successful verification**, plus messaging/voice charges for attempts. For 100 successes and 100 single-segment attempts, budget **$6.084 + 100 × the account's Vietnam SMS rate**. The Vietnam delivery rate was not available in the retrieved public page; it needs the account dashboard or a quote. This is not a comparable all-in price yet. Sources: [Verify pricing](https://www.vonage.com/communications-apis/verify/pricing/), [SMS pricing](https://www.vonage.com/communications-apis/sms/pricing/).

Twilio is proposed for a more concrete initial estimate, not a claim of lowest cost or best Vietnam deliverability. Both options need a delivery test on the delegates' carriers. Use an SMS-only verification workflow initially; do not enable billable voice fallback automatically. Complaint SMS notifications are a separate provider capability/cost from managed OTP.

## Non-blocking questions from §11

| ID | Question | Working assumption while unanswered |
| --- | --- | --- |
| Q4 | Have you created the Meta developer app and TikTok developer app? Which permissions/products have actually been granted, and is your Page linked? | Assume neither is ready. Prepare review/setup checklists first. Show connection unavailable/manual states; never label a fixture as a connected account. Permission names in the brief still need official verification. |
| Q5 | Can you provide 5–10 real customer messages with ideal replies, plus the product/shipping sheet or its column headers? | Use clearly synthetic Vietnamese fixtures and canonical headers in development. No production prices, origin, quality claims, or brand examples will be invented. Redact customer identifiers in examples. |
| Q6 | What are business hours, and who is on duty outside them? | 07:00–21:00 Asia/Ho_Chi_Minh, daily; owner is the fallback assignee. Fresh, unambiguous eligible facts can still auto-reply after hours; escalations get an approved holding reply if policy permits. |
| Q7 | Should complaints send an SMS to you personally, or only in-app/email? | In-app plus email once configured; no complaint SMS without opt-in. Complaints always route to a human. |

## Recorded defaults

- UI language Vietnamese, selectable English; reply language detected per incoming message. Warm anh/chị addressing. Brand-voice seed is provisional until Q5.
- Business timezone Asia/Ho_Chi_Minh. User display timezone is independent; owner may choose America/Los_Angeles. Currency VND; money stored as decimal, never binary float.
- `HELPA_MODE=dry_run`. An additional owner-controlled automation pause also suppresses automatic holding replies. Global dry-run cannot be overridden by a channel.
- Posts require approval by default; Owner/Manager can approve. Editing approved content invalidates the approval.
- Freshness limits: prices 24 hours, stock 2 hours, shipping 7 days, FAQ 30 days. Missing trustworthy fact timestamp means not fresh.
- Duplicate-reply suppression: 10 minutes. Initial classification threshold: 0.90, uncalibrated; tune against Dio's signed-off golden set, never use confidence to bypass a fact/policy failure.
- Approval SLA target: 15 minutes; owner fallback if nobody is on duty. The holding copy will avoid promising a response deadline until staffing is confirmed.
- Local disk media with optional S3-compatible storage later; one simultaneous transcode on the target VPS. No Redis.
- Audit retention minimum 12 months; backup target RPO 24 hours / RTO 4 hours, to be validated by a restore drill.
- Unknown platform capabilities default to manual/disabled. TikTok eligibility risk is documented in [API notes](API_NOTES.md), and is not presumed resolved by waiting for an audit.

## Reconciling requirements

The delegation story includes an “approve drafts only” staffer, but none of the five named roles is restricted to that action. Proposed refinement: keep the five roles and allow an optional per-membership permission allowlist that can only subtract permissions. An Agent restricted to `reply.approve` can inspect the supporting thread/facts without freeform send, editing, or assignment. Owner retains full authority. This is a recorded implementation assumption, not an additional blocker.
