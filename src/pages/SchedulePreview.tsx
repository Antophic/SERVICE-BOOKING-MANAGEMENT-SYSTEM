import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { AuthPanel } from "../components/AuthPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { PublicUser, ScheduleSlot } from "../types/domain";
import { todayInputValue } from "../utils/date";

type SchedulePreviewProps = {
  user: PublicUser | null;
  onLogin: (user: PublicUser) => void;
};

export function SchedulePreview({ user, onLogin }: SchedulePreviewProps) {
  const [date, setDate] = useState(todayInputValue());
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canUseAdmin = user?.role === "ADMIN";

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.getSchedule(date);
      setSchedule(response.schedule);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load schedule.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (!canUseAdmin) return;
    void loadSchedule();
  }, [canUseAdmin, loadSchedule]);

  if (!canUseAdmin) {
    return <AuthPanel role="ADMIN" onLogin={onLogin} />;
  }

  return (
    <div className="view-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Daily Staff Schedule</h1>
        </div>
        <button className="primary-button" type="button" onClick={loadSchedule} disabled={loading}>
          <RefreshCw size={18} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <section className="panel schedule-filter-panel">
        <label>
          Schedule Date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </section>

      {error && <p className="toast error">{error}</p>}

      <section className="schedule-grid">
        {schedule.map((column) => (
          <article className="panel schedule-card" key={column.staff.id}>
            <div className="schedule-title">
              <CalendarDays size={18} aria-hidden="true" />
              <h2>{column.staff.name}</h2>
            </div>
            <div className="slot-list">
              {loading ? (
                <p className="empty-state">Loading schedule...</p>
              ) : column.bookings.length ? (
                column.bookings.map((booking) => (
                  <div className="time-slot" key={booking.id}>
                    <strong>{booking.scheduledStartTime} - {booking.bookingNumber}</strong>
                    <span>{booking.customerName} · {booking.serviceName}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                ))
              ) : (
                <p className="empty-state">No bookings scheduled.</p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
