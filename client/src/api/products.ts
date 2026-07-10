import { api } from "./client";
import type { Category, PriceTier, Product } from "../types";

export async function fetchCurrentTier(): Promise<PriceTier> {
  const { data } = await api.get<{ tier: PriceTier }>("/products/current-tier");
  return data.tier;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<Category>("/categories", { name });
  return data;
}

export async function listProducts(categoryId?: string): Promise<Product[]> {
  const { data } = await api.get<Product[]>("/products", { params: { categoryId } });
  return data;
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const { data } = await api.post<Product>("/products", payload);
  return data;
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const { data } = await api.put<Product>(`/products/${id}`, payload);
  return data;
}

export async function deactivateProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
