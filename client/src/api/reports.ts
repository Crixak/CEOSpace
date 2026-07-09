import { api } from "./client";
import type { LowStockItem, SalesSummary, TopProduct } from "../types";

export async function getSalesSummary(params: {
  branchId?: string;
  from?: string;
  to?: string;
}): Promise<SalesSummary> {
  const { data } = await api.get<SalesSummary>("/reports/sales-summary", { params });
  return data;
}

export async function getTopProducts(params: {
  branchId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<TopProduct[]> {
  const { data } = await api.get<TopProduct[]>("/reports/top-products", { params });
  return data;
}

export async function getLowStock(branchId?: string): Promise<LowStockItem[]> {
  const { data } = await api.get<LowStockItem[]>("/reports/low-stock", { params: { branchId } });
  return data;
}

export async function getInventoryValue(
  branchId?: string
): Promise<{ totalValue: number; itemsCount: number }> {
  const { data } = await api.get("/reports/inventory-value", { params: { branchId } });
  return data;
}
