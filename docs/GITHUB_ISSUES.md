# Suggested GitHub Issues

Use these issue bodies when publishing the initial GitHub backlog.

## 1. Phase 1 - Project foundation and database schema

Create the foundational full-stack structure for ServiceFlow.

Acceptance checklist:

- [ ] React + Vite + TypeScript frontend exists
- [ ] Node.js + Express + TypeScript backend exists
- [ ] Prisma is configured for MySQL
- [ ] User, Customer, Service, Booking, and BookingActivity models are implemented
- [ ] Required enums and indexes are added
- [ ] Demo services and staff are seeded with fictional data
- [ ] `.env.example` documents all required variables

## 2. Phase 2 - Authentication and authorization

Implement secure internal authentication and role-based access.

Acceptance checklist:

- [ ] Login, logout, and session restore endpoints exist
- [ ] JWT is stored in an HTTP-only cookie
- [ ] Passwords are hashed with bcrypt
- [ ] Admin-only routes reject unauthenticated and staff requests
- [ ] Staff routes enforce assigned-job record isolation
- [ ] Sensitive fields and stack traces are never exposed

## 3. Phase 3 - Public booking request flow

Build the public customer booking workflow.

Acceptance checklist:

- [ ] `/book` public page exists
- [ ] Active services populate from the API
- [ ] Customer and schedule fields are validated
- [ ] Past bookings are rejected
- [ ] Booking numbers use `SF-1001` style references
- [ ] Customer, Booking, and BookingActivity are created in a transaction
- [ ] Public booking submission has rate limiting
- [ ] Confirmation message displays the generated booking number

## 4. Phase 4 - Admin operations dashboard and booking management

Build admin tools for daily operations.

Acceptance checklist:

- [ ] Operations Dashboard displays database-backed KPIs
- [ ] Booking list supports search, filters, and server-side pagination
- [ ] Booking detail view shows customer, service, assignment, instructions, and activity
- [ ] Admin can edit, cancel, assign staff, and update booking status
- [ ] Staff list is available without adding HR/payroll scope
- [ ] Loading, empty, and error states are implemented

## 5. Phase 5 - Staff dashboard and job status workflow

Build the staff-facing assigned job workflow.

Acceptance checklist:

- [ ] Staff can log in
- [ ] Staff see only their assigned jobs
- [ ] Jobs are split into Today and Upcoming
- [ ] Job detail shows customer contact, address, service, instructions, and schedule
- [ ] Staff can start Confirmed jobs
- [ ] Staff can complete In Progress jobs
- [ ] Staff cannot operate unrelated jobs

## 6. Phase 6 - Scheduling conflict detection and schedule view

Implement the scheduling logic that makes ServiceFlow more than CRUD.

Acceptance checklist:

- [ ] Backend calculates scheduled end time from start time and duration
- [ ] Assigning overlapping jobs to the same staff member is rejected
- [ ] Conflict response is professional and documented
- [ ] Non-overlapping assignment succeeds
- [ ] Daily or weekly schedule endpoint exists
- [ ] Simple schedule view shows jobs by staff
- [ ] Demo timezone behavior is documented

## 7. Phase 7 - Security, accessibility, and responsive polish

Harden the product experience for portfolio-quality delivery.

Acceptance checklist:

- [ ] Helmet, CORS, body limits, cookies, rate limiting, and centralized error handling are configured
- [ ] Authenticated mutating requests follow the documented CSRF approach
- [ ] Forms have labels and inline validation messages
- [ ] Keyboard navigation and visible focus states work
- [ ] Public booking page works well on phone widths
- [ ] Admin tables adapt into readable mobile layouts
- [ ] Toast notifications are consistent

## 8. Phase 8 - Tests, build, deployment, and README screenshot

Finish engineering quality gates and portfolio presentation.

Acceptance checklist:

- [ ] Auth tests cover 401 behavior
- [ ] Authorization tests cover staff/admin boundaries
- [ ] Record isolation test covers Staff A and Staff B assigned jobs
- [ ] Booking validation tests reject past dates
- [ ] Status workflow tests reject invalid transitions
- [ ] Scheduling tests cover overlap and non-overlap assignment
- [ ] Public booking test creates Customer, Booking, and Activity
- [ ] Dashboard tests verify database-backed metrics where practical
- [ ] Typecheck, lint, test, and production build pass
- [ ] App is deployed to Vercel
- [ ] Real screenshot is saved to `public/serviceflow-dashboard.webp`
- [ ] README contains live demo, repository link, and final screenshot

