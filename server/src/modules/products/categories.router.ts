import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

const categorySchema = z.object({ name: z.string().min(1) });

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  })
);

categoriesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  })
);

categoriesRouter.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category
      .update({ where: { id: req.params.id }, data })
      .catch(() => null);
    if (!category) throw new HttpError(404, "Category not found");
    res.json(category);
  })
);

categoriesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, "Category not found");
    });
    res.status(204).send();
  })
);
