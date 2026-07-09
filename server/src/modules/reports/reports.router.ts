import { Request, Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, resolveBranchId } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

function dateRange(req: Request) {
  const { from, to } = req.query;
  return {
    gte: typeof from === "string" ? new Date(from) : undefined,
    lte: typeof to === "string" ? new Date(to) : undefined,
  };
}

reportsRouter.get(
  "/sales-summary",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const createdAt = dateRange(req);

    const sales = await prisma.sale.findMany({
      where: { branchId, createdAt },
      select: { total: true, createdAt: true },
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const byDay = new Map<string, number>();
    for (const sale of sales) {
      const day = sale.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + Number(sale.total));
    }

    res.json({
      totalSales,
      salesCount: sales.length,
      byDay: Array.from(byDay.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  })
);

reportsRouter.get(
  "/top-products",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const createdAt = dateRange(req);
    const limit = Number(req.query.limit ?? 10);

    const items = await prisma.saleItem.findMany({
      where: { sale: { branchId, createdAt } },
      select: { productId: true, quantity: true, subtotal: true, product: { select: { name: true } } },
    });

    const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of items) {
      const entry = byProduct.get(item.productId) ?? {
        name: item.product.name,
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += Number(item.quantity);
      entry.revenue += Number(item.subtotal);
      byProduct.set(item.productId, entry);
    }

    const top = Array.from(byProduct.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json(top);
  })
);

reportsRouter.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const stocks = await prisma.stock.findMany({
      where: branchId ? { branchId } : undefined,
      include: { product: true, branch: true },
    });
    const lowStock = stocks
      .filter((s) => Number(s.quantity) < Number(s.product.minStock))
      .map((s) => ({
        productId: s.productId,
        productName: s.product.name,
        branchId: s.branchId,
        branchName: s.branch.name,
        quantity: Number(s.quantity),
        minStock: Number(s.product.minStock),
      }));
    res.json(lowStock);
  })
);

reportsRouter.get(
  "/inventory-value",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const stocks = await prisma.stock.findMany({
      where: branchId ? { branchId } : undefined,
      include: { product: true },
    });
    const totalValue = stocks.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.product.costPrice),
      0
    );
    res.json({ totalValue, itemsCount: stocks.length });
  })
);
