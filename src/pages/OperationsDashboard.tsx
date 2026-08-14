import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CircleDollarSign, Clock3, ListChecks, Pencil, RefreshCw, TimerReset } from "lucide-react";
import { api, ApiClientError } from "../api/client";
import { AuthPanel } from "../components/AuthPanel";
import { MetricCard } from "../components/MetricCard";
import { StatusBadge } from "../components/StatusBadge";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type {
  BookingDetail,
  BookingListItem,
  BookingStatus,
  DashboardMetrics,
  PublicUser,
  Service,
  StaffMember,
} from "../types/domain";
import { currency } from "../utils/format";
import { formatDate, todayInputValue } from "../utils/date";

type OperationsDashboardProps = {
  user: PublicUser | null;
  onLogin: (user: PublicUser) => void;
};

type EditBookingForm = {
  serviceId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  address: string;
  specialInstructions: string;
  quotedPrice: string;
};

const emptyMetrics: DashboardMetrics = {
  todaysBookings: 0,
  pendingRequests: 0,
  jobsInProgress: 0,
  completedToday: 0,
  todaysRevenue: 0,
};

const statusOptions: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function OperationsDashboard({ user, onLogin }: OperationsDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditBookingForm | null>(null);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const canUseAdmin = user?.role === "ADMIN";
  const selectedBookingId = selectedBooking?.id;

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "8" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    if (serviceId) params.set("serviceId", serviceId);
    if (staffId) params.set("staffId", staffId);
    if (date) params.set("date", date);
    return params.toString();
  }, [date, debouncedSearch, page, serviceId, staffId, status]);

  const loadBookingDetail = useCallback(async (id: string) => {
    const response = await api.getBooking(id);
    setSelectedBooking(response.booking);
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, bookingsResponse, servicesResponse, staffResponse] = await Promise.all([
        api.getDashboard(),
        api.listBookings(new URLSearchParams(queryString)),
        api.listServices(),
        api.listStaff(),
      ]);

      setMetrics(dashboardResponse.metrics);
      setBookings(bookingsResponse.items);
      setTotalPages(bookingsResponse.totalPages);
      setServices(servicesResponse.services);
      setStaff(staffResponse.staff);

      if (bookingsResponse.items.length) {
        const currentStillExists = selectedBookingId
          ? bookingsResponse.items.some((booking) => booking.id === selectedBookingId)
          : false;
        await loadBookingDetail(currentStillExists && selectedBookingId ? selectedBookingId : bookingsResponse.items[0].id);
      } else {
        setSelectedBooking(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadBookingDetail, queryString, selectedBookingId]);

  useEffect(() => {
    if (!canUseAdmin) return;
    void loadAdminData();
  }, [canUseAdmin, loadAdminData]);

  function resetPage() {
    setPage(1);
  }

  function openEditForm(booking: BookingDetail) {
    setEditForm({
      serviceId: booking.serviceId,
      scheduledDate: booking.scheduledDate,
      scheduledStartTime: booking.scheduledStartTime,
      address: booking.address,
      specialInstructions: booking.specialInstructions ?? "",
      quotedPrice: String(booking.quotedPrice),
    });
    setEditErrors([]);
    setEditOpen(true);
  }

  function updateEditField(field: keyof EditBookingForm, value: string) {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateEditService(serviceId: string) {
    const selectedService = services.find((service) => service.id === serviceId);
    setEditForm((current) =>
      current
        ? {
            ...current,
            serviceId,
            quotedPrice: selectedService ? String(selectedService.basePrice) : current.quotedPrice,
          }
        : current,
    );
  }

  function validateEditForm(form: EditBookingForm) {
    const issues: string[] = [];
    const quotedPrice = Number(form.quotedPrice);

    if (!form.serviceId) issues.push("Select a service.");
    if (!form.scheduledDate) issues.push("Select a service date.");
    if (!form.scheduledStartTime) issues.push("Select a service time.");
    if (form.address.trim().length < 5) issues.push("Service address must be at least 5 characters.");
    if (!Number.isFinite(quotedPrice) || quotedPrice < 0) issues.push("Quoted price must be zero or greater.");

    return issues;
  }

  async function handleSaveEdit() {
    if (!selectedBooking || !editForm) return;

    const issues = validateEditForm(editForm);
    if (issues.length) {
      setEditErrors(issues);
      return;
    }

    setSavingEdit(true);
    setEditErrors([]);
    setError("");
    setMessage("");

    try {
      const response = await api.updateBooking(selectedBooking.id, {
        serviceId: editForm.serviceId,
        scheduledDate: editForm.scheduledDate,
        scheduledStartTime: editForm.scheduledStartTime,
        address: editForm.address.trim(),
        specialInstructions: editForm.specialInstructions.trim() || null,
        quotedPrice: Number(editForm.quotedPrice),
      });
      setSelectedBooking(response.booking);
      setEditOpen(false);
      setMessage("Booking details updated.");
      await loadAdminData();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.issues?.length) {
        setEditErrors(caught.issues.map((issue) => issue.message));
      } else {
        setEditErrors([caught instanceof Error ? caught.message : "Unable to update booking details."]);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAssign(bookingId: string, nextStaffId: string) {
    if (!nextStaffId) return;
    setUpdating(`assign-${bookingId}`);
    setError("");
    setMessage("");

    try {
      await api.assignStaff(bookingId, nextStaffId);
      setMessage("Staff assigned.");
      await loadAdminData();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to assign staff.");
    } finally {
      setUpdating("");
    }
  }

  async function handleStatus(bookingId: string, nextStatus: BookingStatus) {
    setUpdating(`status-${bookingId}`);
    setError("");
    setMessage("");

    try {
      await api.updateBookingStatus(bookingId, nextStatus);
      setMessage(nextStatus === "COMPLETED" ? "Job completed." : "Booking status updated.");
      await loadAdminData();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to update the booking.");
    } finally {
      setUpdating("");
    }
  }

  async function handleCancel(bookingId: string) {
    setUpdating(`cancel-${bookingId}`);
    setError("");
    setMessage("");

    try {
      await api.cancelBooking(bookingId);
      setMessage("Booking cancelled.");
      await loadAdminData();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to cancel the booking.");
    } finally {
      setUpdating("");
    }
  }

  if (!canUseAdmin) {
    return <AuthPanel role="ADMIN" onLogin={onLogin} />;
  }

  return (
    <div className="view-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Operations Dashboard</h1>
        </div>
        <button className="primary-button" type="button" onClick={loadAdminData} disabled={loading}>
              <RefreshCw size={18} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {message && <p className="toast success">{message}</p>}
      {error && <p className="toast error">{error}</p>}

      <section className="metrics-grid" aria-label="Operational metrics">
        <MetricCard title="Today's Bookings" value={String(metrics.todaysBookings)} caption="Scheduled today" icon={CalendarCheck} />
        <MetricCard title="Pending Requests" value={String(metrics.pendingRequests)} caption="Needs admin review" icon={TimerReset} />
        <MetricCard title="Jobs In Progress" value={String(metrics.jobsInProgress)} caption="Active field work" icon={Clock3} />
        <MetricCard title="Today's Revenue" value={currency.format(metrics.todaysRevenue)} caption={`${metrics.completedToday} completed today`} icon={CircleDollarSign} />
      </section>

      <section className="workspace-grid">
        <div className="panel bookings-panel">
          <div className="panel-heading">
            <div>
              <h2>Bookings</h2>
              <p>Search, filters, assignment, and status workflow</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => { resetPage(); setDate(todayInputValue()); }}>
              <ListChecks size={16} aria-hidden="true" />
              Today
            </button>
          </div>

          <div className="filter-grid">
            <input aria-label="Search bookings" placeholder="Search number, customer, email, or phone" value={search} onChange={(event) => { resetPage(); setSearch(event.target.value); }} />
            <select aria-label="Status filter" value={status} onChange={(event) => { resetPage(); setStatus(event.target.value); }}>
              <option value="">All Status</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
            </select>
            <select aria-label="Service filter" value={serviceId} onChange={(event) => { resetPage(); setServiceId(event.target.value); }}>
              <option value="">All Services</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
            <select aria-label="Staff filter" value={staffId} onChange={(event) => { resetPage(); setStaffId(event.target.value); }}>
              <option value="">All Staff</option>
              {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <input aria-label="Date filter" type="date" value={date} onChange={(event) => { resetPage(); setDate(event.target.value); }} />
          </div>

          {loading ? (
            <p className="empty-state">Loading bookings...</p>
          ) : bookings.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Schedule</th>
                      <th>Staff</th>
                      <th>Status</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className={selectedBooking?.id === booking.id ? "selected-row" : ""}
                        onClick={() => void loadBookingDetail(booking.id)}
                      >
                        <td><strong>{booking.bookingNumber}</strong></td>
                        <td>{booking.customer.name}</td>
                        <td>{booking.service.name}</td>
                        <td>{formatDate(booking.scheduledDate)}, {booking.scheduledStartTime}</td>
                        <td>{booking.assignedStaff?.name ?? "Unassigned"}</td>
                        <td><StatusBadge status={booking.status} /></td>
                        <td>{currency.format(booking.quotedPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-row">
                <button className="ghost-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button className="ghost-button" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            </>
          ) : (
            <p className="empty-state">No bookings match your filters.</p>
          )}
        </div>

        <aside className="panel detail-panel" aria-label="Booking detail">
          {selectedBooking ? (
            <>
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Selected Booking</p>
                  <h2>{selectedBooking.bookingNumber}</h2>
                </div>
                <div className="detail-heading-actions">
                  <StatusBadge status={selectedBooking.status} />
                  <button className="ghost-button" type="button" onClick={() => openEditForm(selectedBooking)}>
                    <Pencil size={15} aria-hidden="true" />
                    Edit Booking
                  </button>
                </div>
              </div>

              {editOpen && editForm && (
                <div className="edit-booking-panel">
                  <div className="panel-heading compact">
                    <div>
                      <h3>Edit Booking</h3>
                      <p>Update details without changing status.</p>
                    </div>
                  </div>
                  {editErrors.length > 0 && (
                    <div className="form-error">
                      {editErrors.map((issue) => (
                        <span key={issue}>{issue}</span>
                      ))}
                    </div>
                  )}
                  <div className="edit-booking-grid">
                    <label>
                      Service
                      <select value={editForm.serviceId} onChange={(event) => updateEditService(event.target.value)}>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Date
                      <input type="date" value={editForm.scheduledDate} onChange={(event) => updateEditField("scheduledDate", event.target.value)} />
                    </label>
                    <label>
                      Time
                      <input type="time" value={editForm.scheduledStartTime} onChange={(event) => updateEditField("scheduledStartTime", event.target.value)} />
                    </label>
                    <label>
                      Quoted Price
                      <input min="0" step="0.01" type="number" value={editForm.quotedPrice} onChange={(event) => updateEditField("quotedPrice", event.target.value)} />
                    </label>
                    <label>
                      Address
                      <textarea value={editForm.address} onChange={(event) => updateEditField("address", event.target.value)} rows={3} />
                    </label>
                    <label>
                      Special Instructions
                      <textarea value={editForm.specialInstructions} onChange={(event) => updateEditField("specialInstructions", event.target.value)} rows={3} />
                    </label>
                  </div>
                  <div className="edit-actions">
                    <button className="primary-button" type="button" disabled={savingEdit} onClick={() => void handleSaveEdit()}>
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button className="ghost-button" type="button" disabled={savingEdit} onClick={() => setEditOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="detail-list">
                <div><span>Customer</span><strong>{selectedBooking.customer.name}</strong></div>
                <div><span>Contact</span><strong>{selectedBooking.customer.phone} - {selectedBooking.customer.email}</strong></div>
                <div><span>Service</span><strong>{selectedBooking.service.name}</strong></div>
                <div><span>Schedule</span><strong>{formatDate(selectedBooking.scheduledDate)}, {selectedBooking.scheduledStartTime}</strong></div>
                <div><span>Quoted Price</span><strong>{currency.format(selectedBooking.quotedPrice)}</strong></div>
                <div><span>Address</span><strong>{selectedBooking.address}</strong></div>
              </div>

              <div className="action-stack">
                <label>
                  Assigned Staff
                  <select
                    value={selectedBooking.assignedStaff?.id ?? ""}
                    onChange={(event) => void handleAssign(selectedBooking.id, event.target.value)}
                    disabled={updating === `assign-${selectedBooking.id}`}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={selectedBooking.status}
                    onChange={(event) => void handleStatus(selectedBooking.id, event.target.value as BookingStatus)}
                    disabled={updating === `status-${selectedBooking.id}`}
                  >
                    {statusOptions.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
                  </select>
                </label>
                {(selectedBooking.status === "PENDING" || selectedBooking.status === "CONFIRMED") && (
                  <button className="danger-button" type="button" onClick={() => void handleCancel(selectedBooking.id)} disabled={updating === `cancel-${selectedBooking.id}`}>
                    Cancel Booking
                  </button>
                )}
              </div>

              <div className="instructions-box">
                <span>Instructions</span>
                <p>{selectedBooking.specialInstructions || "No special instructions provided."}</p>
              </div>

              <div className="activity-list">
                <h3>Activity</h3>
                <ol>
                  {selectedBooking.activities.map((activity) => (
                    <li key={activity.id}>
                      <span>{new Date(activity.createdAt).toLocaleString()}</span> {activity.description}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <p className="empty-state">Select a booking to view details.</p>
          )}
        </aside>
      </section>

      <section className="panel staff-panel">
        <div className="panel-heading">
          <div>
            <h2>Staff</h2>
            <p>Lightweight availability overview</p>
          </div>
        </div>
        <div className="staff-grid">
          {staff.map((member) => (
            <article className="staff-card" key={member.id}>
              <div className="avatar">{member.name.split(" ").map((part) => part[0]).join("")}</div>
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <span className="availability">{member.availability}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
