import { Router } from "express";
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";
import { getCurrentTier, resolveUnitPrice } from "../../lib/pricing";

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

    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
      include: { prices: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const tier = getCurrentTier();

    const sale = await prisma.$transaction(async (tx) => {
      let total = 0;
      const itemsData = data.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new HttpError(400, `Product ${item.productId} not found`);
        const unitPrice = resolveUnitPrice(product, tier, data.paymentMethod);
        const subtotal = unitPrice * item.quantity;
        total += subtotal;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      });

      const created = await tx.sale.create({
        data: {
          branchId,
          userId: req.user!.id,
          total,
          paymentMethod: data.paymentMethod,
          priceTier: tier,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const item of itemsData) {
        const stock = await tx.stock.findUnique({
          where: { productId_branchId: { productId: item.productId, branchId } },
        });
        if (!stock || Number(stock.quantity) < item.quantity) {
          throw new HttpError(400, `Insufficient stock for product ${item.productId}`);
        }
        await tx.stock.update({
          where: { productId_branchId: { productId: item.productId, branchId } },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            branchId,
            type: "SALE",
            quantity: -item.quantity,
            refId: created.id,
          },
        });
      }

      return created;
    });

    res.status(201).json(sale);
  })
);
