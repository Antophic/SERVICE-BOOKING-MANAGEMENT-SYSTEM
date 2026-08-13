import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryStore } from "../src/repositories/memoryStore.js";
import { todayDateString } from "../src/utils/time.js";

function createTestAgent() {
  const store = new MemoryStore();
  return {
    store,
    agent: request.agent(createApp(store)),
  };
}

async function loginAs(agent: request.Agent, email: string) {
  const response = await agent
    .post("/api/auth/login")
    .send({ email, password: "Password123!" })
    .expect(200);

  return response.body.csrfToken as string;
}

function tomorrowDateString() {
  return todayDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

describe("ServiceFlow API", () => {
  it("returns 401 for unauthenticated admin routes", async () => {
    const { agent } = createTestAgent();

    await agent.get("/api/bookings").expect(401);
  });

  it("prevents staff from accessing admin-only endpoints", async () => {
    const { agent } = createTestAgent();
    await loginAs(agent, "james@serviceflow.test");

    await agent.get("/api/bookings").expect(403);
  });

  it("returns a CSRF token when restoring an authenticated session", async () => {
    const { agent } = createTestAgent();
    await loginAs(agent, "admin@serviceflow.test");

    const response = await agent.get("/api/auth/me").expect(200);

    expect(response.body.user.email).toBe("admin@serviceflow.test");
    expect(response.body.csrfToken).toEqual(expect.any(String));
  });

  it("enforces staff assigned-job isolation", async () => {
    const { agent } = createTestAgent();
    const csrfToken = await loginAs(agent, "james@serviceflow.test");

    const jobsResponse = await agent.get("/api/staff/me/bookings").expect(200);
    expect(jobsResponse.body.bookings.every((booking: { assignedStaff: { email: string } }) => booking.assignedStaff.email === "james@serviceflow.test")).toBe(true);

    await agent.get("/api/staff/me/bookings/booking-1042").expect(403);

    await agent
      .patch("/api/staff/me/bookings/booking-1042/status")
      .set("x-csrf-token", csrfToken)
      .send({ status: "IN_PROGRESS" })
      .expect(403);
  });

  it("rejects public bookings in the past", async () => {
    const { agent } = createTestAgent();

    await agent
      .post("/api/public/bookings")
      .send({
        name: "Past Customer",
        email: "past@example.test",
        phone: "+1 555 0199",
        serviceId: "service-standard",
        scheduledDate: "2020-01-01",
        scheduledStartTime: "10:00",
        address: "1 Old Road",
      })
      .expect(422);
  });

  it("rejects invalid status transitions", async () => {
    const { agent } = createTestAgent();
    const csrfToken = await loginAs(agent, "admin@serviceflow.test");

    const response = await agent
      .patch("/api/bookings/booking-1044/status")
      .set("x-csrf-token", csrfToken)
      .send({ status: "PENDING" })
      .expect(422);

    expect(response.body.message).toContain("Cannot change booking");
  });

  it("rejects overlapping staff assignments and allows non-overlapping assignment", async () => {
    const { agent } = createTestAgent();
    const csrfToken = await loginAs(agent, "admin@serviceflow.test");
    const tomorrow = tomorrowDateString();

    await agent
      .patch("/api/bookings/booking-1043/assign")
      .set("x-csrf-token", csrfToken)
      .send({ staffId: "staff-james" })
      .expect(200);

    const conflictingBooking = await agent
      .post("/api/public/bookings")
      .send({
        name: "Conflict Customer",
        email: "conflict@example.test",
        phone: "+1 555 0200",
        serviceId: "service-standard",
        scheduledDate: tomorrow,
        scheduledStartTime: "10:00",
        address: "22 Conflict Street",
      })
      .expect(201);

    const conflictResponse = await agent
      .patch(`/api/bookings/${conflictingBooking.body.booking.id}/assign`)
      .set("x-csrf-token", csrfToken)
      .send({ staffId: "staff-james" })
      .expect(409);

    expect(conflictResponse.body.message).toBe("James Wilson already has a booking during this time.");

    const nonConflictingBooking = await agent
      .post("/api/public/bookings")
      .send({
        name: "Clear Slot Customer",
        email: "clear@example.test",
        phone: "+1 555 0201",
        serviceId: "service-standard",
        scheduledDate: tomorrow,
        scheduledStartTime: "13:00",
        address: "30 Clear Avenue",
      })
      .expect(201);

    await agent
      .patch(`/api/bookings/${nonConflictingBooking.body.booking.id}/assign`)
      .set("x-csrf-token", csrfToken)
      .send({ staffId: "staff-james" })
      .expect(200);
  });

  it("creates customer, booking, and activity for a valid public booking", async () => {
    const { agent } = createTestAgent();
    const tomorrow = tomorrowDateString();

    const response = await agent
      .post("/api/public/bookings")
      .send({
        name: "Mia Thompson",
        email: "mia@example.test",
        phone: "+1 555 0300",
        serviceId: "service-deep",
        scheduledDate: tomorrow,
        scheduledStartTime: "15:00",
        address: "88 Cedar Court",
        specialInstructions: "Please call on arrival.",
      })
      .expect(201);

    expect(response.body.booking.bookingNumber).toMatch(/^SF-\d+$/);

    const csrfToken = await loginAs(agent, "admin@serviceflow.test");
    const detailResponse = await agent.get(`/api/bookings/${response.body.booking.id}`).expect(200);
    expect(detailResponse.body.booking.customer.email).toBe("mia@example.test");
    expect(detailResponse.body.booking.activities.some((activity: { action: string }) => activity.action === "BOOKING_CREATED")).toBe(true);

    await agent
      .patch(`/api/bookings/${response.body.booking.id}/status`)
      .set("x-csrf-token", csrfToken)
      .send({ status: "CONFIRMED" })
      .expect(200);
  });

  it("derives dashboard metrics from booking records", async () => {
    const { agent } = createTestAgent();
    await loginAs(agent, "admin@serviceflow.test");

    const response = await agent.get("/api/dashboard").expect(200);

    expect(response.body.metrics.todaysBookings).toBeGreaterThan(0);
    expect(response.body.metrics.pendingRequests).toBeGreaterThan(0);
    expect(response.body.metrics.todaysRevenue).toBe(320);
  });
});
