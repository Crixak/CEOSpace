import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const stockRouter = Router();
stockRouter.use(requireAuth);

stockRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const lowStockOnly = req.query.lowStock === "true";

    const stocks = await prisma.stock.findMany({
      where: branchId ? { branchId } : undefined,
      include: { product: { include: { category: true } }, branch: true },
      orderBy: { product: { name: "asc" } },
    });

    const withFlag = stocks.map((s) => ({
      ...s,
      lowStock: Number(s.quantity) < Number(s.product.minStock),
    }));

    res.json(lowStockOnly ? withFlag.filter((s) => s.lowStock) : withFlag);
  })
);

const adjustSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  quantity: z.number(), // delta: positive to add, negative to remove
  reason: z.string().optional(),
});

stockRouter.post(
  "/adjust",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = adjustSchema.parse(req.body);
    const authBranchId = resolveBranchId(req);
    if (authBranchId && authBranchId !== data.branchId) {
      throw new HttpError(403, "Cannot adjust stock outside your branch");
    }

    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.upsert({
        where: { productId_branchId: { productId: data.productId, branchId: data.branchId } },
        create: { productId: data.productId, branchId: data.branchId, quantity: data.quantity },
        update: { quantity: { increment: data.quantity } },
      });

      if (Number(stock.quantity) < 0) {
        throw new HttpError(400, "Adjustment would result in negative stock");
      }

      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          branchId: data.branchId,
          type: "ADJUSTMENT",
          quantity: data.quantity,
          refId: data.reason,
        },
      });

      return stock;
    });

    res.json(result);
  })
);
