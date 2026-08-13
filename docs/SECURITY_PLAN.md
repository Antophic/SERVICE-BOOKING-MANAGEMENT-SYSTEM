# Security Plan

ServiceFlow is an internal operations tool with one public booking endpoint. Security should be implemented on the backend and not treated as a frontend-only concern.

## Required Controls

- Helmet
- CORS allowlist
- request body size limits
- general API rate limiting
- stricter public booking rate limiting
- Zod validation
- bcrypt password hashing
- JWT verification
- HTTP-only auth cookies
- secure cookies in production
- same-site cookie settings
- role authorization
- record-level authorization
- centralized error handling
- safe production error messages

## Authentication

Required endpoints:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Rules:

- public registration is not allowed
- demo admin/staff users should come from seed data or another controlled process
- password hashes must never be returned
- failed login messages should not reveal whether a specific account exists

## Authorization

Admin:

- can manage all bookings
- can assign staff
- can view staff
- can view dashboard and schedule data

Staff:

- can only view assigned jobs
- can only update allowed statuses on assigned jobs
- cannot assign staff
- cannot view admin controls
- cannot edit users
- cannot access unrelated jobs by ID

## Public Booking Protection

`POST /api/public/bookings` should be public but protected from obvious abuse.

Recommended behavior:

- apply a moderate rate limit
- validate all input
- do not expose internal data in the response
- do not require customer authentication

## CSRF Approach

Because authenticated requests use HTTP-only cookies, mutating authenticated endpoints should follow a documented CSRF strategy.

Recommended implementation to evaluate during backend build:

- same-site cookies for baseline browser protection
- explicit CSRF token or double-submit token for authenticated state-changing requests when appropriate
- do not blindly apply an internal-auth CSRF pattern to the public booking endpoint if it harms legitimate unauthenticated booking flow

The final implementation should document the selected approach in backend docs and README notes.

## Error Handling

Production responses should use friendly messages such as:

```text
Unable to load bookings. Please try again.
This staff member already has a booking during the selected time.
Unable to update the booking.
```

Never expose:

- stack traces
- raw Prisma errors
- JWT secrets
- database credentials
- password hashes

