import { api } from "./client";
import type { Sale } from "../types";

export async function listSales(params: {
  branchId?: string;
  from?: string;
  to?: string;
}): Promise<Sale[]> {
  const { data } = await api.get<Sale[]>("/sales", { params });
  return data;
}

export async function getSale(id: string): Promise<Sale> {
  const { data } = await api.get<Sale>(`/sales/${id}`);
  return data;
}

export async function createSale(payload: {
  branchId?: string;
  items: { productId: string; quantity: number }[];
}): Promise<Sale> {
  const { data } = await api.post<Sale>("/sales", payload);
  return data;
}
