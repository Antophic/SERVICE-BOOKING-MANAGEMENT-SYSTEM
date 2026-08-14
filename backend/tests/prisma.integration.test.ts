import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaStore } from "../src/repositories/prismaStore.js";
import type { Actor } from "../src/repositories/types.js";
import { addBusinessDays, todayDateString } from "../src/utils/time.js";

const databaseUrlTest = process.env.DATABASE_URL_TEST;
const safeDatabasePattern = /(test|integration)/i;

function isSafeIntegrationDatabaseUrl(value?: string) {
  if (!value) return false;

  try {
    const url = new URL(value);
    const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    return safeDatabasePattern.test(url.hostname) || safeDatabasePattern.test(databaseName);
  } catch {
    return false;
  }
}

const canRunIntegration = isSafeIntegrationDatabaseUrl(databaseUrlTest);
const describeIntegration = canRunIntegration ? describe : describe.skip;

let prisma: PrismaClient;
let store: PrismaStore;
let admin: { id: string };
let staffA: { id: string };
let staffB: { id: string };
let standardService: { id: string };
let deepService: { id: string };

const adminActor = (): Actor => ({ id: admin.id, role: "ADMIN" });
const staffAActor = (): Actor => ({ id: staffA.id, role: "STAFF" });

async function cleanupDatabase() {
  await prisma.bookingActivity.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.bookingCounter.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
}

async function seedFixtures() {
  const passwordHash = await bcrypt.hash("Password123!", 4);

  admin = await prisma.user.create({
    data: {
      name: "Integration Admin",
      email: "integration-admin@example.test",
      passwordHash,
      role: "ADMIN",
    },
    select: { id: true },
  });
  staffA = await prisma.user.create({
    data: {
      name: "Integration Staff A",
      email: "integration-staff-a@example.test",
      passwordHash,
      role: "STAFF",
    },
    select: { id: true },
  });
  staffB = await prisma.user.create({
    data: {
      name: "Integration Staff B",
      email: "integration-staff-b@example.test",
      passwordHash,
      role: "STAFF",
    },
    select: { id: true },
  });

  standardService = await prisma.service.create({
    data: {
      id: "integration-standard",
      name: "Integration Standard",
      description: "Integration test standard service.",
      basePrice: 120,
      estimatedDurationMinutes: 120,
      active: true,
    },
    select: { id: true },
  });
  deepService = await prisma.service.create({
    data: {
      id: "integration-deep",
      name: "Integration Deep",
      description: "Integration test deep service.",
      basePrice: 220,
      estimatedDurationMinutes: 180,
      active: true,
    },
    select: { id: true },
  });
}

async function createPublicBooking(index: number, scheduledDate: string, scheduledStartTime: string) {
  return store.createPublicBooking({
    name: `Integration Customer ${index}`,
    email: `integration-customer-${index}@example.test`,
    phone: `+1 555 90${String(index).padStart(2, "0")}`,
    serviceId: standardService.id,
    scheduledDate,
    scheduledStartTime,
    address: `${index} Integration Avenue`,
  });
}

async function createDashboardBooking(input: {
  bookingNumber: string;
  scheduledDate: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  quotedPrice: number;
}) {
  const customer = await prisma.customer.create({
    data: {
      name: `${input.bookingNumber} Customer`,
      email: `${input.bookingNumber.toLowerCase()}@example.test`,
      phone: `+1 555 ${input.bookingNumber.replace("SF-", "")}`,
      address: `${input.bookingNumber} Metrics Road`,
    },
  });

  return prisma.booking.create({
    data: {
      bookingNumber: input.bookingNumber,
      customerId: customer.id,
      serviceId: standardService.id,
      scheduledDate: new Date(`${input.scheduledDate}T00:00:00.000Z`),
      scheduledStartTime: "14:00",
      estimatedDurationMinutes: 120,
      address: customer.address,
      status: input.status,
      quotedPrice: input.quotedPrice,
    },
  });
}

if (databaseUrlTest && !canRunIntegration) {
  console.warn(
    "Skipping Prisma integration tests: DATABASE_URL_TEST hostname or database name must include 'test' or 'integration'.",
  );
}

describe("Prisma integration database safety", () => {
  it("only trusts the hostname or database name, never username or password", () => {
    expect(isSafeIntegrationDatabaseUrl("mysql://testuser:password@production-server.com/serviceflow")).toBe(false);
    expect(isSafeIntegrationDatabaseUrl("mysql://user:integrationpass@production-server.com/serviceflow")).toBe(false);
    expect(isSafeIntegrationDatabaseUrl("mysql://user:password@mysql-test.example.com/serviceflow")).toBe(true);
    expect(isSafeIntegrationDatabaseUrl("mysql://user:password@production-server.com/serviceflow_test")).toBe(true);
    expect(isSafeIntegrationDatabaseUrl("not-a-url")).toBe(false);
  });
});

