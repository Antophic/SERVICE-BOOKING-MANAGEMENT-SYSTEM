import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, RefreshCw } from "lucide-react";
import { api, ApiClientError } from "../api/client";
import { AuthPanel } from "../components/AuthPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { BookingDetail, BookingStatus, PublicUser } from "../types/domain";
import { formatDate, isFutureDate, isToday } from "../utils/date";

type StaffJobsPreviewProps = {
  user: PublicUser | null;
  onLogin: (user: PublicUser) => void;
};

export function StaffJobsPreview({ user, onLogin }: StaffJobsPreviewProps) {
  const [jobs, setJobs] = useState<BookingDetail[]>([]);
  const [selectedJob, setSelectedJob] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canUseStaff = user?.role === "STAFF";

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "CANCELLED"), [jobs]);
  const todaysJobs = useMemo(() => activeJobs.filter((job) => isToday(job.scheduledDate)), [activeJobs]);
  const upcomingJobs = useMemo(() => activeJobs.filter((job) => isFutureDate(job.scheduledDate)), [activeJobs]);

  useEffect(() => {
    if (!canUseStaff) return;
    void loadJobs();
  }, [canUseStaff]);

  async function loadJobs() {
    setLoading(true);
    setError("");

    try {
      const response = await api.listStaffJobs();
      const visibleJobs = response.bookings.filter(
        (job) => job.status !== "CANCELLED" && (isToday(job.scheduledDate) || isFutureDate(job.scheduledDate)),
      );
      setJobs(response.bookings);
      setSelectedJob((current) => {
        if (current && visibleJobs.some((job) => job.id === current.id)) {
          return visibleJobs.find((job) => job.id === current.id) ?? current;
        }
        return visibleJobs[0] ?? null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load assigned jobs.");
    } finally {
      setLoading(false);
    }
  }

  async function updateJobStatus(id: string, status: BookingStatus) {
    setUpdating(id);
    setMessage("");
    setError("");

    try {
      await api.updateStaffJobStatus(id, status);
      setMessage(status === "COMPLETED" ? "Job completed." : "Job started.");
      await loadJobs();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to update the job.");
    } finally {
      setUpdating("");
    }
  }

  if (!canUseStaff) {
    return <AuthPanel role="STAFF" onLogin={onLogin} />;
  }

  return (
    <div className="view-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>My Jobs</h1>
        </div>
        <button className="primary-button" type="button" onClick={loadJobs} disabled={loading}>
          <RefreshCw size={18} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {message && <p className="toast success">{message}</p>}
      {error && <p className="toast error">{error}</p>}

      <section className="job-sections">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Today</h2>
              <p>Assigned jobs for {user.name}</p>
            </div>
          </div>

          {loading ? (
            <p className="empty-state">Loading assigned jobs...</p>
          ) : (
            <JobList jobs={todaysJobs} emptyText="You have no jobs assigned for today." onSelect={setSelectedJob} selectedJobId={selectedJob?.id} />
          )}

          <div className="panel-heading second-heading">
            <div>
              <h2>Upcoming</h2>
              <p>Future assigned jobs</p>
            </div>
          </div>

          <JobList jobs={upcomingJobs} emptyText="You have no upcoming jobs assigned yet." onSelect={setSelectedJob} selectedJobId={selectedJob?.id} />
        </div>

        <aside className="panel job-detail-card">
          {selectedJob ? (
            <>
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Job Detail</p>
                  <h2>{selectedJob.bookingNumber}</h2>
                </div>
                <StatusBadge status={selectedJob.status} />
              </div>
              <div className="detail-list">
                <div><span>Customer</span><strong>{selectedJob.customer.name}</strong></div>
                <div><span>Phone</span><strong>{selectedJob.customer.phone}</strong></div>
                <div><span>Address</span><strong>{selectedJob.address}</strong></div>
                <div><span>Service</span><strong>{selectedJob.service.name}</strong></div>
                <div><span>Schedule</span><strong>{formatDate(selectedJob.scheduledDate)}, {selectedJob.scheduledStartTime}</strong></div>
              </div>
              <div className="instructions-box">
                <span>Instructions</span>
                <p>{selectedJob.specialInstructions || "No special instructions provided."}</p>
              </div>
              {selectedJob.status === "CONFIRMED" && (
                <button className="primary-button wide" type="button" disabled={updating === selectedJob.id} onClick={() => void updateJobStatus(selectedJob.id, "IN_PROGRESS")}>
                  Start Job
                </button>
              )}
              {selectedJob.status === "IN_PROGRESS" && (
                <button className="primary-button wide" type="button" disabled={updating === selectedJob.id} onClick={() => void updateJobStatus(selectedJob.id, "COMPLETED")}>
                  Mark Completed
                </button>
              )}
            </>
          ) : (
            <p className="empty-state">Select a job to view details.</p>
          )}
        </aside>
      </section>
    </div>
  );
}

type JobListProps = {
  jobs: BookingDetail[];
  emptyText: string;
  selectedJobId?: string;
  onSelect: (job: BookingDetail) => void;
};

function JobList({ jobs, emptyText, selectedJobId, onSelect }: JobListProps) {
  if (!jobs.length) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="job-list">
      {jobs.map((job) => (
        <article
          className={selectedJobId === job.id ? "job-card selected-card" : "job-card"}
          key={job.id}
          onClick={() => onSelect(job)}
        >
          <div className="job-icon">
            <BriefcaseBusiness size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="job-title-row">
              <strong>{job.bookingNumber}</strong>
              <StatusBadge status={job.status} />
            </div>
            <p>{job.customer.name} - {job.service.name}</p>
            <span>{job.scheduledStartTime} - {job.address}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
