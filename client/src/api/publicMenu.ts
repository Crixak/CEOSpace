import { api } from "./client";
import type { PriceTier } from "../types";

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  vegetarian: boolean;
  unit: "KG" | "UNIT";
  price: number;
  cashPrice: number;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  branch: { id: string; name: string; address: string | null; phone: string | null };
  tier: PriceTier;
  categories: PublicMenuCategory[];
}

export async function fetchPublicMenu(branchId: string): Promise<PublicMenu> {
  const { data } = await api.get<PublicMenu>(`/public/menu/${branchId}`);
  return data;
}
