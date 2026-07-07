---
name: verify
description: How to build, run and drive bm-backend for end-to-end verification against the local Postgres.
---

# Verifying bm-backend changes

## Prerequisites
- Docker Desktop running; the DB is the `bms-postgres` container (Postgres on `localhost:5433`, db `bms_db`, user `bms_user`, password inside `DATABASE_URL` in `bm-backend/.env`). It auto-starts with the daemon; `open -a Docker` if the daemon is down.
- Seeded credentials: platform super admin `superadmin@bms.com` / `SuperAdmin123!` (prisma/seed.ts); owners `owner1..3@test.com` / `Asdf@#1234` (prisma/seed-full.ts).

## Run
```bash
cd bm-backend
npm run start:dev          # serves http://localhost:8000, routes under /v1
```
Drive with curl: `POST /v1/app/auth/login` (owner), `POST /v1/platform/auth/login` (admin), pass `Authorization: Bearer <accessToken>`. Access tokens expire in 15 minutes — re-login if you get a bare `{"message":"Unauthorized"}`.

Inspect state directly:
```bash
PGPASSWORD=... psql -h localhost -p 5433 -U bms_user -d bms_db
```

## Gotchas
- **Console Ninja** (VSCode extension) hooks node processes launched from this workspace and swallows stdout/stderr. When output matters, write evidence to a file (`fs.appendFileSync`) instead of console.
- **tsx cannot run Nest code** — esbuild drops `emitDecoratorMetadata`, so DI silently injects `undefined`. Use `ts-node` or `nest build` + `node dist/src/<file>.js` for one-off scripts that bootstrap Nest modules.
- One-off scripts that bootstrap a Nest module context: import `'dotenv/config'` first, and bootstrap the smallest module (e.g. a single Global module) rather than AppModule.
- Cron jobs live in `src/common/scheduler/scheduler.service.ts`; to exercise one without waiting, bootstrap its service and call the method the `@Cron` decorates.
- Unit tests (`npm test`) are default Nest scaffolds and fail on DI — not a signal about your change.
