import { PrismaClient } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { bookingsOverlap, isPastBookingDateTime, sortBySchedule, todayDateString } from "../utils/time.js";
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
  PublicUser,
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

export class PrismaStore implements DataStore {
  private prisma = new PrismaClient();

  async ready() {
    await this.prisma.$connect();
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async findUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return user ? this.mapUser(user) : null;
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.mapUser(user) : null;
  }

  async listServices(activeOnly = true) {
    const services = await this.prisma.service.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    return services.map((service) => this.mapService(service));
  }

  async createPublicBooking(input: CreatePublicBookingInput) {
    if (isPastBookingDateTime(input.scheduledDate, input.scheduledStartTime)) {
      throw new ApiError(422, "Bookings cannot be scheduled in the past.");
    }

    const service = await this.prisma.service.findFirst({ where: { id: input.serviceId, active: true } });
    if (!service) {
      throw new ApiError(422, "Select a valid service.");
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const existingCustomer = await tx.customer.findFirst({
        where: { email: input.email, phone: input.phone },
      });

      const customer =
        existingCustomer ??
        (await tx.customer.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone,
            address: input.address,
          },
        }));

      const bookingNumber = await this.allocateBookingNumber(tx);
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          customerId: customer.id,
          serviceId: service.id,
          scheduledDate: this.toDate(input.scheduledDate),
          scheduledStartTime: input.scheduledStartTime,
          estimatedDurationMinutes: service.estimatedDurationMinutes,
          address: input.address,
          specialInstructions: input.specialInstructions?.trim() || null,
          status: "PENDING",
          quotedPrice: service.basePrice,
        },
      });

      await tx.bookingActivity.create({
        data: {
          bookingId: created.id,
          userId: null,
          action: "BOOKING_CREATED",
          description: "Booking request created.",
        },
      });

      return created;
    });

    const detail = await this.getBookingById(booking.id);
    if (!detail) throw new ApiError(500, "Unable to load created booking.");
    return detail;
  }

  async listBookings(filters: BookingFilters): Promise<PaginatedResult<BookingListItem>> {
    const where = this.bookingWhere(filters);
    const total = await this.prisma.booking.count({ where });
    const items = await this.prisma.booking.findMany({
      where,
      include: {
        customer: true,
        service: true,
        assignedStaff: true,
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledStartTime: "asc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      items: items.map((item) => this.mapBookingListItem(item)),
    };
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    return booking ? this.mapBookingDetail(booking) : null;
  }

  async updateBooking(id: string, input: UpdateBookingInput, actor: Actor) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Booking not found.");

    const nextDate = input.scheduledDate ?? this.mapDate(existing.scheduledDate);
    const nextTime = input.scheduledStartTime ?? existing.scheduledStartTime;
    const scheduleSensitiveEdit =
      input.scheduledDate !== undefined ||
      input.scheduledStartTime !== undefined ||
      input.estimatedDurationMinutes !== undefined ||
      input.serviceId !== undefined;

    if (input.scheduledDate || input.scheduledStartTime) {
      if (isPastBookingDateTime(nextDate, nextTime)) {
        throw new ApiError(422, "Bookings cannot be scheduled in the past.");
      }
    }

    const service = input.serviceId
      ? await this.prisma.service.findFirst({ where: { id: input.serviceId, active: true } })
      : null;

    if (input.serviceId && !service) {
      throw new ApiError(422, "Select a valid service.");
    }

    const nextDuration = input.estimatedDurationMinutes ?? service?.estimatedDurationMinutes ?? existing.estimatedDurationMinutes;

    if (existing.assignedStaffId && activeConflictStatuses.includes(existing.status as BookingStatus) && scheduleSensitiveEdit) {
      const conflict = await this.findStaffBookingConflict({
        staffId: existing.assignedStaffId,
        bookingIdToIgnore: existing.id,
        scheduledDate: nextDate,
        startTime: nextTime,
        durationMinutes: nextDuration,
      });

      if (conflict) {
        const staff = await this.prisma.user.findUnique({ where: { id: existing.assignedStaffId } });
        throw new ApiError(409, `${staff?.name ?? "Selected staff"} already has a booking during this time.`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: {
          serviceId: input.serviceId,
          scheduledDate: input.scheduledDate ? this.toDate(input.scheduledDate) : undefined,
          scheduledStartTime: input.scheduledStartTime,
          estimatedDurationMinutes: input.estimatedDurationMinutes ?? service?.estimatedDurationMinutes ?? undefined,
          address: input.address,
          specialInstructions: input.specialInstructions,
          quotedPrice: input.quotedPrice ?? service?.basePrice ?? undefined,
        },
      }),
      this.prisma.bookingActivity.create({
        data: {
          bookingId: id,
          userId: actor.id,
          action: "BOOKING_EDITED",
          description: "Booking details updated.",
        },
      }),
    ]);

    const detail = await this.getBookingById(id);
    if (!detail) throw new ApiError(404, "Booking not found.");
    return detail;
  }

  async assignStaff(id: string, staffId: string, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new ApiError(404, "Booking not found.");

    const staff = await this.prisma.user.findFirst({ where: { id: staffId, role: "STAFF" } });
    if (!staff) throw new ApiError(422, "Select a valid staff member.");

    const conflict = await this.findStaffBookingConflict({
      staffId: staff.id,
      bookingIdToIgnore: booking.id,
      scheduledDate: this.mapDate(booking.scheduledDate),
      startTime: booking.scheduledStartTime,
      durationMinutes: booking.estimatedDurationMinutes,
    });

    if (conflict) {
      throw new ApiError(409, `${staff.name} already has a booking during this time.`);
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: { assignedStaffId: staff.id },
      }),
      this.prisma.bookingActivity.create({
        data: {
          bookingId: id,
          userId: actor.id,
          action: "STAFF_ASSIGNED",
          description: `${staff.name} assigned to booking.`,
        },
      }),
    ]);

    const detail = await this.getBookingById(id);
    if (!detail) throw new ApiError(404, "Booking not found.");
    return detail;
  }

  async updateBookingStatus(id: string, status: BookingStatus, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new ApiError(404, "Booking not found.");

    if (actor.role === "STAFF" && booking.assignedStaffId !== actor.id) {
      throw new ApiError(403, "You can only update jobs assigned to you.");
    }

    const currentStatus = booking.status as BookingStatus;
    const allowed = actor.role === "ADMIN" ? adminTransitions[currentStatus] : staffTransitions[currentStatus];
    if (!allowed.includes(status)) {
      throw new ApiError(422, `Cannot change booking from ${currentStatus} to ${status}.`);
    }

    const action: BookingActivityAction =
      status === "COMPLETED" ? "BOOKING_COMPLETED" : status === "CANCELLED" ? "BOOKING_CANCELLED" : "STATUS_CHANGED";

    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id }, data: { status } }),
      this.prisma.bookingActivity.create({
        data: {
          bookingId: id,
          userId: actor.id,
          action,
          description: `Booking status changed to ${status}.`,
        },
      }),
    ]);

    const detail = await this.getBookingById(id);
    if (!detail) throw new ApiError(404, "Booking not found.");
    return detail;
  }

  async listStaff() {
    const staff = await this.prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { name: "asc" },
    });

    return Promise.all(
      staff.map(async (user) => ({
        ...this.mapPublicUser(user),
        availability: await this.staffAvailability(user.id),
      })),
    );
  }

  async listAssignedBookings(staffId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { assignedStaffId: staffId, status: { not: "CANCELLED" } },
      include: this.detailInclude(),
      orderBy: [{ scheduledDate: "asc" }, { scheduledStartTime: "asc" }],
    });
    return bookings.map((booking) => this.mapBookingDetail(booking));
  }

  async getAssignedBooking(staffId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.detailInclude(),
    });

    if (!booking) return null;
    if (booking.assignedStaffId !== staffId) {
      throw new ApiError(403, "You can only access jobs assigned to you.");
    }

    return this.mapBookingDetail(booking);
  }

  async getDashboardMetrics(today: string): Promise<DashboardMetrics> {
    const scheduledDate = this.toDate(today);
    const [todaysBookings, pendingRequests, jobsInProgress, completedToday, revenue] = await Promise.all([
      this.prisma.booking.count({ where: { scheduledDate } }),
      this.prisma.booking.count({ where: { status: "PENDING" } }),
      this.prisma.booking.count({ where: { status: "IN_PROGRESS" } }),
      this.prisma.booking.count({ where: { scheduledDate, status: "COMPLETED" } }),
      this.prisma.booking.aggregate({
        where: { scheduledDate, status: "COMPLETED" },
        _sum: { quotedPrice: true },
      }),
    ]);

    return {
      todaysBookings,
      pendingRequests,
      jobsInProgress,
      completedToday,
      todaysRevenue: Number(revenue._sum.quotedPrice ?? 0),
    };
  }

  async getSchedule(date = todayDateString()): Promise<ScheduleSlot[]> {
    const staff = await this.listStaff();
    const scheduledDate = this.toDate(date);
    const bookings = await this.prisma.booking.findMany({
      where: {
        scheduledDate,
        status: { not: "CANCELLED" },
        assignedStaffId: { not: null },
      },
      include: {
        customer: true,
        service: true,
        assignedStaff: true,
      },
      orderBy: [{ scheduledStartTime: "asc" }],
    });

    return staff.map((member) => ({
      staff: member,
      bookings: sortBySchedule(
        bookings
          .filter((booking) => booking.assignedStaffId === member.id)
          .map((booking) => ({
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            scheduledDate: this.mapDate(booking.scheduledDate),
            scheduledStartTime: booking.scheduledStartTime,
            estimatedDurationMinutes: booking.estimatedDurationMinutes,
            status: booking.status as BookingStatus,
            customerName: booking.customer.name,
            serviceName: booking.service.name,
          })),
      ),
    }));
  }

  private bookingWhere(filters: BookingFilters) {
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.staffId) where.assignedStaffId = filters.staffId;
    if (filters.date) where.scheduledDate = this.toDate(filters.date);
    if (filters.search) {
      where.OR = [
        { bookingNumber: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
        { customer: { email: { contains: filters.search } } },
        { customer: { phone: { contains: filters.search } } },
      ];
    }

    return where;
  }

  private async allocateBookingNumber(tx: any) {
    const existingNumbers = await tx.booking.findMany({ select: { bookingNumber: true } });
    const highestBookingNumber = Math.max(
      1000,
      ...existingNumbers
        .map((booking: { bookingNumber: string }) => Number(booking.bookingNumber.replace("SF-", "")))
        .filter((value: number) => Number.isFinite(value)),
    );
    const counter = await tx.bookingCounter.upsert({
      where: { name: "public" },
      create: { name: "public", nextNumber: highestBookingNumber + 2 },
      update: { nextNumber: { increment: 1 } },
    });

    return `SF-${counter.nextNumber - 1}`;
  }

  private async findStaffBookingConflict(input: {
    staffId: string;
    bookingIdToIgnore: string;
    scheduledDate: string;
    startTime: string;
    durationMinutes: number;
  }) {
    const sameDayBookings = await this.prisma.booking.findMany({
      where: {
        id: { not: input.bookingIdToIgnore },
        assignedStaffId: input.staffId,
        scheduledDate: this.toDate(input.scheduledDate),
        status: { in: activeConflictStatuses },
      },
    });

    return sameDayBookings.find((candidate) =>
      bookingsOverlap(
        candidate.scheduledStartTime,
        candidate.estimatedDurationMinutes,
        input.startTime,
        input.durationMinutes,
      ),
    );
  }

  private async staffAvailability(staffId: string): Promise<"Available" | "Assigned" | "In Field"> {
    const today = this.toDate(todayDateString());
    const jobsToday = await this.prisma.booking.findMany({
      where: { assignedStaffId: staffId, scheduledDate: today },
    });

    if (jobsToday.some((booking) => booking.status === "IN_PROGRESS")) return "In Field";
    if (jobsToday.some((booking) => activeConflictStatuses.includes(booking.status as BookingStatus))) {
      return "Assigned";
    }
    return "Available";
  }

  private detailInclude() {
    return {
      customer: true,
      service: true,
      assignedStaff: true,
      activities: {
        include: { user: true },
        orderBy: { createdAt: "asc" as const },
      },
    };
  }

  private mapBookingListItem(row: any): BookingListItem {
    return {
      ...this.mapBooking(row),
      customer: this.mapCustomer(row.customer),
      service: this.mapService(row.service),
      assignedStaff: row.assignedStaff ? this.mapPublicUser(row.assignedStaff) : null,
    };
  }

  private mapBookingDetail(row: any): BookingDetail {
    return {
      ...this.mapBooking(row),
      customer: this.mapCustomer(row.customer),
      service: this.mapService(row.service),
      assignedStaff: row.assignedStaff ? this.mapPublicUser(row.assignedStaff) : null,
      activities: row.activities.map((activity: any) => this.mapActivity(activity)),
    };
  }

  private mapBooking(row: any): Booking {
    return {
      id: row.id,
      bookingNumber: row.bookingNumber,
      customerId: row.customerId,
      serviceId: row.serviceId,
      assignedStaffId: row.assignedStaffId,
      scheduledDate: this.mapDate(row.scheduledDate),
      scheduledStartTime: row.scheduledStartTime,
      estimatedDurationMinutes: row.estimatedDurationMinutes,
      address: row.address,
      specialInstructions: row.specialInstructions,
      status: row.status,
      quotedPrice: Number(row.quotedPrice),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapActivity(row: any): BookingActivity {
    return {
      id: row.id,
      bookingId: row.bookingId,
      userId: row.userId,
      action: row.action,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      userName: row.user?.name ?? null,
    };
  }

  private mapCustomer(row: any): Customer {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapService(row: any): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      basePrice: Number(row.basePrice),
      estimatedDurationMinutes: row.estimatedDurationMinutes,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapPublicUser(row: any): PublicUser {
    const user = this.mapUser(row);
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  private toDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private mapDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
