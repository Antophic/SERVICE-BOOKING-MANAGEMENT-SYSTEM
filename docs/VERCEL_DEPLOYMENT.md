# Vercel Deployment

ServiceFlow is configured as a Vite static frontend plus Vercel Node.js API functions.
All `/api/*` requests are rewritten to the Express handler in `api/index.ts`.

References:

- Vercel Express guide: https://vercel.com/docs/frameworks/backend/express
- Vercel Vite guide: https://vercel.com/docs/frameworks/frontend/vite
- Vercel project configuration: https://vercel.com/docs/project-configuration/vercel-json
- Vercel system environment variables: https://vercel.com/docs/environment-variables/system-environment-variables

## 1. Create A MySQL Database

Create a managed MySQL database and copy its connection string.

The connection string should look like this:

```text
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Use a database that accepts remote connections from Vercel deployments.

## 2. Import The Repository

In Vercel, import this repository:

```text
https://github.com/Antophic/SERVICE-BOOKING-MANAGEMENT-SYSTEM.git
```

Framework preset:

```text
Vite
```

The repository already includes `vercel.json`, so Vercel should use:

```text
Install Command: npm ci --include=dev && npm --prefix backend ci --include=dev && npm --prefix backend run prisma:generate
Build Command: npm run typecheck:all && npm run build:all && npm --prefix backend run prisma:deploy && npm --prefix backend run prisma:seed
Output Directory: dist
```

## 3. Set Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```text
NODE_ENV=production
DATA_STORE=prisma
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
CLIENT_ORIGIN=https://your-vercel-domain.vercel.app
VITE_API_URL=/api
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
BUSINESS_TIMEZONE=Asia/Jakarta
```

Optional:

```text
ADDITIONAL_CORS_ORIGINS=https://your-custom-domain.com,https://another-preview-domain.vercel.app
```

Notes:

- `JWT_SECRET` must not use the local demo value.
- `VITE_API_URL` must be lowercase `/api`.
- `COOKIE_SAMESITE=lax` is correct when the frontend and API are deployed under the same Vercel domain.
- Use `COOKIE_SAMESITE=none` only if the API is deployed on a separate domain, and keep `COOKIE_SECURE=true`.
- Vercel also provides deployment URL variables automatically; the backend allowlist reads them when available.

## 4. Deploy

Trigger a Vercel deployment from the dashboard.

During build, Vercel will:

```text
1. Install frontend dependencies
2. Install backend dependencies
3. Generate Prisma Client
4. Typecheck frontend and backend
5. Build frontend and backend
6. Apply Prisma migrations
7. Seed fictional demo data
```

After deployment, verify:

```text
https://your-vercel-domain.vercel.app/
https://your-vercel-domain.vercel.app/book
https://your-vercel-domain.vercel.app/api/health
```

Demo accounts seeded for portfolio/demo use:

```text
Admin: admin@serviceflow.test / Password123!
Staff: james@serviceflow.test / Password123!
```

Do not reuse those demo credentials for a real business deployment.
