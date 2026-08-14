import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import type { PublicUser } from "../types/domain";

export type AppView = "dashboard" | "booking" | "staff" | "schedule";

type AppShellProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  user: PublicUser | null;
  onLogout: () => void;
  children: ReactNode;
};

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Operations", icon: LayoutDashboard },
  { id: "booking", label: "Public Booking", icon: ClipboardList },
  { id: "staff", label: "Staff Jobs", icon: BriefcaseBusiness },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
];

export function AppShell({ activeView, onViewChange, user, onLogout, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <img className="brand-mark" src="/serviceflow-mark.svg" alt="" aria-hidden="true" />
          <div>
            <strong>ServiceFlow</strong>
            <span>Booking Operations</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? "nav-button active" : "nav-button"}
                type="button"
                onClick={() => onViewChange(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="session-card">
          {user ? (
            <>
              <div className="session-user">
                <UserRound size={18} aria-hidden="true" />
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.role === "ADMIN" ? "Admin" : "Staff"}</span>
                </div>
              </div>
              <button className="ghost-button" type="button" onClick={onLogout}>
                <LogOut size={16} aria-hidden="true" />
                Logout
              </button>
            </>
          ) : (
            <p>Log in to manage operations or staff jobs.</p>
          )}
        </div>
      </aside>

      <main className="main-panel">{children}</main>
    </div>
  );
}
