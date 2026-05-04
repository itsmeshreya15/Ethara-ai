import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

function formatError(e) {
  const d = e.data?.error;
  if (typeof d === "string") return d;
  if (d?.formErrors?.length) return d.formErrors.join("; ");
  if (d?.fieldErrors) {
    const parts = Object.entries(d.fieldErrors).flatMap(([k, v]) => v.map((x) => `${k}: ${x}`));
    if (parts.length) return parts.join("; ");
  }
  return e.message || "Something went wrong";
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="layout" style={{ maxWidth: 420 }}>
      <h1>Log in</h1>
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
      {error && <div className="alert">{error}</div>}
      <form className="card form-stack" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
