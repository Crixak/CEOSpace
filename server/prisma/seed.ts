import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const branchCentro = await prisma.branch.upsert({
    where: { id: "branch-centro" },
    update: { name: "El Amanecer - Centro", address: "Av. Principal 123", phone: "011-4444-0001" },
    create: {
      id: "branch-centro",
      name: "El Amanecer - Centro",
      address: "Av. Principal 123",
      phone: "011-4444-0001",
    },
  });

  const branchNorte = await prisma.branch.upsert({
    where: { id: "branch-norte" },
    update: { name: "El Amanecer - Norte", address: "Av. Libertador 456", phone: "011-4444-0002" },
    create: {
      id: "branch-norte",
      name: "El Amanecer - Norte",
      address: "Av. Libertador 456",
      phone: "011-4444-0002",
    },
  });

  const passwordHash = await bcrypt.hash("amanecer123", 10);

  await prisma.user.upsert({
    where: { email: "admin@elamanecer.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@elamanecer.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "encargado.centro@elamanecer.com" },
    update: {},
    create: {
      name: "Encargado Centro",
      email: "encargado.centro@elamanecer.com",
      passwordHash,
      role: "MANAGER",
      branchId: branchCentro.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor.centro@elamanecer.com" },
    update: {},
    create: {
      name: "Mozo Centro",
      email: "vendedor.centro@elamanecer.com",
      passwordHash,
      role: "SELLER",
      branchId: branchCentro.id,
    },
  });

  const categories = await Promise.all(
    ["Entradas", "Platos Principales", "Bebidas", "Postres"].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const [entradas, platos, bebidas, postres] = categories;

  const products = [
    { name: "Picada Bodegón", sku: "ENT-001", categoryId: entradas.id, unit: "UNIT", price: 8500, costPrice: 4200, minStock: 5 },
    { name: "Empanadas (docena)", sku: "ENT-002", categoryId: entradas.id, unit: "UNIT", price: 6000, costPrice: 3000, minStock: 8 },
    { name: "Provoleta", sku: "ENT-003", categoryId: entradas.id, unit: "UNIT", price: 5200, costPrice: 2600, minStock: 5 },
    { name: "Milanesa Napolitana", sku: "PLA-001", categoryId: platos.id, unit: "UNIT", price: 9800, costPrice: 5000, minStock: 6 },
    { name: "Bife de Chorizo", sku: "PLA-002", categoryId: platos.id, unit: "UNIT", price: 13500, costPrice: 7500, minStock: 5 },
    { name: "Pastel de Papa", sku: "PLA-003", categoryId: platos.id, unit: "UNIT", price: 8200, costPrice: 4000, minStock: 6 },
    { name: "Vino Tinto (botella)", sku: "BEB-001", categoryId: bebidas.id, unit: "UNIT", price: 7000, costPrice: 4000, minStock: 8 },
    { name: "Cerveza Artesanal", sku: "BEB-002", categoryId: bebidas.id, unit: "UNIT", price: 3200, costPrice: 1600, minStock: 12 },
    { name: "Gaseosa Línea", sku: "BEB-003", categoryId: bebidas.id, unit: "UNIT", price: 1800, costPrice: 900, minStock: 15 },
    { name: "Flan Casero", sku: "POS-001", categoryId: postres.id, unit: "UNIT", price: 3500, costPrice: 1500, minStock: 8 },
  ] as const;

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });

    for (const branch of [branchCentro, branchNorte]) {
      await prisma.stock.upsert({
        where: { productId_branchId: { productId: created.id, branchId: branch.id } },
        update: {},
        create: {
          productId: created.id,
          branchId: branch.id,
          quantity: 20,
        },
      });
    }
  }

  await prisma.supplier.upsert({
    where: { id: "supplier-default" },
    update: {},
    create: {
      id: "supplier-default",
      name: "Distribuidora de Alimentos SA",
      cuit: "30-12345678-9",
      phone: "011-5555-0001",
      email: "ventas@distribuidoraalimentos.com",
    },
  });

  console.log("Seed completado.");
  console.log("Usuarios de prueba (password: amanecer123):");
  console.log("  admin@elamanecer.com (ADMIN)");
  console.log("  encargado.centro@elamanecer.com (MANAGER)");
  console.log("  vendedor.centro@elamanecer.com (SELLER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
