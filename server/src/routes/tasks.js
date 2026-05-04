import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loadProjectMembership,
  requireProjectMember,
  requireProjectAdmin,
} from "../middleware/projectAccess.js";

const router = Router();

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().cuid().nullable().optional(),
});

router.use(requireAuth);

router.get("/:projectId/tasks", loadProjectMembership, requireProjectMember, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return res.json({ tasks });
});

router.post("/:projectId/tasks", loadProjectMembership, requireProjectMember, async (req, res) => {
  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { title, description, status, dueDate, assigneeId } = parsed.data;
  const projectId = req.params.projectId;
  if (assigneeId) {
    const assigneeMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: assigneeId, projectId } },
    });
    if (!assigneeMember) {
      return res.status(400).json({ error: "Assignee must be a project member" });
    }
  }
  const isMember = req.projectMembership.role === "MEMBER";
  if (isMember && assigneeId && assigneeId !== req.userId) {
    return res.status(403).json({ error: "Members can only assign tasks to themselves" });
  }
  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      status: status ?? "TODO",
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      assigneeId: assigneeId ?? null,
      createdById: req.userId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });
  return res.status(201).json({ task });
});

async function getTaskOr404(projectId, taskId) {
  return prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: { project: true },
  });
}

router.patch(
  "/:projectId/tasks/:taskId",
  loadProjectMembership,
  requireProjectMember,
  async (req, res) => {
    const parsed = taskUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const task = await getTaskOr404(req.params.projectId, req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    const isAdmin = req.projectMembership.role === "ADMIN";
    const isAssignee = task.assigneeId === req.userId;
    const isCreator = task.createdById === req.userId;
    if (!isAdmin && !isAssignee && !isCreator) {
      return res.status(403).json({ error: "You can only edit tasks you created, are assigned to, or admin all" });
    }
    const body = parsed.data;
    if (body.assigneeId !== undefined && body.assigneeId !== null) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: body.assigneeId, projectId: req.params.projectId } },
      });
      if (!assigneeMember) {
        return res.status(400).json({ error: "Assignee must be a project member" });
      }
    }
    if (!isAdmin) {
      if (body.assigneeId !== undefined && body.assigneeId !== req.userId && body.assigneeId !== null) {
        return res.status(403).json({ error: "Members cannot reassign to others" });
      }
    }
    const data = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const updated = await prisma.task.update({
      where: { id: task.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return res.json({ task: updated });
  }
);

router.delete(
  "/:projectId/tasks/:taskId",
  loadProjectMembership,
  requireProjectAdmin,
  async (req, res) => {
    const task = await getTaskOr404(req.params.projectId, req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    await prisma.task.delete({ where: { id: task.id } });
    return res.status(204).send();
  }
);

export default router;
