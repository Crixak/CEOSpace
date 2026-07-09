import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const branchesRouter = Router();
branchesRouter.use(requireAuth);

const branchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

branchesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
    res.json(branches);
  })
);

branchesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = branchSchema.parse(req.body);
    const branch = await prisma.branch.create({ data });
    res.status(201).json(branch);
  })
);

branchesRouter.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = branchSchema.partial().parse(req.body);
    const branch = await prisma.branch
      .update({ where: { id: req.params.id }, data })
      .catch(() => null);
    if (!branch) throw new HttpError(404, "Branch not found");
    res.json(branch);
  })
);

branchesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.branch.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, "Branch not found");
    });
    res.status(204).send();
  })
);
