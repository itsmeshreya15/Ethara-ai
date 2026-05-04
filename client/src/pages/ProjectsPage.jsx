import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function formatError(e) {
  const d = e.data?.error;
  if (typeof d === "string") return d;
  if (d?.fieldErrors) {
    const parts = Object.entries(d.fieldErrors).flatMap(([k, v]) => v.map((x) => `${k}: ${x}`));
    if (parts.length) return parts.join("; ");
  }
  return e.message || "Error";
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { projects: list } = await api.projects();
    setProjects(list);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const create = async (ev) => {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createProject({ name, description: description || null });
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Projects</h1>
      <p className="muted">You are added as Admin when you create a project. Invite teammates by email.</p>

      {error && <div className="alert">{error}</div>}

      <form className="card inline-form cols" onSubmit={create} style={{ marginBottom: "1.25rem" }}>
        <div>
          <label>New project name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Website launch" />
        </div>
        <div>
          <label>Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary"
          />
        </div>
        <div className="row" style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>

      <div className="card">
        <h2>Your projects</h2>
        {projects.length === 0 ? (
          <p className="muted">No projects yet. Create one above.</p>
        ) : (
          <div className="link-list">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                  <span>{p.name}</span>
                  <span className="muted">
                    <span className={`badge ${p.myRole === "ADMIN" ? "admin" : ""}`}>{p.myRole}</span>{" "}
                    · {p.taskCount} tasks · {p.memberCount} members
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
