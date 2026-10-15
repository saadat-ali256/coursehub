# CourseHub Server

Standalone Express backend/API for CourseHub. All backend routes, MongoDB models, authentication, uploads, payments, admin features and services live inside this `server` folder.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Install dependencies.

```bash
npm install
```

## Run

```bash
npm run dev
```

Server: `http://localhost:5000`
Health: `http://localhost:5000/health`

## Create/update admin

```bash
npm run seed:admin
```

The seed command reads `.env` and also supports `.env.local`.

## Frontend connection

The frontend keeps its normal `/api/*` calls. Next.js rewrites those requests to `API_SERVER_URL` (default `http://localhost:5000`).

## Community content retention

Feed posts, their comments, and group chat messages expire automatically 30 days after creation. MongoDB TTL indexes apply this policy to existing and new records; group records are not deleted.
