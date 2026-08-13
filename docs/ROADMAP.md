# ServiceFlow Roadmap

This roadmap converts the product specification into implementation phases suitable for GitHub issues.

## Phase 1 - Foundation

- [ ] Create frontend project with React, Vite, and TypeScript
- [ ] Create backend project with Node.js, Express.js, and TypeScript
- [ ] Configure shared project conventions and scripts
- [ ] Add Prisma and MySQL configuration
- [ ] Implement database schema for users, customers, services, bookings, and booking activity
- [ ] Seed services, staff users, and demo bookings
- [ ] Add `.env.example` documentation

## Phase 2 - Authentication and Authorization

- [ ] Implement login, logout, and session restore
- [ ] Store JWT in HTTP-only cookies
- [ ] Hash passwords with bcrypt
- [ ] Add admin-only route protection
- [ ] Add staff-only and assigned-record authorization
- [ ] Centralize auth errors and safe response messages

## Phase 3 - Public Booking Workflow

- [ ] Build public `/book` route
- [ ] Load active services from the API
- [ ] Validate customer, service, schedule, address, and instructions with Zod
- [ ] Reject past bookings and invalid time values
- [ ] Generate unique public booking numbers
- [ ] Create customer, booking, and activity records in a transaction
- [ ] Add public booking rate limiting
- [ ] Show a professional booking confirmation message

## Phase 4 - Admin Operations

- [ ] Build Operations Dashboard
- [ ] Show database-backed KPI cards
- [ ] Implement booking list with server-side pagination
- [ ] Add search by booking number, customer name, customer email, and phone
- [ ] Add filters by status, service, staff, and date
- [ ] Add booking detail panel or page
- [ ] Add booking edit, cancel, assignment, and status actions
- [ ] Add activity timeline
- [ ] Add lightweight staff list

## Phase 5 - Staff Workflow

- [ ] Build staff login flow using shared auth
- [ ] Build My Jobs dashboard
- [ ] Split assigned jobs into Today and Upcoming
- [ ] Build staff job detail view
- [ ] Allow Confirmed -> In Progress for assigned jobs
- [ ] Allow In Progress -> Completed for assigned jobs
- [ ] Prevent staff from accessing unrelated jobs

## Phase 6 - Scheduling Logic

- [ ] Implement backend time range calculation
- [ ] Detect overlapping staff bookings before assignment
- [ ] Return documented conflict responses
- [ ] Add schedule endpoint
- [ ] Build simple daily or weekly schedule view
- [ ] Document timezone behavior

## Phase 7 - Product Quality

- [ ] Add loading states
- [ ] Add empty states
- [ ] Add friendly production error messages
- [ ] Add consistent toast notifications
- [ ] Make public booking excellent on mobile
- [ ] Make admin booking table usable on mobile
- [ ] Add focus states, labels, semantic controls, and accessible dialogs
- [ ] Review security headers, CORS, body limits, cookies, and error handling

## Phase 8 - Engineering Quality and Deployment

- [ ] Add integration tests for auth and authorization
- [ ] Add scheduling conflict tests
- [ ] Add public booking transaction tests
- [ ] Add status workflow tests
- [ ] Add dashboard metric tests where practical
- [ ] Run typecheck, lint, tests, and production build
- [ ] Configure Vercel deployment
- [ ] Capture real production screenshot
- [ ] Update README with live demo and screenshot

