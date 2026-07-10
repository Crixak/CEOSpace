import { Router } from "express";
import { z } from "zod";
import { OrderType, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";
import { createSaleInTx } from "../sales/sales.service";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const orderInclude = {
  branch: { select: { id: true, name: true } },
  table: { select: { id: true, label: true } },
  user: { select: { id: true, name: true } },
  items: {
    orderBy: { createdAt: "asc" as const },
    include: { product: { include: { prices: true, category: true } } },
  },
} satisfies Prisma.OrderInclude;

function loadOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

/** Verifica que la comanda pertenezca a la sucursal accesible por el usuario. */
function assertBranchAccess(req: Parameters<typeof resolveBranchId>[0], orderBranchId: string) {
  const authBranchId = resolveBranchId(req);
  if (authBranchId && authBranchId !== orderBranchId) {
    throw new HttpError(403, "Comanda fuera de tu sucursal");
  }
}

ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const status = typeof req.query.status === "string" ? req.query.status : "OPEN";
    const orders = await prisma.order.findMany({
      where: {
        branchId,
        status: status === "ALL" ? undefined : (status as never),
      },
      include: orderInclude,
      orderBy: { createdAt: "asc" },
    });
    res.json(orders);
  })
);

ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order) throw new HttpError(404, "Comanda no encontrada");
    assertBranchAccess(req, order.branchId);
    res.json(order);
  })
);

const openSchema = z
  .object({
    type: z.nativeEnum(OrderType),
    branchId: z.string().min(1).optional(),
    tableId: z.string().min(1).optional(),
  })
  .refine((d) => d.type !== "DINE_IN" || !!d.tableId, {
    message: "Se requiere una mesa para comandas en salón",
    path: ["tableId"],
  });

ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = openSchema.parse(req.body);
    const authBranchId = resolveBranchId(req);
    const branchId = authBranchId ?? data.branchId;
    if (!branchId) throw new HttpError(400, "branchId is required");
    if (authBranchId && data.branchId && authBranchId !== data.branchId) {
      throw new HttpError(403, "No podés abrir comandas en otra sucursal");
    }

    if (data.type === "DINE_IN") {
      const table = await prisma.table.findUnique({ where: { id: data.tableId! } });
      if (!table || !table.active) throw new HttpError(400, "Mesa inexistente");
      if (table.branchId !== branchId) throw new HttpError(400, "La mesa es de otra sucursal");

      const openOnTable = await prisma.order.findFirst({
        where: { tableId: table.id, status: "OPEN" },
      });
      if (openOnTable) throw new HttpError(409, "Esa mesa ya tiene una comanda abierta");
    }

    const order = await prisma.order.create({
      data: {
        branchId,
        userId: req.user!.id,
        type: data.type,
        tableId: data.type === "DINE_IN" ? data.tableId : null,
      },
      include: orderInclude,
    });
    res.status(201).json(order);
  })
);

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
});

ordersRouter.post(
  "/:id/items",
  asyncHandler(async (req, res) => {
    const data = addItemSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "Comanda no encontrada");
    assertBranchAccess(req, order.branchId);
    if (order.status !== "OPEN") throw new HttpError(400, "La comanda ya está cerrada");

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product || !product.active) throw new HttpError(400, "Producto inexistente");

    // Acumula: si el producto ya está en la comanda, suma la cantidad
    const existing = await prisma.orderItem.findFirst({
      where: { orderId: order.id, productId: data.productId },
    });
    if (existing) {
      await prisma.orderItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: data.quantity } },
      });
    } else {
      await prisma.orderItem.create({
        data: { orderId: order.id, productId: data.productId, quantity: data.quantity },
      });
    }

    res.status(201).json(await loadOrder(order.id));
  })
);

ordersRouter.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "Comanda no encontrada");
    assertBranchAccess(req, order.branchId);
    if (order.status !== "OPEN") throw new HttpError(400, "La comanda ya está cerrada");

    const item = await prisma.orderItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || item.orderId !== order.id) throw new HttpError(404, "Item no encontrado");

    await prisma.orderItem.delete({ where: { id: item.id } });
    res.json(await loadOrder(order.id));
  })
);

const closeSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod).default("OTHER"),
});

ordersRouter.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const data = closeSchema.parse(req.body);
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) throw new HttpError(404, "Comanda no encontrada");
    assertBranchAccess(req, order.branchId);
    if (order.status !== "OPEN") throw new HttpError(400, "La comanda ya está cerrada");
    if (order.items.length === 0) throw new HttpError(400, "La comanda no tiene productos");

    const result = await prisma.$transaction(async (tx) => {
      const sale = await createSaleInTx(tx, {
        branchId: order.branchId,
        userId: req.user!.id,
        paymentMethod: data.paymentMethod,
        items: order.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CLOSED", saleId: sale.id, closedAt: new Date() },
      });
      return sale;
    });

    const fullSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: { items: { include: { product: true } }, branch: true },
    });
    res.json(fullSale);
  })
);

ordersRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "Comanda no encontrada");
    assertBranchAccess(req, order.branchId);
    if (order.status !== "OPEN") throw new HttpError(400, "La comanda ya está cerrada");

    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    res.status(204).send();
  })
);
