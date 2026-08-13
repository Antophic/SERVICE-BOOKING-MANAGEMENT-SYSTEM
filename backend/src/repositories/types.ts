import type {
  BookingDetail,
  BookingFilters,
  BookingListItem,
  BookingStatus,
  CreatePublicBookingInput,
  DashboardMetrics,
  PaginatedResult,
  PublicUser,
  ScheduleSlot,
  Service,
  UpdateBookingInput,
  User,
} from "../types/domain.js";

export type Actor = {
  id: string;
  role: "ADMIN" | "STAFF";
};

export interface DataStore {
  ready(): Promise<void>;
  disconnect(): Promise<void>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  listServices(activeOnly?: boolean): Promise<Service[]>;
  createPublicBooking(input: CreatePublicBookingInput): Promise<BookingDetail>;
  listBookings(filters: BookingFilters): Promise<PaginatedResult<BookingListItem>>;
  getBookingById(id: string): Promise<BookingDetail | null>;
  updateBooking(id: string, input: UpdateBookingInput, actor: Actor): Promise<BookingDetail>;
  assignStaff(id: string, staffId: string, actor: Actor): Promise<BookingDetail>;
  updateBookingStatus(id: string, status: BookingStatus, actor: Actor): Promise<BookingDetail>;
  listStaff(): Promise<Array<PublicUser & { availability: "Available" | "Assigned" | "In Field" }>>;
  listAssignedBookings(staffId: string): Promise<BookingDetail[]>;
  getAssignedBooking(staffId: string, bookingId: string): Promise<BookingDetail | null>;
  getDashboardMetrics(today: string): Promise<DashboardMetrics>;
  getSchedule(date?: string): Promise<ScheduleSlot[]>;
}
