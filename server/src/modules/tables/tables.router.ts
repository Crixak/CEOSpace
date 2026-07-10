import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const tablesRouter = Router();
tablesRouter.use(requireAuth);

const tableSchema = z.object({
  label: z.string().min(1),
  branchId: z.string().min(1).optional(),
});

tablesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const includeInactive = req.query.includeInactive === "true";
    const tables = await prisma.table.findMany({
      where: {
        branchId,
        active: includeInactive ? undefined : true,
      },
      include: {
        branch: { select: { id: true, name: true } },
        orders: { where: { status: "OPEN" }, select: { id: true } },
      },
      orderBy: [{ branchId: "asc" }, { label: "asc" }],
    });
    // Marca si la mesa tiene una comanda abierta (ocupada)
    res.json(
      tables.map((t) => ({
        id: t.id,
        label: t.label,
        active: t.active,
        branchId: t.branchId,
        branch: t.branch,
        occupied: t.orders.length > 0,
        openOrderId: t.orders[0]?.id ?? null,
      }))
    );
  })
);

tablesRouter.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = tableSchema.parse(req.body);
    const authBranchId = resolveBranchId(req);
    const branchId = authBranchId ?? data.branchId;
    if (!branchId) throw new HttpError(400, "branchId is required");
    if (authBranchId && data.branchId && authBranchId !== data.branchId) {
      throw new HttpError(403, "Cannot create a table outside your branch");
    }

    const existing = await prisma.table.findUnique({
      where: { branchId_label: { branchId, label: data.label } },
    });
    if (existing) {
      // Reactivar si estaba desactivada, o error si ya existe activa
      if (!existing.active) {
        const table = await prisma.table.update({
          where: { id: existing.id },
          data: { active: true },
        });
        return res.status(201).json(table);
      }
      throw new HttpError(409, "Ya existe una mesa con ese nombre en la sucursal");
    }

    const table = await prisma.table.create({ data: { label: data.label, branchId } });
    res.status(201).json(table);
  })
);

tablesRouter.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
      include: { orders: { where: { status: "OPEN" }, select: { id: true } } },
    });
    if (!table) throw new HttpError(404, "Table not found");
    if (table.orders.length > 0) {
      throw new HttpError(400, "No se puede eliminar una mesa con una comanda abierta");
    }
    await prisma.table.update({ where: { id: table.id }, data: { active: false } });
    res.status(204).send();
  })
);
