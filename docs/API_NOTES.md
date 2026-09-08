# Official API verification register

Reviewed: 2026-09-08. This preliminary register supports planning. It is **not** permission to implement endpoints that have not been verified. Every adapter operation needs a pinned API version, current scope/permission, official request/response reference, limits, retry/error semantics, and sanitized fixtures before implementation. No requests to Dio's accounts have been made.

## TikTok Content Posting

The [current sharing guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines) exclude internal/private utilities for accounts the developer or their team manages. **Inference:** Helpa's single-business scope is a Direct Post eligibility risk, not just an audit delay. Ask TikTok about eligibility before promising public Direct Post. The same guidelines restrict unaudited Direct Post to private visibility; active app/account limitations also apply.

If eligible, implement explicit user preview/consent, current creator settings and permitted privacy choices, disclosure controls, and publication-status tracking. Re-read the full required UX and upload-source rules during Phase 1. Never hard-code permission to publish from a generic “TikTok connected” status. Manual export remains available. Inbox upload requires its own granted scope and is not an assumed policy loophole.

Additional verified pages:

| Source | Verified planning fact | Still required before coding |
| --- | --- | --- |
| [Direct Post getting started](https://developers.tiktok.com/docs/en/content-posting-api-get-started) | Direct Post needs approved `video.publish` scope and user authorization | Selected account/app eligibility, OAuth configuration, current request sequence |
| [Direct Post reference](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post) | Official API reference is accessible | Extract and fixture-test exact fields, status handling and limits |
| [Upload getting started](https://developers.tiktok.com/docs/en/content-posting-api-get-started-upload-content) | Official inbox-upload documentation is accessible | Verify `video.upload`, account grant, user completion flow and upload limits before enabling |

Full capability matrix will distinguish Direct Post eligibility, audit state, user grant, inbox upload, manual publish, inbox ingest/reply, comments and metrics. Different operations can have different modes on one channel. No fixed audit turnaround is promised.

## Meta

The supplied official URLs returned retrieval errors in this planning session. No permissions, endpoint parameters, current version, token lifetime, or message-tag exceptions have been independently verified from their full contents. Retain the brief's conservative 24-hour-window requirement in the design and deny exceptions until verified. Do not silently turn the brief's list into an OAuth scope string.

| Official source to verify | Required evidence |
| --- | --- |
| [Pages API](https://developers.facebook.com/docs/pages-api) | Page discovery, access tokens, text/photo/multi-photo/video publishing, current version and exact permissions |
| [Permissions](https://developers.facebook.com/docs/permissions) | Confirm each requested permission and review/access requirements |
| [Reels publishing](https://developers.facebook.com/docs/video-api/guides/reels-publishing) | Upload/status/publish lifecycle, video specifications and failure recovery |
| [Page webhooks](https://developers.facebook.com/docs/graph-api/webhooks/reference/page) | Supported subscriptions/fields, signatures, event identifiers, verification handshake |
| [Messenger overview](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview) | Page/app prerequisites and supported customer interaction types |
| [Send messages](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages) | Recipient IDs, request forms, response handling and limits |
| [Messenger policy](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy) | Current window rules, tags, automation disclosure and human path; whether any exceptions apply to this use case |

Candidate permissions supplied by Dio: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_messaging`, `pages_manage_metadata`. **Unverified candidates, not an approved/current request set.** Before Phase 0 OAuth code, retry official portal access/search or use the owner's developer-console documentation. Exact scopes may differ by operation, app mode and review status.

## TikTok business messaging/comments

[Direct messages](https://business-api.tiktok.com/portal/docs/direct-messages/v1.3) and [reply to comment](https://business-api.tiktok.com/portal/docs/reply-to-a-comment/v1.3) returned empty page bodies through the research tool. Endpoint, permission, signature, policy and eligibility details remain unverified. Do not implement guessed HTTP routes. Use manual threads until the official docs and account access are available.

## Auth and queue references

- [Better Auth 2FA](https://better-auth.com/docs/plugins/2fa): passwordless enforcement caveat incorporated into ADR-004; test the actual pinned library combination.
- [Better Auth phone number](https://better-auth.com/docs/plugins/phone-number): provider verification hooks and phone-only identity adaptation are documented.
- [pg-boss](https://github.com/timgit/pg-boss): Postgres-backed jobs and transactional insertion support; external publication still needs reconciliation.

## Other implementation gates

The selected LLM's schema features/rates, Google Sheets read-only scopes/limits, SMS sender/delivery rules, storage/media libraries, and metric availability will be checked against their official documentation in the owning slice. The brief's food-advertising decree/fine figures are not independently verified here and will not be repeated as legal conclusions. The requested prohibition on unsupported health, quality and origin claims is a product constraint regardless of those figures.
