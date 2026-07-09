import { api } from "./client";
import type { Stock } from "../types";

export async function listStock(branchId?: string, lowStockOnly?: boolean): Promise<Stock[]> {
  const { data } = await api.get<Stock[]>("/stock", {
    params: { branchId, lowStock: lowStockOnly ? "true" : undefined },
  });
  return data;
}

export async function adjustStock(payload: {
  productId: string;
  branchId: string;
  quantity: number;
  reason?: string;
}): Promise<Stock> {
  const { data } = await api.post<Stock>("/stock/adjust", payload);
  return data;
}
