# ServiceFlow Roadmap

This roadmap follows the required priority order from the project specification.

## Phase 1 - Foundation

1. Project structure
2. Database schema
3. Seed services/staff
4. Backend API architecture
5. Authentication
6. Authorization

Acceptance checklist:

- [ ] Frontend structure exists under `src/`
- [ ] Backend structure exists under `backend/src/`
- [ ] MySQL and Prisma are configured
- [ ] User, Customer, Service, Booking, and BookingActivity models exist
- [ ] Role, status, and activity enums are defined
- [ ] Useful indexes are added for booking queries
- [ ] Demo services, staff, and bookings are seeded
- [ ] Admin/staff accounts are controlled through seed data or another safe internal mechanism
- [ ] Auth middleware verifies JWT cookies
- [ ] Authorization middleware enforces role and record access

## Phase 2 - Core Booking

7. Public booking form
8. Booking CRUD
9. Booking number generation
10. Status workflow

Acceptance checklist:

- [ ] `/book` exists and is publicly accessible
- [ ] Active services load from the database
- [ ] Customer fields are validated
- [ ] Schedule fields reject invalid dates and times
- [ ] Public booking creates Customer, Booking, and BookingActivity in a transaction
- [ ] Booking numbers use the `SF-1001` pattern and are unique
- [ ] Admin can view, edit, cancel, and inspect bookings
- [ ] Backend validates allowed status transitions

## Phase 3 - Operations

11. Staff assignment
12. Scheduling conflict detection
13. Admin dashboard
14. Search/filter/pagination
15. Staff dashboard

Acceptance checklist:

- [ ] Admin can assign staff to bookings
- [ ] Assignment creates activity history
- [ ] Backend rejects overlapping staff assignments
- [ ] Dashboard KPIs come from database records
- [ ] Search works by booking number, customer name, customer email, and phone
- [ ] Filters work by status, service, staff, and date
- [ ] Search and filters work together with server-side pagination
- [ ] Staff can view only assigned jobs
- [ ] Staff can start and complete assigned jobs
- [ ] Simple schedule view shows booked slots by staff

## Phase 4 - Product Quality

16. Activity log
17. Loading/error states
18. Responsive design
19. Accessibility
20. Security review

Acceptance checklist:

- [ ] Booking activity history is visible in the booking detail view
- [ ] Loading states exist for dashboard, bookings, status updates, staff assignment, and booking creation
- [ ] Empty states exist for no bookings today, no assigned jobs, and no search results
- [ ] Friendly production errors are shown instead of raw backend errors
- [ ] Toast notifications are consistent
- [ ] Duplicate submissions are disabled while requests are running
- [ ] Public booking page works well on phone widths
- [ ] Admin tables adapt to mobile cards or readable layouts
- [ ] Forms have labels, visible focus states, accessible dialogs, and semantic buttons
- [ ] Security headers, CORS, cookies, rate limits, body limits, CSRF approach, and error handling are reviewed

## Phase 5 - Engineering Quality

21. Integration tests
22. Typecheck
23. Lint
24. Production build
25. README
26. Production screenshot
27. Deploy

Acceptance checklist:

- [ ] Auth tests verify unauthenticated admin routes return 401
- [ ] Authorization tests verify staff cannot access admin endpoints
- [ ] Record-isolation tests verify Staff A and Staff B cannot operate each other's jobs
- [ ] Booking validation tests reject past dates
- [ ] Status workflow tests reject invalid transitions
- [ ] Scheduling tests cover overlapping and non-overlapping assignment
- [ ] Public booking test verifies Customer, Booking, and Activity creation
- [ ] Dashboard metric tests verify database-derived values where practical
- [ ] Frontend typecheck, lint, tests, and build pass
- [ ] Backend typecheck, lint, and tests pass
- [ ] Vercel deployment is configured
- [ ] A real production screenshot is captured
- [ ] README contains final Live Demo, Repository, and screenshot

