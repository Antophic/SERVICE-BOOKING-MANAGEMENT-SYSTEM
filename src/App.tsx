import { useEffect, useState } from "react";
import { api } from "./api/client";
import { AppShell, type AppView } from "./components/AppShell";
import { OperationsDashboard } from "./pages/OperationsDashboard";
import { PublicBookingPreview } from "./pages/PublicBookingPreview";
import { SchedulePreview } from "./pages/SchedulePreview";
import { StaffJobsPreview } from "./pages/StaffJobsPreview";
import type { PublicUser } from "./types/domain";

const viewPaths: Record<AppView, string> = {
  dashboard: "/",
  booking: "/book",
  staff: "/staff",
  schedule: "/schedule",
};

function viewFromPath(pathname: string): AppView {
  if (pathname.startsWith("/book")) return "booking";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/schedule")) return "schedule";
  return "dashboard";
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>(() => viewFromPath(window.location.pathname));
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    void api
      .getMe()
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    const handlePopState = () => setActiveView(viewFromPath(window.location.pathname));

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleViewChange(view: AppView) {
    setActiveView(view);

    const path = viewPaths[view];
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  }

  async function handleLogout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    handleViewChange("booking");
  }

  if (loadingSession) {
    return (
      <div className="boot-screen">
        <img className="boot-logo" src="/serviceflow-mark.svg" alt="" aria-hidden="true" />
        <strong>ServiceFlow</strong>
        <span>Restoring session...</span>
      </div>
    );
  }

  return (
    <AppShell activeView={activeView} onViewChange={handleViewChange} user={user} onLogout={handleLogout}>
      {activeView === "dashboard" && <OperationsDashboard user={user} onLogin={setUser} />}
      {activeView === "booking" && <PublicBookingPreview />}
      {activeView === "staff" && <StaffJobsPreview user={user} onLogin={setUser} />}
      {activeView === "schedule" && <SchedulePreview user={user} onLogin={setUser} />}
    </AppShell>
  );
}
