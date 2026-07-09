import { api } from "./client";
import type { Branch } from "../types";

export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get<Branch[]>("/branches");
  return data;
}

export async function createBranch(payload: Partial<Branch>): Promise<Branch> {
  const { data } = await api.post<Branch>("/branches", payload);
  return data;
}
