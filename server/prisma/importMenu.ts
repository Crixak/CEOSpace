/**
 * Importa la carta de El Amanecer (menu-data.json) a la base de datos.
 * Idempotente: se puede correr varias veces; actualiza precios si cambiaron.
 *
 * Uso: npx tsx prisma/importMenu.ts
 */
import { PrismaClient, PriceTier } from "@prisma/client";
import menuData from "./menu-data.json";

const prisma = new PrismaClient();

const INITIAL_STOCK = 100; // stock inicial por sucursal para que el POS pueda vender

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function main() {
  const branches = await prisma.branch.findMany();
  if (branches.length === 0) {
    console.warn("⚠ No hay sucursales cargadas; corré primero el seed (npm run prisma:seed).");
  }

  let createdProducts = 0;
  let updatedPrices = 0;

  for (const categoryData of menuData.categories) {
    const category = await prisma.category.upsert({
      where: { name: categoryData.name },
      update: {},
      create: { name: categoryData.name },
    });

    for (const item of categoryData.items) {
      const sku = `menu-${slugify(item.name)}`;
      const basePrice = item.prices.DIA?.price ?? item.prices.NOCHE?.price ?? 0;

      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          name: item.name,
          categoryId: category.id,
          vegetarian: item.vegetarian,
          price: basePrice,
          active: true,
        },
        create: {
          name: item.name,
          sku,
          categoryId: category.id,
          unit: "UNIT",
          price: basePrice,
          costPrice: 0,
          minStock: 0,
          vegetarian: item.vegetarian,
        },
      });
      createdProducts++;

      for (const tier of Object.keys(item.prices) as PriceTier[]) {
        const tierPrices = item.prices[tier];
        if (!tierPrices) continue;
        await prisma.productPrice.upsert({
          where: { productId_tier: { productId: product.id, tier } },
          update: { price: tierPrices.price, cashPrice: tierPrices.cashPrice },
          create: {
            productId: product.id,
            tier,
            price: tierPrices.price,
            cashPrice: tierPrices.cashPrice,
          },
        });
        updatedPrices++;
      }

      for (const branch of branches) {
        await prisma.stock.upsert({
          where: { productId_branchId: { productId: product.id, branchId: branch.id } },
          update: {},
          create: { productId: product.id, branchId: branch.id, quantity: INITIAL_STOCK },
        });
      }
    }
  }

  console.log(`Importación completada:`);
  console.log(`  Categorías: ${menuData.categories.length}`);
  console.log(`  Productos procesados: ${createdProducts}`);
  console.log(`  Precios por franja cargados/actualizados: ${updatedPrices}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
