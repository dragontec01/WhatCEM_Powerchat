# PowerChat Development Environment

This document explains how to run the backend, frontend, and PostgreSQL locally using Docker for a development setup that mimics production separation.

## Overview
We use a single docker-compose file for development:
- `docker-compose.dev.yml`: Runs PostgreSQL and the app container (which starts both backend and frontend using the `npm run dev` script)

All services communicate over a shared Docker bridge network: `powerchat_dev_network`.

## Prerequisites
- Docker Desktop
- Optional: Node.js (if you want to run anything outside containers)

## First Time Setup
1. (Optional) Create a `.env` file for extra environment variables if needed. Example:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=root
   POSTGRES_DB=powerchat
   DB_PORT=5433
   APP_PORT=9000
   NODE_ENV=development
   ```

## Start Backend, Frontend, and Database
```cmd
docker compose -f docker-compose.dev.yml up -d --build
```
Services started:
- `postgres` on internal port 5432 (host mapped to 5433)
- `app` container runs both backend and frontend (backend on `${APP_PORT}`, frontend on 5173)

Database connection string (from host):
```
postgresql://postgres:root@localhost:5433/powerchat
```
From inside the Docker network (app container):
```
postgresql://postgres:root@postgres:5432/powerchat
```

### Apply Migrations
On first run the mounted `./migrations` are executed automatically by the official Postgres entrypoint. Afterwards, use the app scripts if further migrations are needed:
```cmd
docker compose -f docker-compose.dev.yml exec app npm run db:migrate
```

## Accessing the App
- **Frontend:** http://localhost:5173
- **Backend/API:** http://localhost:${APP_PORT} (default 9000)

The frontend proxies API requests to the backend using Vite's proxy config.

## Live Code Editing
The app container mounts the source directory. Changes to `server/` or `client/` reflect immediately (backend uses tsx/nodemon, frontend uses Vite).

## Useful Commands
- View logs:
  ```cmd
  docker compose -f docker-compose.dev.yml logs -f app
  docker compose -f docker-compose.dev.yml logs -f postgres
  ```
- PSQL console:
  ```cmd
  docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d powerchat
  ```
- Rebuild:
  ```cmd
  docker compose -f docker-compose.dev.yml up -d --build
  ```
- Stop services:
  ```cmd
  docker compose -f docker-compose.dev.yml down
  ```
- Reset database (WARNING deletes data):
  ```cmd
  docker compose -f docker-compose.dev.yml down -v
  docker compose -f docker-compose.dev.yml up -d --build
  ```

## Environment Variables
Adjust in `.env` as needed:
- Backend: `DATABASE_URL`, `APP_PORT`, etc.
- Frontend: `VITE_BACKEND_URL` (usually set in Dockerfile or passed via env)

## Troubleshooting
- Frontend cannot reach backend: ensure both are running in the app container and ports are exposed. Check with:
  ```cmd
  docker compose -f docker-compose.dev.yml ps
  docker compose -f docker-compose.dev.yml logs -f app
  ```
- Migrations not applied: remove volume or run manual migration script.
- Port conflicts: change host ports in `.env` and compose file.

## Next Steps
- Add more env vars needed for OAuth / third-party APIs to `.env` and compose.
- Introduce a production compose variant separating build and runtime phases.

---
Happy coding!
