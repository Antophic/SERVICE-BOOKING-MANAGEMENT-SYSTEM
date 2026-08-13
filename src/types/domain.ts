export type Role = "ADMIN" | "STAFF";

export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type StaffMember = PublicUser & {
  availability: "Available" | "Assigned" | "In Field";
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingActivity = {
  id: string;
  bookingId: string;
  userId: string | null;
  action: string;
  description: string;
  createdAt: string;
  userName?: string | null;
};

export type Booking = {
  id: string;
  bookingNumber: string;
  customerId: string;
  serviceId: string;
  assignedStaffId: string | null;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationMinutes: number;
  address: string;
  specialInstructions: string | null;
  status: BookingStatus;
  quotedPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type BookingListItem = Booking & {
  customer: Pick<Customer, "id" | "name" | "email" | "phone">;
  service: Pick<Service, "id" | "name">;
  assignedStaff: Pick<PublicUser, "id" | "name" | "email"> | null;
};

export type BookingDetail = Booking & {
  customer: Customer;
  service: Service;
  assignedStaff: PublicUser | null;
  activities: BookingActivity[];
};

export type PaginatedBookings = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: BookingListItem[];
};

export type DashboardMetrics = {
  todaysBookings: number;
  pendingRequests: number;
  jobsInProgress: number;
  completedToday: number;
  todaysRevenue: number;
};

export type ScheduleSlot = {
  staff: Pick<PublicUser, "id" | "name" | "email">;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    scheduledDate: string;
    scheduledStartTime: string;
    estimatedDurationMinutes: number;
    status: BookingStatus;
    customerName: string;
    serviceName: string;
  }>;
};
