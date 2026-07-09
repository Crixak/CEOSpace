import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole, resolveBranchId } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errorHandler";

export const employeesRouter = Router();
employeesRouter.use(requireAuth, requireRole("ADMIN", "MANAGER"));

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  hiredAt: true,
  branchId: true,
  branch: { select: { id: true, name: true } },
} as const;

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  branchId: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  branchId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

employeesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const employees = await prisma.user.findMany({
      where: branchId ? { branchId } : undefined,
      select: employeeSelect,
      orderBy: { name: "asc" },
    });
    res.json(employees);
  })
);

employeesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const employee = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        branchId: data.branchId ?? null,
        passwordHash,
      },
      select: employeeSelect,
    });
    res.status(201).json(employee);
  })
);

employeesRouter.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const { password, ...rest } = data;
    const employee = await prisma.user
      .update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
        select: employeeSelect,
      })
      .catch(() => null);
    if (!employee) throw new HttpError(404, "Employee not found");
    res.json(employee);
  })
);

employeesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.user
      .update({ where: { id: req.params.id }, data: { active: false } })
      .catch(() => {
        throw new HttpError(404, "Employee not found");
      });
    res.status(204).send();
  })
);
