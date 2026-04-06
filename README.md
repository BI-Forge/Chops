# ClickHouse OPS (Chops)

Self-hosted web application for **monitoring and operating ClickHouse** clusters. A Go **REST API** (`/api/v1`) backs a **React (Vite)** UI; the app stores its own users, roles, and permissions in **PostgreSQL** and talks to one or more **ClickHouse** instances over the native protocol.

## Maintainer

ClickHouse OPS is **created and maintained by BI Forge LLC**.

## What it does (feature overview)

- **Authentication** — Registration and login with JWT; optional “remember me” (longer token TTL); inactive users blocked at the API layer.
- **RBAC** — Fine-grained permission codes; each app user has one system role. Built-in roles include **admin** and **guest** (system roles cannot be deleted). Admins can create custom roles, assign permissions, assign roles to users, and activate/deactivate accounts (**Admin Settings** in the UI).
- **Multi-node** — Select a ClickHouse node in the header; choice is persisted for the session. Metrics and operational APIs are scoped to the selected node where applicable.
- **Dashboard** — Live and historical **metrics** (streams, series, server info) with charts for the selected node.
- **Query history** — Query log listing with filters, stats, running queries, process list, **kill query**, and performance charts tied to selected queries.
- **Backups** — Backup statistics, in-progress and completed jobs, per-backup details.
- **ClickHouse users** — List/detail users; create, rename, delete; password, profile, **ClickHouse role**, **access scopes**, and per-user settings where permitted.
- **Tables** — Paginated table list with sort, details by UUID, **copy** and **delete** table actions.
- **Settings** — Server/session settings from ClickHouse (`system.settings`) with filters, sorting, pagination, and detail view.
- **Supporting APIs** — Profiles list, ClickHouse roles list, schemas list, columns list (used where the UI needs them).
- **UX** — Light/dark theme, responsive layout (sidebar / mobile menu), toasts/alerts, legal modals on registration.

## Stack

| Layer        | Technology                                      |
|-------------|--------------------------------------------------|
| Backend     | Go, Gin, GORM, JWT, Cobra CLI                    |
| Frontend    | React, TypeScript, Vite, Tailwind, React Router  |
| App DB      | PostgreSQL (migrations on startup)               |
| Data plane  | ClickHouse (metrics, `system`, query log, users) |

OpenAPI/Swagger is served from the agent (see `agent/internal/api/docs`).

## Run (Docker Compose)

From the repository root:

```bash
docker compose up -d --build
```

Typical ports (see `docker-compose.yml`): **frontend 80**, **API 8080**, **PostgreSQL 5436**, ClickHouse instances **8121** / **8120** (HTTP). Adjust configuration under `.config/clickhouse/` and agent config as needed for your environment.

## Tests

Backend and E2E-style flows are intended to run **via Docker** and the root **Makefile**, for example:

- `make test` — Go tests under `agent/tests/...`
- `make test-api` — API tests only
- `make test-frontend` — Playwright against the stack defined in `docker-compose.test.yml`

## Repository layout (short)

- `agent/` — HTTP server, ClickHouse integration, PostgreSQL models/migrations, RBAC, API handlers.
- `frontend/` — SPA, pages (dashboard, queries, backups, users, tables, settings, admin settings), shared components.
- `build/` — Dockerfiles referenced by compose (e.g. frontend image under `frontend/build/docker/`).
- `docker-compose.yml` / `docker-compose.test.yml` — local and test stacks.

  <img width="1934" height="1169" alt="Screenshot 2026-04-06 185524" src="https://github.com/user-attachments/assets/57adb080-711e-4bec-9cfc-ec2bcf991e88" />
<img width="2548" height="1298" alt="Screenshot 2026-04-06 185544" src="https://github.com/user-attachments/assets/ea29d972-c62a-49f7-9255-3f1c8b2e5bf0" />
<img width="2546" height="1296" alt="Screenshot 2026-04-06 185553" src="https://github.com/user-attachments/assets/c892543f-3e05-48f9-9443-ea6f97c55799" />
<img width="1369" height="875" alt="Screenshot 2026-04-06 185609" src="https://github.com/user-attachments/assets/c110d6c4-b314-4f30-a916-704dae1fe3a3" />
<img width="2544" height="1297" alt="Screenshot 2026-04-06 185619" src="https://github.com/user-attachments/assets/8b9b3049-8337-486a-9da4-eb3e3be5ec7b" />
<img width="816" height="556" alt="Screenshot 2026-04-06 185629" src="https://github.com/user-attachments/assets/60f93641-f8d2-49a2-b7fc-dda174f05b41" />
<img width="2538" height="1292" alt="Screenshot 2026-04-06 185641" src="https://github.com/user-attachments/assets/c2794db8-ec3d-4509-95cd-d40d5708e065" />
<img width="2544" height="1299" alt="Screenshot 2026-04-06 185652" src="https://github.com/user-attachments/assets/45f60a26-24a1-4567-a9cd-bda0105cc750" />

