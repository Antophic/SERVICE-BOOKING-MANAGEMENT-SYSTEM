import { useEffect, useState } from "react";
import { api } from "./api/client";
import { AppShell, type AppView } from "./components/AppShell";
import { OperationsDashboard } from "./pages/OperationsDashboard";
import { PublicBookingPreview } from "./pages/PublicBookingPreview";
import { SchedulePreview } from "./pages/SchedulePreview";
import { StaffJobsPreview } from "./pages/StaffJobsPreview";
import type { PublicUser } from "./types/domain";

export function App() {
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    void api
      .getMe()
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setLoadingSession(false));
  }, []);

  async function handleLogout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    setActiveView("booking");
  }

  if (loadingSession) {
    return (
      <div className="boot-screen">
        <strong>ServiceFlow</strong>
        <span>Restoring session...</span>
      </div>
    );
  }

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView} user={user} onLogout={handleLogout}>
      {activeView === "dashboard" && <OperationsDashboard user={user} onLogin={setUser} />}
      {activeView === "booking" && <PublicBookingPreview />}
      {activeView === "staff" && <StaffJobsPreview user={user} onLogin={setUser} />}
      {activeView === "schedule" && <SchedulePreview user={user} onLogin={setUser} />}
    </AppShell>
  );
}
