import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.userId },
    select: { projectId: true, role: true, project: { select: { id: true, name: true } } },
  });
  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return res.json({
      summary: {
        totalTasks: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        overdue: 0,
        dueSoon: 0,
        myAssignedOpen: 0,
      },
      byProject: [],
    });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      projectId: true,
      assigneeId: true,
      project: { select: { name: true } },
    },
  });

  let overdue = 0;
  let dueSoon = 0;
  let myAssignedOpen = 0;
  const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const inThreeDays = new Date(startOfDay);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  for (const t of tasks) {
    statusCounts[t.status]++;
    if (t.dueDate && t.status !== "DONE") {
      const due = new Date(t.dueDate);
      if (due < startOfDay) overdue++;
      else if (due >= startOfDay && due <= inThreeDays) dueSoon++;
    }
    if (t.assigneeId === req.userId && t.status !== "DONE") {
      myAssignedOpen++;
    }
  }

  const byProjectMap = new Map();
  for (const m of memberships) {
    byProjectMap.set(m.projectId, {
      projectId: m.projectId,
      projectName: m.project.name,
      myRole: m.role,
      total: 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      overdue: 0,
    });
  }
  for (const t of tasks) {
    const row = byProjectMap.get(t.projectId);
    if (!row) continue;
    row.total++;
    if (t.status === "TODO") row.todo++;
    else if (t.status === "IN_PROGRESS") row.inProgress++;
    else row.done++;
    if (t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < startOfDay) row.overdue++;
  }

  return res.json({
    summary: {
      totalTasks: tasks.length,
      todo: statusCounts.TODO,
      inProgress: statusCounts.IN_PROGRESS,
      done: statusCounts.DONE,
      overdue,
      dueSoon,
      myAssignedOpen,
    },
    byProject: Array.from(byProjectMap.values()),
  });
});

export default router;
