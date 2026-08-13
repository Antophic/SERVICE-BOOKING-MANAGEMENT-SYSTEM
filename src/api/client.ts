import type {
  BookingDetail,
  BookingStatus,
  DashboardMetrics,
  PaginatedBookings,
  PublicUser,
  ScheduleSlot,
  Service,
  StaffMember,
} from "../types/domain";

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api" : "http://127.0.0.1:4000/api");
let csrfToken: string | null = null;

type RequestOptions = RequestInit & {
  skipCsrf?: boolean;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipCsrf && csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    issues?: Array<{ path: string; message: string }>;
    csrfToken?: string;
  };

  if (!response.ok) {
    throw new ApiClientError(data.message ?? "Unable to complete request.", response.status, data.issues);
  }

  if (typeof data.csrfToken === "string") {
    csrfToken = data.csrfToken;
  }

  return data as T;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export const api = {
  health: () => request<{ ok: boolean; dataStore: string; timezone: string }>("/health"),

  getMe: () => request<{ user: PublicUser; csrfToken: string }>("/auth/me"),

  login: (email: string, password: string) =>
    request<{ user: PublicUser; csrfToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipCsrf: true,
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
      skipCsrf: true,
    }).finally(() => setCsrfToken(null)),

  listServices: () => request<{ services: Service[] }>("/services"),

  createPublicBooking: (input: {
    name: string;
    email: string;
    phone: string;
    serviceId: string;
    scheduledDate: string;
    scheduledStartTime: string;
    address: string;
    specialInstructions?: string;
  }) =>
    request<{ message: string; booking: { id: string; bookingNumber: string; customerName: string; status: BookingStatus } }>(
      "/public/bookings",
      {
        method: "POST",
        body: JSON.stringify(input),
        skipCsrf: true,
      },
    ),

  getDashboard: () => request<{ metrics: DashboardMetrics }>("/dashboard"),

  listBookings: (query: URLSearchParams) => request<PaginatedBookings>(`/bookings?${query.toString()}`),

  getBooking: (id: string) => request<{ booking: BookingDetail }>(`/bookings/${id}`),

  assignStaff: (id: string, staffId: string) =>
    request<{ message: string; booking: BookingDetail }>(`/bookings/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ staffId }),
    }),

  updateBookingStatus: (id: string, status: BookingStatus) =>
    request<{ message: string; booking: BookingDetail }>(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  cancelBooking: (id: string) =>
    request<{ message: string; booking: BookingDetail }>(`/bookings/${id}`, {
      method: "DELETE",
    }),

  listStaff: () => request<{ staff: StaffMember[] }>("/staff"),

  listStaffJobs: () => request<{ bookings: BookingDetail[] }>("/staff/me/bookings"),

  updateStaffJobStatus: (id: string, status: BookingStatus) =>
    request<{ message: string; booking: BookingDetail }>(`/staff/me/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getSchedule: (date?: string) => {
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    return request<{ schedule: ScheduleSlot[] }>(`/schedule${query.size ? `?${query.toString()}` : ""}`);
  },
};
