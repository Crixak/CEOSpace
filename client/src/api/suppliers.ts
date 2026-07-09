import { api } from "./client";
import type { Supplier } from "../types";

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<Supplier[]>("/suppliers");
  return data;
}

export async function createSupplier(payload: Partial<Supplier>): Promise<Supplier> {
  const { data } = await api.post<Supplier>("/suppliers", payload);
  return data;
}

export async function updateSupplier(id: string, payload: Partial<Supplier>): Promise<Supplier> {
  const { data } = await api.put<Supplier>(`/suppliers/${id}`, payload);
  return data;
}
