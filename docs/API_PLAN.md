# API Plan

Base path:

```text
/api
```

All protected routes must require authentication through an HTTP-only JWT cookie. Admin routes must require the `ADMIN` role. Staff routes must enforce both role checks and assigned-record ownership.

## Public Booking

```text
POST /public/bookings
```

Creates a booking request without requiring a customer account.

Request fields:

- name
- email
- phone
- serviceId
- scheduledDate
- scheduledStartTime
- address
- specialInstructions

Expected behavior:

- validates request body with Zod
- rejects invalid emails
- rejects empty services
- rejects bookings in the past
- rejects invalid time values
- loads service price and duration from the database
- creates or reuses the customer record
- generates a unique booking number
- creates a `PENDING` booking
- creates a `BOOKING_CREATED` activity record
- runs related writes in `prisma.$transaction()`
- applies public booking rate limiting
- returns only customer-safe booking confirmation data

## Auth

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

Expected behavior:

- validates login input with Zod
- verifies bcrypt password hashes
- stores JWT in an HTTP-only cookie
- uses secure cookies in production
- restores the authenticated user safely
- excludes password hashes from responses
- does not expose whether a specific email exists

## Services

```text
GET /services
```

Expected behavior:

- returns active services for public booking
- supports admin filter usage
- returns numeric price data, not formatted currency strings

## Admin Bookings

```text
GET    /bookings
GET    /bookings/:id
PATCH  /bookings/:id
DELETE /bookings/:id
PATCH  /bookings/:id/assign
PATCH  /bookings/:id/status
```

`GET /bookings` query parameters:

- page
- limit
- search
- status
- serviceId
- staffId
- date

Pagination response:

```text
{
  "page": 1,
  "limit": 10,
  "total": 42,
  "totalPages": 5,
  "items": []
}
```

Expected behavior:

- admin-only access
- search by booking number, customer name, customer email, and phone
- filters by status, service, staff, and date
- search and filters work together
- avoids obvious N+1 queries through Prisma includes/selects
- validates update payloads with Zod
- writes booking edits, assignment changes, cancellations, and status changes to activity history
- uses transactions for assignment plus activity and status change plus activity

## Staff Assignment

```text
PATCH /bookings/:id/assign
```

Expected behavior:

- admin-only access
- validates staff user exists and has role `STAFF`
- calculates target booking time range
- checks existing active bookings assigned to the same staff member
- rejects overlaps with `409 Conflict`
- creates `STAFF_ASSIGNED` activity
- can update status to `CONFIRMED` only through valid workflow rules

## Staff Jobs

```text
GET   /staff
GET   /staff/me/bookings
GET   /staff/me/bookings/:id
PATCH /staff/me/bookings/:id/status
```

Expected behavior:

- `GET /staff` is admin-only
- staff booking routes return only jobs assigned to the authenticated staff user
- staff cannot access unrelated bookings by ID
- staff can only update assigned jobs from `CONFIRMED` to `IN_PROGRESS`
- staff can only update assigned jobs from `IN_PROGRESS` to `COMPLETED`
- staff job updates create activity history

## Dashboard

```text
GET /dashboard
```

Admin-only endpoint.

Metrics:

- Today's Bookings
- Pending Requests
- Jobs In Progress
- Completed Today
- Today's Revenue

All metrics must come from database queries.

## Schedule

```text
GET /schedule
```

Admin-only endpoint.

Expected behavior:

- returns daily or weekly booked slots grouped by staff
- excludes cancelled bookings unless intentionally requested
- documents timezone behavior
- supports simple schedule UI without a large calendar library

## Error Responses

Use friendly, production-safe messages.

Examples:

```text
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

Do not expose raw stack traces, JWT details, password hashes, database credentials, or raw Prisma errors.

