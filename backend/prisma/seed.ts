import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function tomorrowDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
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

  const sarah = await prisma.customer.create({
    data: {
      name: "Sarah Mitchell",
      email: "sarah@example.test",
      phone: "+1 555 0101",
      address: "42 Oak Street, Springfield",
    },
  });

  const emma = await prisma.customer.create({
    data: {
      name: "Emma Carter",
      email: "emma@example.test",
      phone: "+1 555 0102",
      address: "18 Maple Avenue, Brookfield",
    },
  });

  const noah = await prisma.customer.create({
    data: {
      name: "Noah Bennett",
      email: "noah@example.test",
      phone: "+1 555 0103",
      address: "900 Market Road, Suite 210",
    },
  });

  const olivia = await prisma.customer.create({
    data: {
      name: "Olivia Hayes",
      email: "olivia@example.test",
      phone: "+1 555 0104",
      address: "75 Pine Lane, Riverton",
    },
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
    const created = await prisma.booking.upsert({
      where: { bookingNumber: booking.bookingNumber },
      update: {},
      create: booking,
    });

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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
