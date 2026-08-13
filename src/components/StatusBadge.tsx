import type { BookingStatus } from "../types/domain";

type StatusBadgeProps = {
  status: BookingStatus;
};

const statusLabel: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status status-${status.toLowerCase()}`}>{statusLabel[status]}</span>;
}
