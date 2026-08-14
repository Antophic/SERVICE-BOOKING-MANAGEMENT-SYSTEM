# ServiceFlow

Booking & Job Management for Service Businesses

[Live Demo](https://service-booking-management-system.vercel.app) | [Repository](https://github.com/Antophic/SERVICE-BOOKING-MANAGEMENT-SYSTEM)

ServiceFlow is a full-stack booking and job management application for service businesses, featuring public booking intake, staff assignment, scheduling conflict detection, role-based dashboards, job status workflows, and database-backed operations.

Production screenshot captured from the deployed Operations Dashboard:

![ServiceFlow production operations dashboard](public/serviceflow-dashboard.webp)

## Problem

Small service businesses often manage bookings through WhatsApp, phone calls, Google Forms, spreadsheets, email, and manual staff assignment. This creates missed bookings, duplicated bookings, unclear job status, scheduling conflicts, staff assignment confusion, and poor customer information tracking.

## Solution

ServiceFlow gives service businesses one focused operational workflow for turning customer booking requests into assigned, trackable jobs.

The application is suitable for:

- cleaning companies
- home maintenance services
- repair businesses
- landscaping companies
- mobile detailing businesses
- small field-service businesses

ServiceFlow is intentionally not a CRM, payroll system, enterprise field-service suite, or oversized SaaS product.

## Core Workflow

```text
Booking Request
-> Admin Review
-> Staff Assignment
-> Confirmation
-> Job Execution
-> Completion
```

## Features

- Public booking request form at `/book`
- Admin login, logout, and authenticated session restore
- Staff login with assigned-job isolation
- Operations Dashboard with database-backed metrics
- Booking list with search, filters, and server-side pagination
- Booking detail view with customer, service, assignment, edit panel, instructions, and activity history
- Staff assignment with backend scheduling conflict detection
- Rescheduling conflict detection when assigned bookings are edited
- Business-timezone-aware dashboard, schedule, and past-booking validation
- Controlled booking status transitions
- Simple daily or weekly schedule view
- Booking activity audit trail
- Loading, empty, error, and toast feedback states
- Mobile-friendly public booking page
- Responsive admin and staff screens
- Production-oriented security, validation, and error handling
- MemoryStore API tests for core business rules
- Optional Prisma/MySQL integration tests for production persistence behavior

## Architecture

```text
Frontend
  React
  Vite
  TypeScript

Backend
  Node.js
  Express.js
  TypeScript

Database
  MySQL
  Prisma ORM
```

Frontend structure:

```text
src/
  api/
  components/
  hooks/
  pages/
  types/
  utils/
```

Backend structure:

```text
backend/
  prisma/
  tests/
  src/
    config/
    middlewares/
    repositories/
    routes/
    types/
    utils/
    validators/
```

## Tech Stack

- React
- Vite
- TypeScript
- Node.js
- Express.js
- MySQL
- Prisma
- JWT
- HTTP-only cookies
- bcrypt
- Zod
- Helmet
- CORS
- Express rate limiting
- Vercel

This project intentionally does not use Next.js, Supabase, Firebase, Stripe, or unnecessary frameworks.

## Authorization Model

ServiceFlow supports three access concepts.

Public Customer:

- can submit a booking request
- does not need an account
- cannot see internal admin or staff data

Admin:

- can view all bookings
- can view all staff
- can assign staff
- can change booking status
- can edit and cancel bookings
- can view dashboard statistics
- can inspect schedules and conflicts

Staff:

- can log in
- can see only assigned jobs
- can view job/customer information needed for the job
- can update assigned jobs from Confirmed to In Progress
- can mark assigned jobs Completed
- cannot access unrelated jobs
- cannot assign staff
- cannot edit users
- cannot see system administration controls

Authorization must be enforced on the backend through role checks and record-level ownership checks. Hiding frontend controls is not enough.

## Scheduling Conflict Logic

Scheduling conflict detection is a core portfolio feature.

When an admin assigns a staff member to a booking, the backend must check whether that staff member already has another active booking during the same time range.

Time range calculation:

```text
scheduled start
+
estimated duration
=
scheduled end
```

Example conflict:

```text
Existing job: 10:00, duration 120 minutes
New job:      11:00, duration 90 minutes
```

Expected response:

```text
409 Conflict
James Wilson already has a booking during this time.
```

Conflict validation must live in backend service logic and must not be implemented only on the frontend.

Demo business timezone:

```text
Asia/Jakarta
```

## Database Schema

Relational models:

User:

- id
- name
- email
- passwordHash
- role
- createdAt
- updatedAt

Customer:

- id
- name
- email
- phone
- address
- createdAt
- updatedAt

Service:

- id
- name
- description
- basePrice
- estimatedDurationMinutes
- active
- createdAt
- updatedAt

Booking:

- id
- bookingNumber
- customerId
- serviceId
- assignedStaffId
- scheduledDate
- scheduledStartTime
- estimatedDurationMinutes
- address
- specialInstructions
- status
- quotedPrice
- createdAt
- updatedAt

BookingActivity:

- id
- bookingId
- userId
- action
- description
- createdAt

BookingCounter:

- name
- nextNumber
- updatedAt

Relationships:

```text
Customer 1 - N Booking
Service 1 - N Booking
Staff/User 1 - N Booking
Booking 1 - N BookingActivity
```

Statuses:

```text
PENDING
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

Booking numbers must be public-friendly and unique:

```text
SF-1001
SF-1002
SF-1003
```

Prices use USD and must be stored as numeric/Decimal values, never formatted strings. Frontend formatting should use `Intl.NumberFormat`.

## API

REST endpoints:

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
GET    /api/staff/me/bookings/:id
PATCH  /api/staff/me/bookings/:id/status

GET    /api/dashboard
GET    /api/schedule
```

Admin endpoints must be protected. Staff endpoints must return only records assigned to the authenticated staff user.

Admin booking list query support:

```text
page
limit
search
status
serviceId
staffId
date
```

Pagination response shape:

```text
page
limit
total
totalPages
items
```

## Status Workflow

Recommended main flow:

```text
PENDING
-> CONFIRMED
-> IN_PROGRESS
-> COMPLETED
```

Terminal alternative:

```text
CANCELLED
```

Admin allowed transitions:

- PENDING -> CONFIRMED
- PENDING -> CANCELLED
- CONFIRMED -> IN_PROGRESS
- CONFIRMED -> CANCELLED
- IN_PROGRESS -> COMPLETED

Staff allowed transitions for assigned jobs only:

- CONFIRMED -> IN_PROGRESS
- IN_PROGRESS -> COMPLETED

Invalid transitions, such as `COMPLETED -> PENDING`, must be rejected by backend validation.

## Security

Required security measures:

- Helmet
- CORS allowlist
- request body limits
- rate limiting
- public booking rate limiting
- Zod request validation
- bcrypt password hashing
- JWT verification
- HTTP-only auth cookies
- secure cookies in production
- role authorization
- record-level authorization
- centralized error handling
- safe production error messages
- no leaked password hashes, JWT secrets, database credentials, stack traces, or raw Prisma errors

Authenticated mutating requests should use the documented CSRF approach for the chosen cookie-based architecture. Public booking creation should be handled safely without blindly applying an internal-auth CSRF pattern where it does not fit.

## Local Development

Install dependencies:

```bash
npm install
cd backend
npm install
```

Run the API in local demo mode:

```bash
npm run dev:api
```

Run the frontend:

```bash
npm run dev
```

Local defaults:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:4000/api
```

The backend defaults to `DATA_STORE=memory` so the demo works without a local MySQL installation. For MySQL/Prisma mode, create a backend `.env` file with `DATA_STORE=prisma` and a valid `DATABASE_URL`, then run:

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

## Testing

Minimum automated tests:

- unauthenticated admin routes return 401
- staff cannot access admin-only endpoints
- Staff A cannot access Staff B assigned job
- past booking dates are rejected in the configured business timezone
- invalid status transitions are rejected
- overlapping staff assignment returns a conflict response
- overlapping assigned-booking reschedules return a conflict response
- valid public booking creates Customer, Booking, and BookingActivity
- public booking numbers remain unique under rapid booking creation
- dashboard metrics derive from database records where practical

The default test suite uses the in-memory repository so it can run without MySQL:

```bash
npm run test:all
```

Prisma/MySQL integration tests are opt-in. Set a dedicated disposable test database URL whose database name or host includes `test` or `integration`, apply the migrations to that database first, then run. The safety check only trusts the URL hostname or database name; username and password text do not count.

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/serviceflow_test npm --prefix backend run prisma:deploy
DATABASE_URL_TEST=mysql://USER:PASSWORD@HOST:PORT/serviceflow_test npm run test:integration
```

The integration suite intentionally skips when `DATABASE_URL_TEST` is missing.

Quality gates before completion:

```bash
npm run lint:all
npm run typecheck:all
npm run test:all
npm run test:integration
npm run build:all
```

Do not suppress legitimate errors just to make commands pass.

## Deployment

Target deployment: Vercel.

Production requirements:

- deployed frontend
- deployed backend/API
- managed MySQL database
- secure production environment variables
- HTTP-only secure cookies
- production CORS origin
- matching backend and frontend business timezone variables
- real screenshot saved to `public/serviceflow-dashboard.webp`
- README updated with real Live Demo and Repository links

Vercel configuration is included in `vercel.json`.

Current Vercel build flow:

```text
1. Install frontend and backend dependencies
2. Generate Prisma Client
3. Typecheck frontend and backend
4. Build frontend and backend
5. Apply Prisma migrations to MySQL
6. Seed fictional demo data
```

Set `VITE_API_URL=/api`, `BUSINESS_TIMEZONE=Asia/Jakarta`, and `VITE_BUSINESS_TIMEZONE=Asia/Jakarta` for production builds unless the API is deployed separately.

Full deployment instructions are in [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md).

## Demo Data

Seed fictional data only.

Demo services:

- Standard Home Cleaning - $120 - 120 minutes
- Deep Cleaning - $220 - 180 minutes
- Office Cleaning - $180 - 150 minutes
- Move-Out Cleaning - $320 - 240 minutes

Demo staff:

- James Wilson
- Sophia Carter
- Daniel Brooks

Demo login accounts for local/demo mode:

```text
Admin
admin@serviceflow.test
Password123!

Staff
james@serviceflow.test
Password123!
```

Use clearly fictional email domains such as `@example.test`.

Do not use these demo credentials as real production credentials.

## Scope Boundaries

Do not add:

- AI chatbot
- Stripe
- subscriptions
- payroll
- employee HR
- invoice generation
- real SMS
- WhatsApp integration
- Google Calendar sync
- email campaigns
- live GPS tracking
- maps
- route optimization
- customer mobile app
- advanced analytics
- multiple organizations
- enterprise permissions
