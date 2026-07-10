import { api } from "./client";
import type { Table } from "../types";

export async function listTables(branchId?: string, includeInactive?: boolean): Promise<Table[]> {
  const { data } = await api.get<Table[]>("/tables", {
    params: { branchId, includeInactive: includeInactive ? "true" : undefined },
  });
  return data;
}

export async function createTable(payload: { label: string; branchId?: string }): Promise<Table> {
  const { data } = await api.post<Table>("/tables", payload);
  return data;
}

export async function deleteTable(id: string): Promise<void> {
  await api.delete(`/tables/${id}`);
}
