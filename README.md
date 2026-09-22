# BusPay Admin

Separate web dashboard for BusPay system admins. Talks to the NestJS API in `bus-pay-backend`.

## Run

1. Start the API (from `bus-pay-backend`):

```bash
npm run start:dev
```

2. Start this app:

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

Vite proxies `/api/*` → `http://127.0.0.1:3000/*`.

## Wired today (Phase 1B)

| Screen | API |
|--------|-----|
| Login | `POST /auth/admin/login` |
| Overview | `GET /admin/overview` |
| Register wakala | `POST /auth/admin/wakala` |

Other nav items are placeholders for later screens.

## Env

Copy `.env.example` → `.env`. Default:

```
VITE_API_BASE_URL=/api
```

For a direct backend URL (no proxy), set e.g. `VITE_API_BASE_URL=http://127.0.0.1:3000`.
