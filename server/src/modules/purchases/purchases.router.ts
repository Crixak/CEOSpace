import { Router } from "express";
import { z } from "zod";
import { PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const purchasesRouter = Router();
purchasesRouter.use(requireAuth, requireRole("ADMIN", "MANAGER"));

const createSchema = z.object({
  supplierId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1),
});

purchasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const { status } = req.query;
    const parsedStatus =
      typeof status === "string" && status in PurchaseOrderStatus
        ? (status as PurchaseOrderStatus)
        : undefined;
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        branchId,
        status: parsedStatus,
      },
      include: { supplier: true, branch: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  })
);

purchasesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, branch: true, items: { include: { product: true } } },
    });
    if (!order) throw new HttpError(404, "Purchase order not found");
    res.json(order);
  })
);

purchasesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const authBranchId = resolveBranchId(req);
    const branchId = authBranchId ?? data.branchId;
    if (!branchId) throw new HttpError(400, "branchId is required");
    if (authBranchId && data.branchId && authBranchId !== data.branchId) {
      throw new HttpError(403, "Cannot create a purchase order outside your branch");
    }

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        branchId,
        items: { create: data.items },
      },
      include: { items: true },
    });
    res.status(201).json(order);
  })
);

purchasesRouter.post(
  "/:id/receive",
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) throw new HttpError(404, "Purchase order not found");
    if (order.status !== "PENDING") {
      throw new HttpError(400, "Only pending purchase orders can be received");
    }
    const authBranchId = resolveBranchId(req);
    if (authBranchId && authBranchId !== order.branchId) {
      throw new HttpError(403, "Cannot receive a purchase order outside your branch");
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.stock.upsert({
          where: { productId_branchId: { productId: item.productId, branchId: order.branchId } },
          create: { productId: item.productId, branchId: order.branchId, quantity: item.quantity },
          update: { quantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            branchId: order.branchId,
            type: "PURCHASE",
            quantity: item.quantity,
            refId: order.id,
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
        include: { items: true, supplier: true, branch: true },
      });
    });

    res.json(updated);
  })
);

purchasesRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "Purchase order not found");
    if (order.status !== "PENDING") {
      throw new HttpError(400, "Only pending purchase orders can be cancelled");
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  })
);
