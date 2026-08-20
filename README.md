# Chops (ClickHouse OPS)

Self-hosted web application for **monitoring and operating ClickHouse** clusters. A Go **REST API** (`/api/v1`) backs a **React (Vite)** UI; the app stores its own users, roles, and permissions in **PostgreSQL** and talks to one or more **ClickHouse** instances over the native protocol.

## Maintainer

Chops is **created and maintained by BI Forge LLC**.

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

## ClickHouse database and `ops` user

Chops connects to ClickHouse using credentials from the agent configuration (username, password, hosts). On the ClickHouse server, create a dedicated database and user for the ops agent, then align the password with your config.

Run the following as a sufficiently privileged account (for example `default`). Replace `<password>` with a strong secret and use the same value in the agent config.

```sql
CREATE DATABASE ops;
CREATE USER 'ops' IDENTIFIED WITH plaintext_password BY '<password>';
GRANT SELECT, CREATE, dictGet, SHOW, KILL QUERY ON *.* TO ops;
GRANT INSERT ON ops.* TO ops;
GRANT ALTER USER, CREATE USER, CREATE ROLE, CREATE PROFILE ON *.* TO ops;
GRANT SELECT, INSERT, dictGet, CREATE, DROP, ROLE ADMIN ON *.* TO ops WITH GRANT OPTION;
```

These grants allow the app to read system data, manage ops-side objects, ingest metrics into `ops`, and perform user/role administration features exposed in Chops where permitted.

## Run (Docker Compose)

From the repository root (builds images locally):

```bash
docker compose up -d --build
```

Typical ports (see `docker-compose.yml`): **frontend 80**, **API 8080**, **PostgreSQL 5436**, ClickHouse instances **8121** / **8120** (HTTP). Adjust configuration under `.config/clickhouse/` and agent config as needed for your environment.

## Run from Docker Hub

Published images (linux/amd64), tagged `latest` and `vX.Y.Z` when a GitHub tag is created:

- App image: [docker.io/alexindacomp/chops-app](https://hub.docker.com/r/alexindacomp/chops-app)
- Frontend image: [docker.io/alexindacomp/chops-front](https://hub.docker.com/r/alexindacomp/chops-front)

| Image | Role | Port |
|-------|------|------|
| [`alexindacomp/chops-app`](https://hub.docker.com/r/alexindacomp/chops-app) | Go API (`/api/v1`, `/swagger`, `/healthz`) | 8080 |
| [`alexindacomp/chops-front`](https://hub.docker.com/r/alexindacomp/chops-front) | React UI (nginx). Proxies `/api` to `http://app:8080` | 80 |

You still need **PostgreSQL** (app users/RBAC) and an existing **ClickHouse** cluster (native protocol, port 9000). Create the ClickHouse `ops` user as in the section above.

The frontend image resolves the API by Docker DNS name `app`. In Compose the API service **must** be named `app`.

Example `docker-compose.yml`:

```yaml
services:
  front:
    image: alexindacomp/chops-front:latest
    ports:
      - "80:80"
    depends_on:
      - app
    restart: unless-stopped

  app:
    image: alexindacomp/chops-app:latest
    env_file: .env
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:13.11
    environment:
      POSTGRES_USER: chops
      POSTGRES_PASSWORD: change-me
      POSTGRES_DB: chops
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chops -d chops"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - chops_pg:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  chops_pg:
```

Example `.env` (built-in agent config expects **two** ClickHouse nodes):

```env
OPS_JWT_SECRET_KEY=generate-a-long-random-secret
OPS_POSTGRES_DSN=postgres://chops:change-me@db:5432/chops?sslmode=disable
OPS_CLUSTER_NAME=my_cluster
OPS_METRICS_SNAPSHOT_ENABLED=true

OPS_CLICKHOUSE_NAME=replica-1
OPS_CLICKHOUSE_HOST=10.0.0.1
OPS_CLICKHOUSE_PORT=9000
OPS_CLICKHOUSE_USERNAME=ops
OPS_CLICKHOUSE_PASSWORD=change-me
OPS_CLICKHOUSE_DATABASE=ops
OPS_CLICKHOUSE_METRICS_SCHEMA=ops
OPS_CLICKHOUSE_METRICS_TABLE=metrics_snapshot

OPS_CLICKHOUSE_NAME_2=replica-2
OPS_CLICKHOUSE_HOST_2=10.0.0.2
OPS_CLICKHOUSE_PORT_2=9000
OPS_CLICKHOUSE_USERNAME_2=ops
OPS_CLICKHOUSE_PASSWORD_2=change-me
OPS_CLICKHOUSE_DATABASE_2=ops
OPS_CLICKHOUSE_METRICS_SCHEMA_2=ops
OPS_CLICKHOUSE_METRICS_TABLE_2=metrics_snapshot
```

```bash
docker compose up -d
```

UI: `http://localhost`. API/Swagger: `http://localhost:8080/swagger/index.html`. Pin a release with the same tag on both images, for example `alexindacomp/chops-app:v1.0.0` and `alexindacomp/chops-front:v1.0.0`.

Empty `OPS_CLICKHOUSE_*_2` values will fail startup. For a single node, mount your own YAML onto `/app/configs/ops-agent.yaml`. Optional `OPS_AGENT_CONFIG_PATH` overrides the default path. PostgreSQL migrations run on API startup.

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

