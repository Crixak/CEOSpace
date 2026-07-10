import type { PaymentMethod, PriceTier, Product } from "../types";

export const TIER_LABELS: Record<PriceTier, string> = {
  DIA: "Precios de Día",
  NOCHE: "Precios de Noche",
  FINDE: "Precios de Fin de Semana",
};

export function tierUnitPrice(
  product: Pick<Product, "price" | "prices">,
  tier: PriceTier,
  paymentMethod: PaymentMethod
): number {
  const tierPrice = product.prices?.find((p) => p.tier === tier);
  if (tierPrice) {
    return Number(paymentMethod === "CASH" ? tierPrice.cashPrice : tierPrice.price);
  }
  return Number(product.price);
}

export function money(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}
