import { api } from "./client";
import type { PurchaseOrder } from "../types";

export async function listPurchaseOrders(params: {
  branchId?: string;
  status?: string;
}): Promise<PurchaseOrder[]> {
  const { data } = await api.get<PurchaseOrder[]>("/purchases", { params });
  return data;
}

export async function createPurchaseOrder(payload: {
  supplierId: string;
  branchId?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>("/purchases", payload);
  return data;
}

export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchases/${id}/receive`);
  return data;
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchases/${id}/cancel`);
  return data;
}
