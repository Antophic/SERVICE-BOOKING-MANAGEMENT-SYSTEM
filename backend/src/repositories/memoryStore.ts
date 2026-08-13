import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";
import { bookingsOverlap, isPastBookingDateTime, sortBySchedule, todayDateString } from "../utils/time.js";
import { toPublicUser } from "../utils/publicUser.js";
import type {
  Booking,
  BookingActivity,
  BookingActivityAction,
  BookingDetail,
  BookingFilters,
  BookingListItem,
  BookingStatus,
  CreatePublicBookingInput,
  Customer,
  DashboardMetrics,
  PaginatedResult,
  ScheduleSlot,
  Service,
  UpdateBookingInput,
  User,
} from "../types/domain.js";
import type { Actor, DataStore } from "./types.js";

const activeConflictStatuses: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

const adminTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const staffTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [],
  CONFIRMED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class MemoryStore implements DataStore {
  private users: User[] = [];
  private customers: Customer[] = [];
  private services: Service[] = [];
  private bookings: Booking[] = [];
  private activities: BookingActivity[] = [];

  constructor() {
    this.seed();
  }

  async ready() {}

  async disconnect() {}

  async findUserByEmail(email: string) {
    return this.users.find((user) => user.email === email.toLowerCase()) ?? null;
  }

  async findUserById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async listServices(activeOnly = true) {
    return this.services.filter((service) => (activeOnly ? service.active : true));
  }

  async createPublicBooking(input: CreatePublicBookingInput) {
    if (isPastBookingDateTime(input.scheduledDate, input.scheduledStartTime)) {
      throw new ApiError(422, "Bookings cannot be scheduled in the past.");
    }

    const service = this.services.find((candidate) => candidate.id === input.serviceId && candidate.active);
    if (!service) {
      throw new ApiError(422, "Select a valid service.");
    }

    let customer = this.customers.find(
      (candidate) => candidate.email === input.email && candidate.phone === input.phone,
    );

    if (!customer) {
      customer = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.customers.push(customer);
    }

    const booking: Booking = {
      id: randomUUID(),
      bookingNumber: this.nextBookingNumber(),
      customerId: customer.id,
      serviceId: service.id,
      assignedStaffId: null,
      scheduledDate: input.scheduledDate,
      scheduledStartTime: input.scheduledStartTime,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
      address: input.address,
      specialInstructions: input.specialInstructions?.trim() || null,
      status: "PENDING",
      quotedPrice: service.basePrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bookings.push(booking);
    this.addActivity(booking.id, null, "BOOKING_CREATED", "Booking request created.");

    return this.toDetail(booking);
  }

  async listBookings(filters: BookingFilters): Promise<PaginatedResult<BookingListItem>> {
    const filtered = this.applyFilters(this.bookings, filters);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / filters.limit));
    const start = (filters.page - 1) * filters.limit;
    const items = sortBySchedule(filtered).slice(start, start + filters.limit).map((booking) => this.toListItem(booking));

    return {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      items,
    };
  }

  async getBookingById(id: string) {
    const booking = this.bookings.find((candidate) => candidate.id === id);
    return booking ? this.toDetail(booking) : null;
  }

  async updateBooking(id: string, input: UpdateBookingInput, actor: Actor) {
    const booking = this.requireBooking(id);

    if (input.scheduledDate || input.scheduledStartTime) {
      const targetDate = input.scheduledDate ?? booking.scheduledDate;
      const targetTime = input.scheduledStartTime ?? booking.scheduledStartTime;
      if (isPastBookingDateTime(targetDate, targetTime)) {
        throw new ApiError(422, "Bookings cannot be scheduled in the past.");
      }
    }

    if (input.serviceId) {
      const service = this.services.find((candidate) => candidate.id === input.serviceId && candidate.active);
      if (!service) {
        throw new ApiError(422, "Select a valid service.");
      }
      booking.serviceId = service.id;
      booking.estimatedDurationMinutes = input.estimatedDurationMinutes ?? service.estimatedDurationMinutes;
      booking.quotedPrice = input.quotedPrice ?? service.basePrice;
    }

    Object.assign(booking, {
      scheduledDate: input.scheduledDate ?? booking.scheduledDate,
      scheduledStartTime: input.scheduledStartTime ?? booking.scheduledStartTime,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? booking.estimatedDurationMinutes,
      address: input.address ?? booking.address,
      specialInstructions:
        input.specialInstructions === undefined ? booking.specialInstructions : input.specialInstructions,
      quotedPrice: input.quotedPrice ?? booking.quotedPrice,
      updatedAt: new Date().toISOString(),
    });

    this.addActivity(booking.id, actor.id, "BOOKING_EDITED", "Booking details updated.");
    return this.toDetail(booking);
  }

  async assignStaff(id: string, staffId: string, actor: Actor) {
    const booking = this.requireBooking(id);
    const staff = this.users.find((user) => user.id === staffId && user.role === "STAFF");

    if (!staff) {
      throw new ApiError(422, "Select a valid staff member.");
    }

    const conflict = this.bookings.find(
      (candidate) =>
        candidate.id !== booking.id &&
        candidate.assignedStaffId === staff.id &&
        candidate.scheduledDate === booking.scheduledDate &&
        activeConflictStatuses.includes(candidate.status) &&
        bookingsOverlap(
          candidate.scheduledStartTime,
          candidate.estimatedDurationMinutes,
          booking.scheduledStartTime,
          booking.estimatedDurationMinutes,
        ),
    );

    if (conflict) {
      throw new ApiError(409, `${staff.name} already has a booking during this time.`);
    }

    booking.assignedStaffId = staff.id;
    booking.updatedAt = new Date().toISOString();
    this.addActivity(booking.id, actor.id, "STAFF_ASSIGNED", `${staff.name} assigned to booking.`);

    return this.toDetail(booking);
  }

  async updateBookingStatus(id: string, status: BookingStatus, actor: Actor) {
    const booking = this.requireBooking(id);

    if (actor.role === "STAFF" && booking.assignedStaffId !== actor.id) {
      throw new ApiError(403, "You can only update jobs assigned to you.");
    }

    const allowed = actor.role === "ADMIN" ? adminTransitions[booking.status] : staffTransitions[booking.status];

    if (!allowed.includes(status)) {
      throw new ApiError(422, `Cannot change booking from ${booking.status} to ${status}.`);
    }

    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    const action: BookingActivityAction =
      status === "COMPLETED" ? "BOOKING_COMPLETED" : status === "CANCELLED" ? "BOOKING_CANCELLED" : "STATUS_CHANGED";

    this.addActivity(booking.id, actor.id, action, `Booking status changed to ${status}.`);
    return this.toDetail(booking);
  }

  async listStaff() {
    return this.users
      .filter((user) => user.role === "STAFF")
      .map((user) => ({
        ...toPublicUser(user),
        availability: this.staffAvailability(user.id),
      }));
  }

  async listAssignedBookings(staffId: string) {
    return sortBySchedule(this.bookings)
      .filter((booking) => booking.assignedStaffId === staffId && booking.status !== "CANCELLED")
      .map((booking) => this.toDetail(booking));
  }

  async getAssignedBooking(staffId: string, bookingId: string) {
    const booking = this.bookings.find((candidate) => candidate.id === bookingId);
    if (!booking) {
      return null;
    }

    if (booking.assignedStaffId !== staffId) {
      throw new ApiError(403, "You can only access jobs assigned to you.");
    }

    return this.toDetail(booking);
  }

  async getDashboardMetrics(today: string): Promise<DashboardMetrics> {
    const todaysBookings = this.bookings.filter((booking) => booking.scheduledDate === today).length;
    const pendingRequests = this.bookings.filter((booking) => booking.status === "PENDING").length;
    const jobsInProgress = this.bookings.filter((booking) => booking.status === "IN_PROGRESS").length;
    const completedTodayBookings = this.bookings.filter(
      (booking) => booking.scheduledDate === today && booking.status === "COMPLETED",
    );

    return {
      todaysBookings,
      pendingRequests,
      jobsInProgress,
      completedToday: completedTodayBookings.length,
      todaysRevenue: completedTodayBookings.reduce((sum, booking) => sum + booking.quotedPrice, 0),
    };
  }

  async getSchedule(date = todayDateString()): Promise<ScheduleSlot[]> {
    const staff = await this.listStaff();
    return staff.map((member) => ({
      staff: member,
      bookings: sortBySchedule(this.bookings)
        .filter(
          (booking) =>
            booking.assignedStaffId === member.id &&
            booking.scheduledDate === date &&
            booking.status !== "CANCELLED",
        )
        .map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          scheduledDate: booking.scheduledDate,
          scheduledStartTime: booking.scheduledStartTime,
          estimatedDurationMinutes: booking.estimatedDurationMinutes,
          status: booking.status,
          customerName: this.requireCustomer(booking.customerId).name,
          serviceName: this.requireService(booking.serviceId).name,
        })),
    }));
  }

  private seed() {
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync("Password123!", 12);
    const today = todayDateString();
    const tomorrow = todayDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));

    this.users = [
      { id: "user-admin", name: "Avery Morgan", email: "admin@serviceflow.test", passwordHash, role: "ADMIN", createdAt: now, updatedAt: now },
      { id: "staff-james", name: "James Wilson", email: "james@serviceflow.test", passwordHash, role: "STAFF", createdAt: now, updatedAt: now },
      { id: "staff-sophia", name: "Sophia Carter", email: "sophia@serviceflow.test", passwordHash, role: "STAFF", createdAt: now, updatedAt: now },
      { id: "staff-daniel", name: "Daniel Brooks", email: "daniel@serviceflow.test", passwordHash, role: "STAFF", createdAt: now, updatedAt: now },
    ];

    this.services = [
      {
        id: "service-standard",
        name: "Standard Home Cleaning",
        description: "Routine cleaning for homes and apartments.",
        basePrice: 120,
        estimatedDurationMinutes: 120,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "service-deep",
        name: "Deep Cleaning",
        description: "Detailed cleaning for kitchens, bathrooms, and high-use areas.",
        basePrice: 220,
        estimatedDurationMinutes: 180,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "service-office",
        name: "Office Cleaning",
        description: "Cleaning for small offices and workspaces.",
        basePrice: 180,
        estimatedDurationMinutes: 150,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "service-move-out",
        name: "Move-Out Cleaning",
        description: "Final cleaning for rental and property handover.",
        basePrice: 320,
        estimatedDurationMinutes: 240,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.customers = [
      { id: "customer-sarah", name: "Sarah Mitchell", email: "sarah@example.test", phone: "+1 555 0101", address: "42 Oak Street, Springfield", createdAt: now, updatedAt: now },
      { id: "customer-emma", name: "Emma Carter", email: "emma@example.test", phone: "+1 555 0102", address: "18 Maple Avenue, Brookfield", createdAt: now, updatedAt: now },
      { id: "customer-noah", name: "Noah Bennett", email: "noah@example.test", phone: "+1 555 0103", address: "900 Market Road, Suite 210", createdAt: now, updatedAt: now },
      { id: "customer-olivia", name: "Olivia Hayes", email: "olivia@example.test", phone: "+1 555 0104", address: "75 Pine Lane, Riverton", createdAt: now, updatedAt: now },
    ];

    this.bookings = [
      this.booking("booking-1041", "SF-1041", "customer-sarah", "service-deep", "staff-james", today, "10:00", "IN_PROGRESS", 220, "Focus on kitchen appliances and upstairs bathroom."),
      this.booking("booking-1042", "SF-1042", "customer-emma", "service-standard", "staff-sophia", today, "13:30", "CONFIRMED", 120, "Customer requested eco-friendly products."),
      this.booking("booking-1043", "SF-1043", "customer-noah", "service-office", null, tomorrow, "09:00", "PENDING", 180, "Access code will be shared after confirmation."),
      this.booking("booking-1044", "SF-1044", "customer-olivia", "service-move-out", "staff-james", today, "08:00", "COMPLETED", 320, "Final clean before property handover."),
    ];

    this.bookings.forEach((booking) => {
      this.addActivity(booking.id, null, "BOOKING_CREATED", "Booking request created.");
      if (booking.assignedStaffId) {
        this.addActivity(booking.id, "user-admin", "STAFF_ASSIGNED", `${this.requireUser(booking.assignedStaffId).name} assigned to booking.`);
      }
      if (booking.status !== "PENDING") {
        this.addActivity(booking.id, "user-admin", "STATUS_CHANGED", `Booking status changed to ${booking.status}.`);
      }
    });
  }

  private booking(
    id: string,
    bookingNumber: string,
    customerId: string,
    serviceId: string,
    assignedStaffId: string | null,
    scheduledDate: string,
    scheduledStartTime: string,
    status: BookingStatus,
    quotedPrice: number,
    specialInstructions: string,
  ): Booking {
    const service = this.services.find((candidate) => candidate.id === serviceId);
    const now = new Date().toISOString();
    return {
      id,
      bookingNumber,
      customerId,
      serviceId,
      assignedStaffId,
      scheduledDate,
      scheduledStartTime,
      estimatedDurationMinutes: service?.estimatedDurationMinutes ?? 120,
      address: this.requireCustomer(customerId).address,
      specialInstructions,
      status,
      quotedPrice,
      createdAt: now,
      updatedAt: now,
    };
  }

  private addActivity(bookingId: string, userId: string | null, action: BookingActivityAction, description: string) {
    this.activities.push({
      id: randomUUID(),
      bookingId,
      userId,
      action,
      description,
      createdAt: new Date().toISOString(),
      userName: userId ? this.users.find((user) => user.id === userId)?.name ?? null : null,
    });
  }

  private applyFilters(bookings: Booking[], filters: BookingFilters) {
    return bookings.filter((booking) => {
      const customer = this.requireCustomer(booking.customerId);
      const matchesSearch =
        !filters.search ||
        [
          booking.bookingNumber,
          customer.name,
          customer.email,
          customer.phone,
        ].some((value) => value.toLowerCase().includes(filters.search!.toLowerCase()));

      return (
        matchesSearch &&
        (!filters.status || booking.status === filters.status) &&
        (!filters.serviceId || booking.serviceId === filters.serviceId) &&
        (!filters.staffId || booking.assignedStaffId === filters.staffId) &&
        (!filters.date || booking.scheduledDate === filters.date)
      );
    });
  }

  private nextBookingNumber() {
    const numbers = this.bookings
      .map((booking) => Number(booking.bookingNumber.replace("SF-", "")))
      .filter((value) => Number.isFinite(value));
    return `SF-${Math.max(1000, ...numbers) + 1}`;
  }

  private staffAvailability(staffId: string): "Available" | "Assigned" | "In Field" {
    const today = todayDateString();
    const jobsToday = this.bookings.filter(
      (booking) => booking.assignedStaffId === staffId && booking.scheduledDate === today,
    );
    if (jobsToday.some((booking) => booking.status === "IN_PROGRESS")) return "In Field";
    if (jobsToday.some((booking) => activeConflictStatuses.includes(booking.status))) return "Assigned";
    return "Available";
  }

  private toListItem(booking: Booking): BookingListItem {
    return {
      ...booking,
      customer: this.requireCustomer(booking.customerId),
      service: this.requireService(booking.serviceId),
      assignedStaff: booking.assignedStaffId ? toPublicUser(this.requireUser(booking.assignedStaffId)) : null,
    };
  }

  private toDetail(booking: Booking): BookingDetail {
    return {
      ...booking,
      customer: this.requireCustomer(booking.customerId),
      service: this.requireService(booking.serviceId),
      assignedStaff: booking.assignedStaffId ? toPublicUser(this.requireUser(booking.assignedStaffId)) : null,
      activities: this.activities
        .filter((activity) => activity.bookingId === booking.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    };
  }

  private requireBooking(id: string) {
    const booking = this.bookings.find((candidate) => candidate.id === id);
    if (!booking) throw new ApiError(404, "Booking not found.");
    return booking;
  }

  private requireCustomer(id: string): Customer {
    const customer = this.customers.find((candidate) => candidate.id === id);
    if (!customer) throw new ApiError(500, "Customer data is unavailable.");
    return customer;
  }

  private requireService(id: string): Service {
    const service = this.services.find((candidate) => candidate.id === id);
    if (!service) throw new ApiError(500, "Service data is unavailable.");
    return service;
  }

  private requireUser(id: string): User {
    const user = this.users.find((candidate) => candidate.id === id);
    if (!user) throw new ApiError(500, "User data is unavailable.");
    return user;
  }
}
