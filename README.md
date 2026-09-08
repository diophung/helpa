# Helpa

Helpa is a self-hosted assistant for a Vietnamese seafood business: schedule Facebook and TikTok content, answer inquiries from approved business data, delegate work without sharing platform credentials, and eventually explain operational and audience trends.

**Status: planning only. No application, containers, migrations, or integrations have been implemented.** Phase 0 starts after Dio answers the three blocking questions. No credentials belong in this repository or in chat.

Start here:

- [Plan and acceptance criteria](docs/PLAN.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [Blocking decisions and other questions](docs/OPEN_QUESTIONS.md)
- [Architecture decisions](docs/adr/README.md)
- [API verification notes](docs/API_NOTES.md)
- [Runbook outline](docs/RUNBOOK.md)

The intended deployment is one web app, one worker, Postgres, and Caddy on a paid VPS. Phase 0 will add a tested Docker Compose quickstart, a documented `.env.example`, and an owner login flow. The eventual fresh-host instructions will contain no more than 15 steps; there is nothing to run yet.

Core constraints: dry-run by default, an audit trail for every outbound action, server-enforced role and channel scope, UTC storage with Vietnam scheduling, and no unverified facts in automatic replies. Instagram is outside current scope. Platform approvals are external dependencies, not implementation milestones we can promise to complete ourselves.
