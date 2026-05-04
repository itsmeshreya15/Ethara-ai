# Team Task Manager

Full-stack web app for **projects**, **team membership**, and **tasks** with **Admin** vs **Member** permissions, a **dashboard** (counts, overdue, assignments), and **JWT authentication**.

## Live demo

After you deploy to Railway, put your public URL here:

- **Live app:** `https://YOUR-APP.up.railway.app` (replace with your Railway domain)

## Tech stack

| Layer    | Choice                                      |
| -------- | ------------------------------------------- |
| API      | Node.js 20, Express, Zod validation         |
| Auth     | JWT (`Authorization: Bearer`), bcrypt       |
| Database | PostgreSQL via Prisma ORM                   |
| UI       | React 18, Vite, React Router                |
| Deploy   | Docker (`Dockerfile`) + [Railway](https://railway.app/) |

## Features

- **Signup / login** with password hashing
- **Projects:** create, rename, description, delete (Admin)
- **Team:** invite existing users by email, roles **ADMIN** / **MEMBER**, remove members (Admin; self-remove allowed)
- **Tasks:** title, description, status (`TODO` / `IN_PROGRESS` / `DONE`), due date, assignee (must be a project member)
- **RBAC:** Admins manage project settings, membership, and may delete any task or reassign freely. Members create tasks, edit tasks they **created** or are **assigned** to, and may assign new tasks only to **themselves** unless they are Admin.
- **Dashboard:** totals by status, overdue and “due soon” counts, open tasks assigned to you, per-project breakdown

## Repo layout

```
server/          Express API + Prisma schema & migrations
client/          Vite + React SPA
Dockerfile       Production image (API + static UI)
railway.json     Railway Docker build config
```

## Local development

**Requirements:** Node 20+, PostgreSQL (local or cloud).

1. Copy env and set `DATABASE_URL` and `JWT_SECRET`:

   ```bash
   cp server/.env.example server/.env
   ```

2. Install and migrate:

   ```bash
   npm install
   cd server && npx prisma migrate deploy && cd ..
   ```

3. Run API + UI together:

   ```bash
   npm run dev
   ```

   - API: `http://127.0.0.1:4000` (health: `GET /api/health`)
   - UI: `http://127.0.0.1:5173` (Vite proxies `/api` to the API)

For UI-only work with a built bundle served by Express:

```bash
npm run build
cd server && node src/index.js
```

## Environment variables

| Variable       | Required | Description                                        |
| -------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL connection string for Prisma            |
| `JWT_SECRET`   | Yes\*    | Secret for signing tokens (\*required in prod)   |
| `PORT`         | No       | Listen port (default `4000`; Railway sets this)    |
| `CORS_ORIGIN`  | No       | Comma-separated allowed origins if UI is separate |

## Deploy on Railway

1. Create a **new project** on Railway and add **PostgreSQL** (or use an existing Postgres plugin).
2. Create a **new service** from this GitHub repo (or deploy with the Railway CLI).
3. Set **Root directory** to the repository root (where `Dockerfile` lives).
4. In the service **Variables**, set:
   - `DATABASE_URL` — use the variable reference from the Railway Postgres service (Railway can inject this automatically when you link the database).
   - `JWT_SECRET` — a long random string (e.g. 32+ bytes from a password manager).
5. Ensure **PORT** is not overridden incorrectly; Railway provides `PORT` automatically — the app reads `process.env.PORT`.
6. Deploy. On start, the container runs `prisma migrate deploy` then starts Node.

If the UI and API share one Railway URL, leave `VITE_API_URL` unset so the browser calls same-origin `/api/...`.

## Demo video (submission)

Record a short walkthrough (2–5 minutes) covering:

1. Register two users (Admin vs Member scenario).
2. Create a project, invite the second user, show role badge.
3. Create tasks, assign, change status, show overdue on dashboard.
4. Show Member limitations (e.g. assign only self) and Admin powers (delete task, project settings).

Upload to YouTube (unlisted) or Loom and add the link here:

- **Video:** `YOUR_VIDEO_URL`

## API overview

| Method & path | Notes |
| ------------- | ----- |
| `POST /api/auth/register` | `{ email, password, name }` |
| `POST /api/auth/login` | `{ email, password }` |
| `GET /api/auth/me` | Bearer token |
| `GET /api/dashboard` | Aggregated stats |
| `GET/POST /api/projects` | List / create |
| `GET/PATCH/DELETE /api/projects/:projectId` | Member read; Admin patch/delete |
| `POST /api/projects/:projectId/members` | Admin — `{ email, role? }` |
| `PATCH /api/projects/:projectId/members/:userId` | Admin — `{ role }` |
| `DELETE /api/projects/:projectId/members/:userId` | Admin or self |
| `GET/POST /api/projects/:projectId/tasks` | List / create |
| `PATCH /api/projects/:projectId/tasks/:taskId` | RBAC rules above |
| `DELETE /api/projects/:projectId/tasks/:taskId` | Admin only |

## License

MIT — use freely for coursework or portfolios.
