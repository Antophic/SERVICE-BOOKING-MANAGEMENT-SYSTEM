# API Plan

Base path:

```text
/api
```

## Public

```text
POST /public/bookings
```

Creates a public booking request without requiring an account.

Expected behavior:

- validates customer and booking input
- rejects bookings in the past
- loads service duration and base price from the database
- creates or reuses a customer record
- creates a booking with `PENDING` status
- creates a `BOOKING_CREATED` activity record
- runs related writes in a transaction
- applies public rate limiting

## Auth

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

Expected behavior:

- verifies bcrypt password hashes
- stores JWT in an HTTP-only cookie
- restores the authenticated user safely
- hides password hashes and secrets from responses

## Services

```text
GET /services
```

Returns active services for public booking and admin filters.

## Admin Bookings

```text
GET    /bookings
GET    /bookings/:id
PATCH  /bookings/:id
DELETE /bookings/:id
PATCH  /bookings/:id/assign
PATCH  /bookings/:id/status
```

Expected behavior:

- admin-only access for full booking management
- server-side search, filters, and pagination
- safe updates with Zod validation
- assignment conflict detection before staff assignment
- activity log writes in transactions
- controlled status transitions

## Staff

```text
GET /staff
GET /staff/me/bookings
GET /staff/me/bookings/:id
PATCH /staff/me/bookings/:id/status
```

Expected behavior:

- admin can view staff list
- staff can only view assigned jobs
- staff can only update allowed statuses for assigned jobs
- unrelated job access returns an authorization error

## Dashboard and Schedule

```text
GET /dashboard
GET /schedule
```

Expected behavior:

- dashboard metrics come from database queries
- schedule shows booked time slots by staff
- no hardcoded operational statistics

