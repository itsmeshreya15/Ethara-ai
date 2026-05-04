import { prisma } from "../lib/prisma.js";

/** Attaches membership { role } or null; requires requireAuth first */
export async function loadProjectMembership(req, res, next) {
  const projectId = req.params.projectId;
  if (!projectId) {
    return res.status(400).json({ error: "Missing project id" });
  }
  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: req.userId, projectId },
    },
  });
  req.projectMembership = membership;
  next();
}

export function requireProjectMember(req, res, next) {
  if (!req.projectMembership) {
    return res.status(403).json({ error: "Not a member of this project" });
  }
  next();
}

export function requireProjectAdmin(req, res, next) {
  if (!req.projectMembership || req.projectMembership.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}
