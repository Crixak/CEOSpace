import { PaymentMethod, Prisma } from "@prisma/client";
import { getCurrentTier, resolveUnitPrice } from "../../lib/pricing";
import { HttpError } from "../../middleware/errorHandler";

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

/**
 * Crea una venta (con sus items), aplica los precios de la franja vigente y la
 * forma de pago, y descuenta stock SOLO de los productos que llevan control de
 * stock (`tracksStock`). Los platos preparados no bloquean la venta.
 *
 * Debe ejecutarse dentro de una transacción (`prisma.$transaction`).
 */
export async function createSaleInTx(
  tx: Prisma.TransactionClient,
  params: {
    branchId: string;
    userId: string;
    paymentMethod: PaymentMethod;
    items: SaleItemInput[];
  }
) {
  const { branchId, userId, paymentMethod, items } = params;

  const products = await tx.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { prices: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const tier = getCurrentTier();

  let total = 0;
  const itemsData = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new HttpError(400, `Product ${item.productId} not found`);
    const unitPrice = resolveUnitPrice(product, tier, paymentMethod);
    const subtotal = unitPrice * item.quantity;
    total += subtotal;
    return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal };
  });

  const sale = await tx.sale.create({
    data: {
      branchId,
      userId,
      total,
      paymentMethod,
      priceTier: tier,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    if (!product.tracksStock) continue;

    const stock = await tx.stock.findUnique({
      where: { productId_branchId: { productId: item.productId, branchId } },
    });
    if (!stock || Number(stock.quantity) < item.quantity) {
      throw new HttpError(400, `Insufficient stock for product ${product.name}`);
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
        refId: sale.id,
      },
    });
  }

  return sale;
}
