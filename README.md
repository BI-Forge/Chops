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
