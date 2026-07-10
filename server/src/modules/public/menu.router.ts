import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";
import { getCurrentTier, resolveTierPrices } from "../../lib/pricing";

/**
 * Carta pública: sin autenticación, pensada para el QR que escanean los
 * clientes desde la mesa. Solo expone lo necesario para mostrar el menú.
 */
export const publicMenuRouter = Router();

publicMenuRouter.get(
  "/menu/:branchId",
  asyncHandler(async (req, res) => {
    const branch = await prisma.branch.findUnique({ where: { id: req.params.branchId } });
    if (!branch) throw new HttpError(404, "Sucursal no encontrada");

    const tier = getCurrentTier();

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: "asc" },
          include: { prices: true },
        },
      },
    });

    res.json({
      branch: { id: branch.id, name: branch.name, address: branch.address, phone: branch.phone },
      tier,
      categories: categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          items: c.products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            vegetarian: p.vegetarian,
            unit: p.unit,
            ...resolveTierPrices(p, tier),
          })),
        })),
    });
  })
);
