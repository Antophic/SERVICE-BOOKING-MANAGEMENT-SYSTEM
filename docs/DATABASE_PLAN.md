# Database Plan

ServiceFlow uses MySQL with Prisma. IDs may use UUID/CUID internally, while public booking references must use human-readable booking numbers such as `SF-1001`.

## Enums

```text
Role
  ADMIN
  STAFF

BookingStatus
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED

BookingActivityAction
  BOOKING_CREATED
  STAFF_ASSIGNED
  STATUS_CHANGED
  BOOKING_EDITED
  BOOKING_CANCELLED
  BOOKING_COMPLETED
```

## User

Fields:

- id
- name
- email
- passwordHash
- role
- createdAt
- updatedAt

Notes:

- email should be unique
- passwordHash must never be returned through the API
- registration should not be publicly available

## Customer

Fields:

- id
- name
- email
- phone
- address
- createdAt
- updatedAt

Notes:

- one customer can have many bookings
- public booking creation may create or reuse a customer record

## Service

Fields:

- id
- name
- description
- basePrice
- estimatedDurationMinutes
- active
- createdAt
- updatedAt

Notes:

- basePrice should be a Decimal/numeric database field
- currency formatting belongs in the frontend
- only active services should appear on the public booking form

## Booking

Fields:

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

Notes:

- bookingNumber should be unique
- assignedStaffId is nullable while a booking is pending or unassigned
- quotedPrice should be a Decimal/numeric database field
- do not cascade-delete important booking history accidentally

Recommended indexes:

- bookingNumber
- customerId
- serviceId
- assignedStaffId
- scheduledDate
- status

## BookingActivity

Fields:

- id
- bookingId
- userId
- action
- description
- createdAt

Notes:

- userId is nullable for public booking creation
- activity provides an auditable history
- booking activity should remain available even if a user record changes later

## Relationships

```text
Customer 1 - N Booking
Service 1 - N Booking
Staff/User 1 - N Booking
Booking 1 - N BookingActivity
```

## Seed Data

Services:

- Standard Home Cleaning, $120, 120 minutes
- Deep Cleaning, $220, 180 minutes
- Office Cleaning, $180, 150 minutes
- Move-Out Cleaning, $320, 240 minutes

Staff:

- James Wilson
- Sophia Carter
- Daniel Brooks

Demo bookings:

- at least one Pending booking
- at least one Confirmed booking
- at least one In Progress booking
- at least one Completed booking

Keep demo records small and useful. Do not seed hundreds of records.

