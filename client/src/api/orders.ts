import { api } from "./client";
import type { Order, OrderType, PaymentMethod, Sale } from "../types";

export async function listOpenOrders(branchId?: string): Promise<Order[]> {
  const { data } = await api.get<Order[]>("/orders", { params: { branchId, status: "OPEN" } });
  return data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

export async function openOrder(payload: {
  type: OrderType;
  tableId?: string;
  branchId?: string;
}): Promise<Order> {
  const { data } = await api.post<Order>("/orders", payload);
  return data;
}

export async function addOrderItem(
  orderId: string,
  payload: { productId: string; quantity: number }
): Promise<Order> {
  const { data } = await api.post<Order>(`/orders/${orderId}/items`, payload);
  return data;
}

export async function removeOrderItem(orderId: string, itemId: string): Promise<Order> {
  const { data } = await api.delete<Order>(`/orders/${orderId}/items/${itemId}`);
  return data;
}

export async function closeOrder(orderId: string, paymentMethod: PaymentMethod): Promise<Sale> {
  const { data } = await api.post<Sale>(`/orders/${orderId}/close`, { paymentMethod });
  return data;
}

export async function cancelOrder(orderId: string): Promise<void> {
  await api.post(`/orders/${orderId}/cancel`);
}