describeIntegration("PrismaStore integration", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrlTest!;
    prisma = new PrismaClient();
    store = new PrismaStore();
    await prisma.$connect();
    await store.ready();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    await seedFixtures();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await store.disconnect();
    await prisma.$disconnect();
  });

  it("creates Customer, Booking, and BookingActivity for a public booking", async () => {
    const futureDate = addBusinessDays(todayDateString(), 3);
    const booking = await createPublicBooking(1, futureDate, "09:00");

    const [customerCount, bookingRow, activityCount] = await Promise.all([
      prisma.customer.count({ where: { email: "integration-customer-1@example.test" } }),
      prisma.booking.findUnique({ where: { id: booking.id } }),
      prisma.bookingActivity.count({ where: { bookingId: booking.id, action: "BOOKING_CREATED" } }),
    ]);

    expect(customerCount).toBe(1);
    expect(bookingRow?.bookingNumber).toMatch(/^SF-\d+$/);
    expect(activityCount).toBe(1);
  });

  it("rejects overlapping assignment and accepts a non-overlapping assignment", async () => {
    const futureDate = addBusinessDays(todayDateString(), 4);
    const first = await createPublicBooking(2, futureDate, "10:00");
    const overlapping = await createPublicBooking(3, futureDate, "11:00");
    const clear = await createPublicBooking(4, futureDate, "13:00");

    await store.assignStaff(first.id, staffA.id, adminActor());
    await expect(store.assignStaff(overlapping.id, staffA.id, adminActor())).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(store.assignStaff(clear.id, staffA.id, adminActor())).resolves.toMatchObject({
      assignedStaff: expect.objectContaining({ id: staffA.id }),
    });
  });

  it("rejects conflicting reschedules and accepts touching boundaries", async () => {
    const futureDate = addBusinessDays(todayDateString(), 5);
    const first = await createPublicBooking(5, futureDate, "10:00");
    const second = await createPublicBooking(6, futureDate, "13:00");

    await store.assignStaff(first.id, staffA.id, adminActor());
    await store.assignStaff(second.id, staffA.id, adminActor());

    await expect(store.updateBooking(second.id, { scheduledStartTime: "11:00" }, adminActor())).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(store.updateBooking(second.id, { scheduledStartTime: "12:00" }, adminActor())).resolves.toMatchObject({
      scheduledStartTime: "12:00",
    });
  });

  it("updates editable booking details and writes an audit activity", async () => {
    const futureDate = addBusinessDays(todayDateString(), 6);
    const booking = await createPublicBooking(7, futureDate, "09:00");

    const updated = await store.updateBooking(
      booking.id,
      {
        serviceId: deepService.id,
        address: "77 Updated Integration Road",
        specialInstructions: "Use the side entrance.",
        quotedPrice: 250,
      },
      adminActor(),
    );
    const editedActivities = await prisma.bookingActivity.count({
      where: { bookingId: booking.id, action: "BOOKING_EDITED" },
    });

    expect(updated).toMatchObject({
      serviceId: deepService.id,
      estimatedDurationMinutes: 180,
      address: "77 Updated Integration Road",
      specialInstructions: "Use the side entrance.",
      quotedPrice: 250,
    });
    expect(editedActivities).toBe(1);
  });

  it("preserves staff job isolation", async () => {
    const futureDate = addBusinessDays(todayDateString(), 7);
    const first = await createPublicBooking(8, futureDate, "10:00");
    const second = await createPublicBooking(9, futureDate, "10:00");

    await store.assignStaff(first.id, staffA.id, adminActor());
    await store.assignStaff(second.id, staffB.id, adminActor());

    await expect(store.getAssignedBooking(staffA.id, second.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(store.updateBookingStatus(second.id, "IN_PROGRESS", staffAActor())).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("enforces status workflow transitions", async () => {
    const futureDate = addBusinessDays(todayDateString(), 8);
    const booking = await createPublicBooking(10, futureDate, "10:00");

    await store.updateBookingStatus(booking.id, "CONFIRMED", adminActor());
    await store.updateBookingStatus(booking.id, "IN_PROGRESS", adminActor());
    await store.updateBookingStatus(booking.id, "COMPLETED", adminActor());

    await expect(store.updateBookingStatus(booking.id, "PENDING", adminActor())).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("calculates exact dashboard metrics from MySQL records", async () => {
    const today = todayDateString();
    const futureDate = addBusinessDays(today, 1);

    await createDashboardBooking({ bookingNumber: "SF-9101", scheduledDate: today, status: "PENDING", quotedPrice: 120 });
    await createDashboardBooking({
      bookingNumber: "SF-9102",
      scheduledDate: today,
      status: "IN_PROGRESS",
      quotedPrice: 180,
    });
    await createDashboardBooking({
      bookingNumber: "SF-9103",
      scheduledDate: today,
      status: "COMPLETED",
      quotedPrice: 220,
    });
    await createDashboardBooking({
      bookingNumber: "SF-9104",
      scheduledDate: futureDate,
      status: "PENDING",
      quotedPrice: 320,
    });

    await expect(store.getDashboardMetrics(today)).resolves.toEqual({
      todaysBookings: 3,
      pendingRequests: 2,
      jobsInProgress: 1,
      completedToday: 1,
      todaysRevenue: 220,
    });
  });

  it("keeps rapid public booking numbers unique and sequentially readable", async () => {
    const futureDate = addBusinessDays(todayDateString(), 8);
    const bookings = await Promise.all(
      Array.from({ length: 4 }, (_, index) => createPublicBooking(20 + index, futureDate, `1${index}:00`)),
    );
    const numbers = bookings.map((booking) => booking.bookingNumber);

    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.every((bookingNumber) => /^SF-\d+$/.test(bookingNumber))).toBe(true);
  });
});
