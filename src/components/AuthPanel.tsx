import { useState } from "react";
import type { FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { api } from "../api/client";
import type { PublicUser, Role } from "../types/domain";

type AuthPanelProps = {
  role: Role;
  onLogin: (user: PublicUser) => void;
};

const demoAccount = {
  ADMIN: "admin@serviceflow.test",
  STAFF: "james@serviceflow.test",
};

export function AuthPanel({ role, onLogin }: AuthPanelProps) {
  const [email, setEmail] = useState(demoAccount[role]);
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(email, password);
      onLogin(response.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-icon">
        <LockKeyhole size={24} aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">{role === "ADMIN" ? "Admin Access" : "Staff Access"}</p>
        <h1>{role === "ADMIN" ? "Log in to manage operations" : "Log in to view assigned jobs"}</h1>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button wide" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="demo-credentials">
        <strong>Demo Credentials</strong>
        <span>{demoAccount[role]}</span>
        <span>Password123!</span>
      </div>
    </section>
  );
}
