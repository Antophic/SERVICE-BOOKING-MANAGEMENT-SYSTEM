# Test Plan

ServiceFlow should include meaningful automated tests for business rules, authorization, and database-backed workflow behavior.

## Authentication

- unauthenticated admin routes return `401`
- invalid login returns a safe error message
- successful login sets an HTTP-only cookie
- logout clears the auth cookie
- session restore returns the authenticated user without passwordHash

## Authorization

- staff cannot access admin-only endpoints
- staff cannot list all bookings
- staff cannot assign other staff
- staff cannot edit users
- staff cannot access unrelated job details by guessing IDs

## Record Isolation

Scenario:

```text
Admin
Staff A
Staff B
Booking #1 -> Staff A
Booking #2 -> Staff B
```

Expected:

- Staff A sees Booking #1
- Staff A cannot operate Booking #2
- Staff B sees Booking #2
- Staff B cannot operate Booking #1
- Admin sees both

## Booking Validation

- valid public booking creates Customer, Booking, and BookingActivity
- invalid email is rejected
- empty service is rejected
- past booking date is rejected
- invalid time value is rejected
- missing address is rejected

## Status Workflow

Allowed admin transitions:

- PENDING -> CONFIRMED
- PENDING -> CANCELLED
- CONFIRMED -> IN_PROGRESS
- CONFIRMED -> CANCELLED
- IN_PROGRESS -> COMPLETED

Allowed staff transitions for assigned jobs:

- CONFIRMED -> IN_PROGRESS
- IN_PROGRESS -> COMPLETED

Rejected transitions:

- COMPLETED -> PENDING
- CANCELLED -> IN_PROGRESS
- staff updates on unrelated jobs

## Scheduling Conflict

Scenario:

```text
Staff A

Booking 1:
10:00
Duration 120 minutes

Booking 2:
11:00
Duration 90 minutes
```

Expected:

```text
409 Conflict
```

Then test:

```text
Booking 3:
13:00
Duration 60 minutes
```

Expected:

```text
assignment succeeds
```

## Dashboard

Where practical, verify that these metrics come from database records:

- Today's Bookings
- Pending Requests
- Jobs In Progress
- Completed Today
- Today's Revenue

## Manual Flow

Full manual test flow before declaring the project complete:

1. Customer opens public booking page.
2. Customer selects Deep Cleaning.
3. Customer submits booking.
4. Booking appears as Pending.
5. Admin logs in.
6. Admin sees Pending booking.
7. Admin opens booking.
8. Admin assigns James Wilson.
9. System confirms there is no scheduling conflict.
10. Admin confirms booking.
11. James logs in.
12. James sees the assigned job.
13. James starts job.
14. Status becomes In Progress.
15. James marks job Completed.
16. Admin dashboard metrics update.
17. Revenue metric updates.
18. Booking activity shows full history.

Conflict manual test:

1. Create overlapping booking.
2. Attempt to assign James.
3. Backend rejects assignment.
4. UI shows conflict message.
5. Assign Sophia instead.
6. Assignment succeeds.

