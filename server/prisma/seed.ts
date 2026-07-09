import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const branchCentro = await prisma.branch.upsert({
    where: { id: "branch-centro" },
    update: {},
    create: {
      id: "branch-centro",
      name: "El Palacio del Jamón - Centro",
      address: "Av. Principal 123",
      phone: "011-4444-0001",
    },
  });

  const branchNorte = await prisma.branch.upsert({
    where: { id: "branch-norte" },
    update: {},
    create: {
      id: "branch-norte",
      name: "El Palacio del Jamón - Norte",
      address: "Av. Libertador 456",
      phone: "011-4444-0002",
    },
  });

  const passwordHash = await bcrypt.hash("palacio123", 10);

  await prisma.user.upsert({
    where: { email: "admin@palaciodeljamon.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@palaciodeljamon.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "encargado.centro@palaciodeljamon.com" },
    update: {},
    create: {
      name: "Encargado Centro",
      email: "encargado.centro@palaciodeljamon.com",
      passwordHash,
      role: "MANAGER",
      branchId: branchCentro.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor.centro@palaciodeljamon.com" },
    update: {},
    create: {
      name: "Vendedor Centro",
      email: "vendedor.centro@palaciodeljamon.com",
      passwordHash,
      role: "SELLER",
      branchId: branchCentro.id,
    },
  });

  const categories = await Promise.all(
    ["Fiambres", "Quesos", "Almacén"].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const [fiambres, quesos, almacen] = categories;

  const products = [
    { name: "Jamón Crudo", sku: "FIA-001", categoryId: fiambres.id, unit: "KG", price: 12500, costPrice: 8500, minStock: 3 },
    { name: "Jamón Cocido", sku: "FIA-002", categoryId: fiambres.id, unit: "KG", price: 9800, costPrice: 6500, minStock: 5 },
    { name: "Salame Milán", sku: "FIA-003", categoryId: fiambres.id, unit: "KG", price: 11000, costPrice: 7200, minStock: 3 },
    { name: "Mortadela", sku: "FIA-004", categoryId: fiambres.id, unit: "KG", price: 7500, costPrice: 4800, minStock: 4 },
    { name: "Queso Sardo", sku: "QUE-001", categoryId: quesos.id, unit: "KG", price: 10500, costPrice: 7000, minStock: 3 },
    { name: "Queso Cremoso", sku: "QUE-002", categoryId: quesos.id, unit: "KG", price: 8900, costPrice: 5800, minStock: 4 },
    { name: "Aceitunas Verdes", sku: "ALM-001", categoryId: almacen.id, unit: "KG", price: 4200, costPrice: 2600, minStock: 5 },
    { name: "Pan Rallado 500g", sku: "ALM-002", categoryId: almacen.id, unit: "UNIT", price: 1800, costPrice: 1100, minStock: 10 },
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
          quantity: 15,
        },
      });
    }
  }

  await prisma.supplier.upsert({
    where: { id: "supplier-default" },
    update: {},
    create: {
      id: "supplier-default",
      name: "Distribuidora Fiambres SA",
      cuit: "30-12345678-9",
      phone: "011-5555-0001",
      email: "ventas@distribuidorafiambres.com",
    },
  });

  console.log("Seed completado.");
  console.log("Usuarios de prueba (password: palacio123):");
  console.log("  admin@palaciodeljamon.com (ADMIN)");
  console.log("  encargado.centro@palaciodeljamon.com (MANAGER)");
  console.log("  vendedor.centro@palaciodeljamon.com (SELLER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
