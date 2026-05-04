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

const createProjectSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  description: z.string().max(2000).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
});

router.use(requireAuth);

router.get("/", async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.userId },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
        },
      },
    },
    orderBy: { project: { createdAt: "desc" } },
  });
  const projects = memberships.map((m) => {
    const { _count, ...rest } = m.project;
    return {
      ...rest,
      myRole: m.role,
      taskCount: _count.tasks,
      memberCount: _count.members,
    };
  });
  return res.json({ projects });
});

router.post("/", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, description } = parsed.data;
  const project = await prisma.project.create({
    data: {
      name,
      description: description ?? null,
      ownerId: req.userId,
      members: {
        create: { userId: req.userId, role: "ADMIN" },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  return res.status(201).json({ project });
});

router.get("/:projectId", loadProjectMembership, requireProjectMember, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return res.json({
    project,
    myRole: req.projectMembership.role,
  });
});

router.patch("/:projectId", loadProjectMembership, requireProjectAdmin, async (req, res) => {
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }
  const project = await prisma.project.update({
    where: { id: req.params.projectId },
    data,
  });
  return res.json({ project });
});

router.delete("/:projectId", loadProjectMembership, requireProjectAdmin, async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.projectId } });
  return res.status(204).send();
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).optional().default("MEMBER"),
});

router.post("/:projectId/members", loadProjectMembership, requireProjectAdmin, async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, role } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(404).json({ error: "No user with that email. They must sign up first." });
  }
  const projectId = req.params.projectId;
  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  });
  if (existing) {
    return res.status(409).json({ error: "User is already a member" });
  }
  const member = await prisma.projectMember.create({
    data: { userId: user.id, projectId, role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  return res.status(201).json({ member });
});

const roleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

router.patch(
  "/:projectId/members/:userId",
  loadProjectMembership,
  requireProjectAdmin,
  async (req, res) => {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const targetId = req.params.userId;
    if (targetId === req.userId) {
      return res.status(400).json({ error: "Cannot change your own role this way" });
    }
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (targetId === project.ownerId && parsed.data.role !== "ADMIN") {
      return res.status(400).json({ error: "Project owner must remain an admin" });
    }
    const member = await prisma.projectMember.update({
      where: { userId_projectId: { userId: targetId, projectId: req.params.projectId } },
      data: { role: parsed.data.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return res.json({ member });
  }
);

router.delete(
  "/:projectId/members/:userId",
  loadProjectMembership,
  requireProjectMember,
  async (req, res) => {
    const targetId = req.params.userId;
    const isSelf = targetId === req.userId;
    const isAdmin = req.projectMembership.role === "ADMIN";
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Only admins can remove other members" });
    }
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (targetId === project.ownerId && !isSelf) {
      return res.status(400).json({ error: "Cannot remove the project owner" });
    }
    if (targetId === project.ownerId && isSelf) {
      return res
        .status(400)
        .json({ error: "Project owner cannot leave the team; delete the project or transfer ownership first" });
    }
    await prisma.projectMember.delete({
      where: { userId_projectId: { userId: targetId, projectId: req.params.projectId } },
    });
    return res.status(204).send();
  }
);

export default router;
