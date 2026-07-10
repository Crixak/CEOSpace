-- CreateEnum
CREATE TYPE "PriceTier" AS ENUM ('DIA', 'NOCHE', 'FINDE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'OTHER');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "vegetarian" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "priceTier" "PriceTier";

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tier" "PriceTier" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cashPrice" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_tier_key" ON "ProductPrice"("productId", "tier");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
