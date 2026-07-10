import { PaymentMethod, PriceTier } from "@prisma/client";

const TIMEZONE = "America/Argentina/Buenos_Aires";
const NIGHT_STARTS_AT = 18; // lun-vie: hasta las 18 rige DIA, desde las 18 NOCHE

/**
 * Franja de precios vigente según la hora de Argentina:
 * - Sábado y domingo (todo el día): FINDE
 * - Lunes a viernes antes de las 18: DIA
 * - Lunes a viernes desde las 18: NOCHE
 */
export function getCurrentTier(date: Date = new Date()): PriceTier {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");

  if (weekday === "Sat" || weekday === "Sun") return "FINDE";
  return hour < NIGHT_STARTS_AT ? "DIA" : "NOCHE";
}

export interface TierPrice {
  tier: PriceTier;
  price: number;
  cashPrice: number;
}

/**
 * Precio unitario a cobrar para un producto según franja y forma de pago.
 * Si el producto no tiene precio cargado para la franja, cae al precio base.
 */
export function resolveUnitPrice(
  product: { price: unknown; prices?: { tier: PriceTier; price: unknown; cashPrice: unknown }[] },
  tier: PriceTier,
  paymentMethod: PaymentMethod
): number {
  const tierPrice = product.prices?.find((p) => p.tier === tier);
  if (tierPrice) {
    return Number(paymentMethod === "CASH" ? tierPrice.cashPrice : tierPrice.price);
  }
  return Number(product.price);
}
