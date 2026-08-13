export type Role = "ADMIN" | "STAFF";

export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type BookingActivityAction =
  | "BOOKING_CREATED"
  | "STAFF_ASSIGNED"
  | "STATUS_CHANGED"
  | "BOOKING_EDITED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED";

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<User, "passwordHash">;

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

export type BookingActivity = {
  id: string;
  bookingId: string;
  userId: string | null;
  action: BookingActivityAction;
  description: string;
  createdAt: string;
  userName?: string | null;
};

export type BookingDetail = Booking & {
  customer: Customer;
  service: Service;
  assignedStaff: PublicUser | null;
  activities: BookingActivity[];
};

export type BookingListItem = Booking & {
  customer: Pick<Customer, "id" | "name" | "email" | "phone">;
  service: Pick<Service, "id" | "name">;
  assignedStaff: Pick<PublicUser, "id" | "name" | "email"> | null;
};

export type BookingFilters = {
  page: number;
  limit: number;
  search?: string;
  status?: BookingStatus;
  serviceId?: string;
  staffId?: string;
  date?: string;
};

export type PaginatedResult<T> = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: T[];
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
  bookings: Array<Pick<BookingListItem, "id" | "bookingNumber" | "scheduledDate" | "scheduledStartTime" | "estimatedDurationMinutes" | "status"> & {
    customerName: string;
    serviceName: string;
  }>;
};

export type CreatePublicBookingInput = {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  address: string;
  specialInstructions?: string | null;
};

export type UpdateBookingInput = Partial<{
  serviceId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDurationMinutes: number;
  address: string;
  specialInstructions: string | null;
  quotedPrice: number;
}>;
