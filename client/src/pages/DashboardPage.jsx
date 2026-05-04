import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.dashboard();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <>
        <h1>Dashboard</h1>
        <div className="alert">{error}</div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <h1>Dashboard</h1>
        <p className="muted">Loading summary…</p>
      </>
    );
  }

  const { summary, byProject } = data;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">Tasks across all projects you belong to, plus what needs attention.</p>

      <div className="grid cols-4" style={{ marginTop: "1.25rem" }}>
        <div className="card stat">
          <div className="num">{summary.totalTasks}</div>
          <div className="lbl">Total tasks</div>
        </div>
        <div className="card stat">
          <div className="num">{summary.todo}</div>
          <div className="lbl">To do</div>
        </div>
        <div className="card stat">
          <div className="num">{summary.inProgress}</div>
          <div className="lbl">In progress</div>
        </div>
        <div className="card stat">
          <div className="num">{summary.done}</div>
          <div className="lbl">Done</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: "1rem" }}>
        <div className="card stat">
          <div className="num" style={{ color: "var(--danger)" }}>
            {summary.overdue}
          </div>
          <div className="lbl">Overdue (not done)</div>
        </div>
        <div className="card stat">
          <div className="num" style={{ color: "var(--warning)" }}>
            {summary.dueSoon}
          </div>
          <div className="lbl">Due in next 3 days</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Open tasks assigned to you</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {summary.myAssignedOpen} open task{summary.myAssignedOpen === 1 ? "" : "s"} with your name on
          them.
        </p>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Per project</h2>
        {byProject.length === 0 ? (
          <p className="muted">Join or create a project to see breakdowns.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Your role</th>
                <th>Tasks</th>
                <th>To do</th>
                <th>In prog.</th>
                <th>Done</th>
                <th>Overdue</th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((p) => (
                <tr key={p.projectId}>
                  <td>
                    <Link to={`/projects/${p.projectId}`}>{p.projectName}</Link>
                  </td>
                  <td>
                    <span className={`badge ${p.myRole === "ADMIN" ? "admin" : ""}`}>{p.myRole}</span>
                  </td>
                  <td>{p.total}</td>
                  <td>{p.todo}</td>
                  <td>{p.inProgress}</td>
                  <td>{p.done}</td>
                  <td>{p.overdue > 0 ? <span className="badge overdue">{p.overdue}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
