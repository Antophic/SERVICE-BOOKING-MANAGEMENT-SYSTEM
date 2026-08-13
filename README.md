# ServiceFlow

Booking & Job Management for Service Businesses

**Live Demo:** Pending deployment  
**Repository:** Pending GitHub publish

ServiceFlow is a full-stack booking and job management application for service businesses, featuring public booking intake, staff assignment, scheduling conflict detection, role-based dashboards, job status workflows, and database-backed operations.

> Screenshot will be added from the real deployed application at `public/serviceflow-dashboard.webp` when the app is production-ready.

## Problem

Small service businesses often manage bookings through WhatsApp, phone calls, forms, spreadsheets, email, and manual staff assignment. That creates missed bookings, duplicate appointments, unclear job status, scheduling conflicts, and poor customer information tracking.

## Solution

ServiceFlow provides one focused workflow for service businesses:

```text
Booking Request
-> Admin Review
-> Staff Assignment
-> Confirmation
-> Job Execution
-> Completion
```

The system is intentionally lightweight and production-like. It is not a CRM, HR platform, payroll system, invoice product, or enterprise field-service suite.

## Features

- Public customer booking form without account registration
- Admin operations dashboard with live database-backed metrics
- Booking management with search, filters, detail view, status updates, and cancellation
- Staff assignment with backend scheduling conflict detection
- Staff dashboard showing only assigned jobs
- Controlled booking status workflow
- Booking activity audit history
- Server-side pagination for admin booking lists
- Mobile-friendly public booking experience
- Responsive admin and staff interfaces
- Production-oriented validation, security, and error handling

## Architecture

```text
Frontend: React + Vite + TypeScript
Backend: Node.js + Express.js + TypeScript
Database: MySQL
ORM: Prisma
Auth: JWT + HTTP-only cookies + bcrypt
Validation: Zod
Deployment: Vercel
```

Recommended frontend structure:

```text
src/
  api/
  components/
  hooks/
  utils/
  constants/
  pages/
  types/
```

Recommended backend structure:

```text
backend/
  prisma/
  docs/
  src/
    config/
    constants/
    controllers/
    middlewares/
    repositories/
    routes/
    services/
    types/
    utils/
    validators/
```

## Authorization Model

ServiceFlow supports three access concepts:

- Public Customer: can submit booking requests without an account.
- Admin: can view all bookings, staff, dashboards, schedules, assignment controls, and operational actions.
- Staff: can log in, view only assigned jobs, start confirmed jobs, and complete in-progress jobs.

Role authorization and record-level authorization must be enforced on the backend. Frontend button visibility is only a UX layer, not a security boundary.

## Scheduling Conflict Logic

Staff assignment must reject overlapping bookings on the backend.

Conflict logic compares:

```text
scheduled start
+
estimated duration
=
scheduled end
```

If one staff member already has a booking whose time range overlaps the target booking, the API should reject the assignment with a professional error message such as:

```text
James Wilson already has a booking during this time.
```

The demo timezone should be explicit and documented. Current planned demo timezone: `Asia/Jakarta`.

## Database Schema

Planned relational models:

- User
- Customer
- Service
- Booking
- BookingActivity

Key relationships:

```text
Customer 1 - N Booking
Service 1 - N Booking
Staff/User 1 - N Booking
Booking 1 - N BookingActivity
```

Important booking statuses:

```text
PENDING
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

Booking numbers should be human-readable and unique:

```text
SF-1001
SF-1002
SF-1003
```

## API

Planned REST endpoints:

```text
POST   /api/public/bookings

POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/services

GET    /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id
DELETE /api/bookings/:id

PATCH  /api/bookings/:id/assign
PATCH  /api/bookings/:id/status

GET    /api/staff
GET    /api/staff/me/bookings

GET    /api/dashboard
GET    /api/schedule
```

Admin endpoints must be protected. Staff endpoints must enforce assigned-job isolation.

## Local Development

Install dependencies after the frontend and backend packages are created:

```bash
npm install
cd backend
npm install
```

Create environment files from the example:

```bash
cp .env.example .env
```

Run database migrations and seed data after Prisma is implemented:

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

## Testing

Quality gates planned for the finished application:

Frontend:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend
npm run typecheck
npm run lint
npm test
```

Minimum test coverage should include authentication, role authorization, staff job isolation, public booking validation, status transitions, scheduling conflicts, public booking transactions, and dashboard metrics.

## Deployment

Target deployment: Vercel.

Required production setup:

- MySQL database
- secure JWT secret
- HTTP-only secure cookies
- production CORS origin
- environment variables configured in Vercel
- real screenshot saved to `public/serviceflow-dashboard.webp`

## Demo Data

Seed data should use fictional demo information only.

Planned demo services:

- Standard Home Cleaning - $120 - 120 minutes
- Deep Cleaning - $220 - 180 minutes
- Office Cleaning - $180 - 150 minutes
- Move-Out Cleaning - $320 - 240 minutes

Planned demo staff:

- James Wilson
- Sophia Carter
- Daniel Brooks

Use fictional email domains such as `@example.test`. Do not commit real secrets or private credentials.

