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
  console.log("La carta se importa con: npm run menu:import");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
