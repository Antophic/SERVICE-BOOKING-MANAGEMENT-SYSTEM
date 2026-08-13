# Suggested GitHub Issues

Use these issue bodies when publishing the initial GitHub backlog. They follow the five required project phases from the specification.

## 1. Phase 1 - Foundation: structure, database, auth, and authorization

Create the foundational full-stack architecture for ServiceFlow.

Acceptance checklist:

- [ ] React + Vite + TypeScript frontend exists
- [ ] Node.js + Express.js + TypeScript backend exists
- [ ] Frontend folders follow `src/api`, `src/components`, `src/hooks`, `src/utils`, `src/constants`, `src/pages`, and `src/types`
- [ ] Backend folders follow `backend/src/config`, `constants`, `controllers`, `middlewares`, `repositories`, `routes`, `services`, `types`, `utils`, and `validators`
- [ ] MySQL and Prisma are configured
- [ ] User, Customer, Service, Booking, and BookingActivity models exist
- [ ] Roles are limited to `ADMIN` and `STAFF`
- [ ] Booking statuses are limited to `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`
- [ ] Useful booking indexes are added
- [ ] Demo services, staff, and a small set of bookings are seeded
- [ ] Login, logout, and session restore work
- [ ] JWT is stored in an HTTP-only cookie
- [ ] Passwords are hashed with bcrypt
- [ ] Admin and staff authorization are enforced on the backend

## 2. Phase 2 - Core Booking: public intake, booking CRUD, numbers, and status workflow

Build the public-to-internal booking workflow.

Acceptance checklist:

- [ ] Public `/book` route exists
- [ ] Customer can submit a booking without an account
- [ ] Active services populate from the database
- [ ] Name, email, phone, address, service, date, and time are validated
- [ ] Past bookings are rejected
- [ ] Duplicate submissions are disabled while creating a booking
- [ ] Public booking creates Customer, Booking, and BookingActivity in a transaction
- [ ] Booking numbers use the `SF-1001` pattern and are unique
- [ ] Admin can view, edit, cancel, and inspect bookings
- [ ] Booking detail shows booking, customer, assignment, instructions, and activity history
- [ ] Backend validates all status transitions
- [ ] Invalid transitions such as `COMPLETED -> PENDING` are rejected

## 3. Phase 3 - Operations: assignment, conflict detection, dashboard, search, filters, and staff workflow

Build the operational workflow that proves this is more than CRUD.

Acceptance checklist:

- [ ] Admin can assign a staff member to a booking
- [ ] Assignment writes `STAFF_ASSIGNED` activity
- [ ] Backend detects overlapping assignments for the same staff member
- [ ] Overlapping assignment returns a professional conflict response
- [ ] Non-overlapping assignment succeeds
- [ ] Operations Dashboard shows Today's Bookings, Pending Requests, Jobs In Progress, Completed Today, and Today's Revenue
- [ ] Dashboard values come from the database
- [ ] Booking search supports booking number, customer name, customer email, and phone
- [ ] Filters support status, service, staff, and date
- [ ] Search and filters work together with server-side pagination
- [ ] Search input uses a 300-400 ms debounce
- [ ] Staff dashboard shows Today and Upcoming assigned jobs
- [ ] Staff can open assigned job detail
- [ ] Staff can start Confirmed jobs and complete In Progress jobs
- [ ] Staff cannot access or operate unrelated jobs

## 4. Phase 4 - Product Quality: activity, states, responsive UI, accessibility, and security review

Polish ServiceFlow into a serious operations SaaS portfolio project.

Acceptance checklist:

- [ ] Activity log is visible and chronological
- [ ] Loading states exist for dashboard, bookings, status updates, assignment, and booking creation
- [ ] Empty states exist for no bookings today, no assigned jobs, and no search results
- [ ] Friendly production error messages are shown
- [ ] Toast feedback exists for booking created, staff assigned, booking confirmed, job started, job completed, and booking cancelled
- [ ] Public booking page works well on mobile
- [ ] Admin tables reorganize into readable mobile layouts
- [ ] No horizontal overflow at 375px, 390px, 430px, 768px, 1024px, and desktop widths
- [ ] UI uses clean white surfaces, restrained neutral colors, subtle borders, clear typography, and professional status badges
- [ ] Forms have labels and inline validation messages
- [ ] Keyboard navigation and visible focus states work
- [ ] Dialogs and icon-only controls are accessible
- [ ] Helmet, CORS, body limits, rate limits, cookie settings, validation, authorization, and error handling are reviewed
- [ ] CSRF approach for authenticated mutations is documented

## 5. Phase 5 - Engineering Quality: tests, quality gates, deployment, screenshot, and README

Validate, deploy, and present the finished portfolio project.

Acceptance checklist:

- [ ] Unauthenticated admin route tests return 401
- [ ] Staff admin-endpoint authorization tests return 403
- [ ] Staff A and Staff B record isolation test is implemented
- [ ] Past booking validation test is implemented
- [ ] Invalid status transition test is implemented
- [ ] Scheduling conflict test returns 409 for overlap
- [ ] Scheduling non-conflict test succeeds
- [ ] Public booking transaction test creates Customer, Booking, and Activity
- [ ] Dashboard metric tests verify database-backed values where practical
- [ ] Frontend `npm run typecheck` passes
- [ ] Frontend `npm run lint` passes
- [ ] Frontend `npm test` passes
- [ ] Frontend `npm run build` passes
- [ ] Backend `npm run typecheck` passes
- [ ] Backend `npm run lint` passes
- [ ] Backend `npm test` passes
- [ ] Vercel deployment is configured
- [ ] Required production environment variables are documented
- [ ] Real deployed screenshot is saved as `public/serviceflow-dashboard.webp`
- [ ] README includes final Live Demo and Repository links
- [ ] README uses the real production screenshot

