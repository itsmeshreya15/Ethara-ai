import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function formatError(e) {
  const d = e.data?.error;
  if (typeof d === "string") return d;
  if (d?.fieldErrors) {
    const parts = Object.entries(d.fieldErrors).flatMap(([k, v]) => v.map((x) => `${k}: ${x}`));
    if (parts.length) return parts.join("; ");
  }
  return e.message || "Error";
}

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"];

function statusBadgeClass(s) {
  if (s === "DONE") return "done";
  if (s === "IN_PROGRESS") return "progress";
  return "todo";
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api.project(projectId);
    setPayload(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.project(projectId);
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load project");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const isAdmin = payload?.myRole === "ADMIN";
  const project = payload?.project;

  const memberOptions = useMemo(() => {
    if (!project?.members) return [];
    return project.members.map((m) => ({
      value: m.user.id,
      label: `${m.user.name} (${m.user.email})`,
    }));
  }, [project]);

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === "DONE") return false;
    return new Date(task.dueDate) < startOfToday;
  };

  const invite = async (ev) => {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.inviteMember(projectId, { email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const createTask = async (ev) => {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = {
        title: taskTitle,
        description: taskDesc || null,
        dueDate: taskDue ? new Date(taskDue).toISOString() : null,
        assigneeId: assigneeId || null,
      };
      await api.createTask(projectId, body);
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      setAssigneeId("");
      await load();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const patchTask = async (taskId, body) => {
    setError("");
    try {
      await api.updateTask(projectId, taskId, body);
      await load();
    } catch (e) {
      setError(formatError(e));
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    try {
      await api.deleteTask(projectId, taskId);
      await load();
    } catch (e) {
      setError(formatError(e));
    }
  };

  const removeMember = async (uid) => {
    if (!window.confirm("Remove this member from the project?")) return;
    setError("");
    try {
      await api.removeMember(projectId, uid);
      await load();
    } catch (e) {
      setError(formatError(e));
    }
  };

  const changeRole = async (uid, role) => {
    setError("");
    try {
      await api.updateMemberRole(projectId, uid, { role });
      await load();
    } catch (e) {
      setError(formatError(e));
    }
  };

  const saveProject = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const name = fd.get("pname");
    const description = fd.get("pdesc") || null;
    setError("");
    try {
      await api.updateProject(projectId, { name, description });
      await load();
    } catch (e) {
      setError(formatError(e));
    }
  };

  const deleteProject = async () => {
    if (!window.confirm("Delete this entire project and all tasks?")) return;
    setError("");
    try {
      await api.deleteProject(projectId);
      window.location.href = "/projects";
    } catch (e) {
      setError(formatError(e));
    }
  };

  if (error && !project) {
    return (
      <>
        <p>
          <Link to="/projects">← Projects</Link>
        </p>
        <div className="alert">{error}</div>
      </>
    );
  }

  if (!project) {
    return (
      <p className="muted">
        <Link to="/projects">← Projects</Link> · Loading…
      </p>
    );
  }

  return (
    <>
      <p className="muted">
        <Link to="/projects">← Projects</Link>
      </p>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ marginBottom: 0 }}>{project.name}</h1>
        <span className={`badge ${isAdmin ? "admin" : ""}`}>{payload.myRole}</span>
      </div>
      {project.description && <p className="muted">{project.description}</p>}

      {error && <div className="alert">{error}</div>}

      {isAdmin && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>Project settings</h2>
          <form onSubmit={saveProject} className="form-stack" style={{ maxWidth: 520 }}>
            <div>
              <label>Name</label>
              <input name="pname" key={project.name} defaultValue={project.name} required />
            </div>
            <div>
              <label>Description</label>
              <textarea name="pdesc" key={project.description || ""} defaultValue={project.description || ""} />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary">
                Save changes
              </button>
              <button type="button" className="btn btn-danger" onClick={deleteProject}>
                Delete project
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Team</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              {isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {project.members.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.user.name}
                  <div className="muted" style={{ fontSize: "0.82rem" }}>
                    {m.user.email}
                  </div>
                </td>
                <td>
                  {isAdmin && m.user.id !== user.id ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.user.id, e.target.value)}
                      aria-label={`Role for ${m.user.name}`}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  ) : (
                    <span className={`badge ${m.role === "ADMIN" ? "admin" : ""}`}>{m.role}</span>
                  )}
                </td>
                {isAdmin && (
                  <td>
                    {m.user.id !== project.ownerId && (
                      <button type="button" className="btn btn-ghost" onClick={() => removeMember(m.user.id)}>
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {isAdmin && (
          <form className="inline-form cols" style={{ marginTop: "1rem" }} onSubmit={invite}>
            <div>
              <label>Invite by email (user must already be registered)</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="colleague@company.com"
              />
            </div>
            <div>
              <label>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Add member
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Tasks</h2>
        <p className="muted">
          Admins can assign anyone and delete tasks. Members can create tasks and edit tasks they created or are
          assigned to; they may only assign new tasks to themselves.
        </p>

        <form onSubmit={createTask} className="form-stack" style={{ marginTop: "0.75rem", maxWidth: 640 }}>
          <div>
            <label>Title</label>
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
          </div>
          <div>
            <label>Description</label>
            <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
          </div>
          <div className="grid cols-2">
            <div>
              <label>Due date</label>
              <input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            </div>
            <div>
              <label>Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {memberOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Add task
          </button>
        </form>

        <table className="table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Due</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {project.tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.title}</strong>
                  {t.description && (
                    <div className="muted" style={{ fontSize: "0.82rem", marginTop: "0.2rem" }}>
                      {t.description}
                    </div>
                  )}
                </td>
                <td>
                  <select
                    value={t.status}
                    onChange={(e) => patchTask(t.id, { status: e.target.value })}
                    className={`badge ${statusBadgeClass(t.status)}`}
                    style={{ textTransform: "none", fontSize: "0.85rem", padding: "0.35rem" }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={t.assigneeId || ""}
                    onChange={(e) =>
                      patchTask(t.id, { assigneeId: e.target.value === "" ? null : e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="datetime-local"
                    defaultValue={t.dueDate ? t.dueDate.slice(0, 16) : ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      patchTask(t.id, { dueDate: v ? new Date(v).toISOString() : null });
                    }}
                  />
                  {isOverdue(t) && (
                    <div>
                      <span className="badge overdue">Overdue</span>
                    </div>
                  )}
                </td>
                <td>
                  {isAdmin && (
                    <button type="button" className="btn btn-ghost" onClick={() => deleteTask(t.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {project.tasks.length === 0 && <p className="muted">No tasks yet.</p>}
      </div>
    </>
  );
}
