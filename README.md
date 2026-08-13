# ServiceFlow

Booking & Job Management for Service Businesses

[Live Demo](#) | [Repository](#)

ServiceFlow is a full-stack booking and job management application for service businesses, featuring public booking intake, staff assignment, scheduling conflict detection, role-based dashboards, job status workflows, and database-backed operations.

Production screenshot: pending until the application is deployed. The real dashboard screenshot must be saved as `public/serviceflow-dashboard.webp` and used here after deployment.

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
- Booking detail view with customer, service, assignment, instructions, and activity history
- Staff assignment with backend scheduling conflict detection
- Controlled booking status transitions
- Simple daily or weekly schedule view
- Booking activity audit trail
- Loading, empty, error, and toast feedback states
- Mobile-friendly public booking page
- Responsive admin and staff screens
- Production-oriented security, validation, and error handling
- Integration tests for core business rules

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

Planned frontend structure:

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

Planned backend structure:

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

Planned relational models:

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

Install dependencies after package files are implemented:

```bash
npm install
cd backend
npm install
```

Create local environment files:

```bash
cp .env.example .env
```

Run Prisma migrations and seed data after the backend is implemented:

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
- past booking dates are rejected
- invalid status transitions are rejected
- overlapping staff assignment returns a conflict response
- valid public booking creates Customer, Booking, and BookingActivity
- dashboard metrics derive from database records where practical

Quality gates before completion:

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

Do not suppress legitimate errors just to make commands pass.

## Deployment

Target deployment:

```text
Vercel
```

Production requirements:

- deployed frontend
- deployed backend/API
- managed MySQL database
- secure production environment variables
- HTTP-only secure cookies
- production CORS origin
- real screenshot saved to `public/serviceflow-dashboard.webp`
- README updated with real Live Demo and Repository links

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

Use clearly fictional email domains such as `@example.test`.

Do not expose real production passwords in source code. Demo credentials may be documented only when there is a safe portfolio demo mechanism.

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

