import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";
import { getCurrentTier } from "../../lib/pricing";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get("/current-tier", (_req, res) => {
  res.json({ tier: getCurrentTier() });
});

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  unit: z.enum(["KG", "UNIT"]),
  price: z.number().positive(),
  costPrice: z.number().nonnegative(),
  minStock: z.number().nonnegative().default(0),
});

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { categoryId, active } = req.query;
    const products = await prisma.product.findMany({
      where: {
        categoryId: typeof categoryId === "string" ? categoryId : undefined,
        active: active === undefined ? true : active === "true",
      },
      include: { category: true, prices: true },
      orderBy: { name: "asc" },
    });
    res.json(products);
  })
);

productsRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  })
);

productsRouter.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product
      .update({ where: { id: req.params.id }, data })
      .catch(() => null);
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.product
      .update({ where: { id: req.params.id }, data: { active: false } })
      .catch(() => {
        throw new HttpError(404, "Product not found");
      });
    res.status(204).send();
  })
);
