import { Router } from "express";
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";
import { createSaleInTx } from "./sales.service";

export const salesRouter = Router();
salesRouter.use(requireAuth);

const createSaleSchema = z.object({
  branchId: z.string().min(1).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default("OTHER"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
      })
    )
    .min(1),
});

salesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const { from, to } = req.query;

    const sales = await prisma.sale.findMany({
      where: {
        branchId,
        createdAt: {
          gte: typeof from === "string" ? new Date(from) : undefined,
          lte: typeof to === "string" ? new Date(to) : undefined,
        },
      },
      include: { user: { select: { id: true, name: true } }, branch: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  })
);

salesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true } },
        branch: true,
      },
    });
    if (!sale) throw new HttpError(404, "Sale not found");
    res.json(sale);
  })
);

salesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSaleSchema.parse(req.body);
    const authBranchId = resolveBranchId(req);
    const branchId = authBranchId ?? data.branchId;
    if (!branchId) throw new HttpError(400, "branchId is required");
    if (authBranchId && data.branchId && authBranchId !== data.branchId) {
      throw new HttpError(403, "Cannot register a sale outside your branch");
    }

    const sale = await prisma.$transaction((tx) =>
      createSaleInTx(tx, {
        branchId,
        userId: req.user!.id,
        paymentMethod: data.paymentMethod,
        items: data.items,
      })
    );

    res.status(201).json(sale);
  })
);
