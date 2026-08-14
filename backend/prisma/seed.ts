import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addBusinessDays, todayDateString } from "../src/utils/time.js";

const prisma = new PrismaClient();

function todayDate() {
  return new Date(`${todayDateString()}T00:00:00.000Z`);
}

function tomorrowDate() {
  return new Date(`${addBusinessDays(todayDateString(), 1)}T00:00:00.000Z`);
}

async function upsertCustomer(data: { name: string; email: string; phone: string; address: string }) {
  const existing = await prisma.customer.findFirst({
    where: {
      email: data.email,
      phone: data.phone,
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.customer.create({ data });
}

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@serviceflow.test" },
    update: {},
    create: {
      name: "Avery Morgan",
      email: "admin@serviceflow.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const james = await prisma.user.upsert({
    where: { email: "james@serviceflow.test" },
    update: {},
    create: { name: "James Wilson", email: "james@serviceflow.test", passwordHash, role: "STAFF" },
  });

  const sophia = await prisma.user.upsert({
    where: { email: "sophia@serviceflow.test" },
    update: {},
    create: { name: "Sophia Carter", email: "sophia@serviceflow.test", passwordHash, role: "STAFF" },
  });

  await prisma.user.upsert({
    where: { email: "daniel@serviceflow.test" },
    update: {},
    create: { name: "Daniel Brooks", email: "daniel@serviceflow.test", passwordHash, role: "STAFF" },
  });

  const standard = await prisma.service.upsert({
    where: { id: "service-standard" },
    update: {},
    create: {
      id: "service-standard",
      name: "Standard Home Cleaning",
      description: "Routine cleaning for homes and apartments.",
      basePrice: 120,
      estimatedDurationMinutes: 120,
      active: true,
    },
  });

  const deep = await prisma.service.upsert({
    where: { id: "service-deep" },
    update: {},
    create: {
      id: "service-deep",
      name: "Deep Cleaning",
      description: "Detailed cleaning for kitchens, bathrooms, and high-use areas.",
      basePrice: 220,
      estimatedDurationMinutes: 180,
      active: true,
    },
  });

  const office = await prisma.service.upsert({
    where: { id: "service-office" },
    update: {},
    create: {
      id: "service-office",
      name: "Office Cleaning",
      description: "Cleaning for small offices and workspaces.",
      basePrice: 180,
      estimatedDurationMinutes: 150,
      active: true,
    },
  });

  const moveOut = await prisma.service.upsert({
    where: { id: "service-move-out" },
    update: {},
    create: {
      id: "service-move-out",
      name: "Move-Out Cleaning",
      description: "Final cleaning for rental and property handover.",
      basePrice: 320,
      estimatedDurationMinutes: 240,
      active: true,
    },
  });

  const sarah = await upsertCustomer({
    name: "Sarah Mitchell",
    email: "sarah@example.test",
    phone: "+1 555 0101",
    address: "42 Oak Street, Springfield",
  });

  const emma = await upsertCustomer({
    name: "Emma Carter",
    email: "emma@example.test",
    phone: "+1 555 0102",
    address: "18 Maple Avenue, Brookfield",
  });

  const noah = await upsertCustomer({
    name: "Noah Bennett",
    email: "noah@example.test",
    phone: "+1 555 0103",
    address: "900 Market Road, Suite 210",
  });

  const olivia = await upsertCustomer({
    name: "Olivia Hayes",
    email: "olivia@example.test",
    phone: "+1 555 0104",
    address: "75 Pine Lane, Riverton",
  });

  const demoBookings = [
    {
      bookingNumber: "SF-1041",
      customerId: sarah.id,
      serviceId: deep.id,
      assignedStaffId: james.id,
      scheduledDate: todayDate(),
      scheduledStartTime: "10:00",
      estimatedDurationMinutes: deep.estimatedDurationMinutes,
      address: sarah.address,
      specialInstructions: "Focus on kitchen appliances and upstairs bathroom.",
      status: "IN_PROGRESS" as const,
      quotedPrice: deep.basePrice,
    },
    {
      bookingNumber: "SF-1042",
      customerId: emma.id,
      serviceId: standard.id,
      assignedStaffId: sophia.id,
      scheduledDate: todayDate(),
      scheduledStartTime: "13:30",
      estimatedDurationMinutes: standard.estimatedDurationMinutes,
      address: emma.address,
      specialInstructions: "Customer requested eco-friendly products.",
      status: "CONFIRMED" as const,
      quotedPrice: standard.basePrice,
    },
    {
      bookingNumber: "SF-1043",
      customerId: noah.id,
      serviceId: office.id,
      assignedStaffId: null,
      scheduledDate: tomorrowDate(),
      scheduledStartTime: "09:00",
      estimatedDurationMinutes: office.estimatedDurationMinutes,
      address: noah.address,
      specialInstructions: "Access code will be shared after confirmation.",
      status: "PENDING" as const,
      quotedPrice: office.basePrice,
    },
    {
      bookingNumber: "SF-1044",
      customerId: olivia.id,
      serviceId: moveOut.id,
      assignedStaffId: james.id,
      scheduledDate: todayDate(),
      scheduledStartTime: "08:00",
      estimatedDurationMinutes: moveOut.estimatedDurationMinutes,
      address: olivia.address,
      specialInstructions: "Final clean before property handover.",
      status: "COMPLETED" as const,
      quotedPrice: moveOut.basePrice,
    },
  ];

  for (const booking of demoBookings) {
    const { bookingNumber, ...bookingData } = booking;
    const created = await prisma.booking.upsert({
      where: { bookingNumber },
      update: bookingData,
      create: booking,
    });

    const existingActivity = await prisma.bookingActivity.findFirst({
      where: {
        bookingId: created.id,
        action: "BOOKING_CREATED",
        description: "Booking request created.",
      },
    });

    if (!existingActivity) {
      await prisma.bookingActivity.create({
        data: {
          bookingId: created.id,
          userId: booking.assignedStaffId ? admin.id : null,
          action: "BOOKING_CREATED",
          description: "Booking request created.",
        },
      });
    }
  }

  const existingNumbers = await prisma.booking.findMany({ select: { bookingNumber: true } });
  const highestBookingNumber = Math.max(
    1000,
    ...existingNumbers
      .map((booking) => Number(booking.bookingNumber.replace("SF-", "")))
      .filter((value) => Number.isFinite(value)),
  );

  await prisma.bookingCounter.upsert({
    where: { name: "public" },
    update: { nextNumber: highestBookingNumber + 1 },
    create: { name: "public", nextNumber: highestBookingNumber + 1 },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
