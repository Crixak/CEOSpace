import { api } from "./client";
import type { Employee } from "../types";

export async function listEmployees(branchId?: string): Promise<Employee[]> {
  const { data } = await api.get<Employee[]>("/employees", { params: { branchId } });
  return data;
}

export async function createEmployee(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId?: string | null;
}): Promise<Employee> {
  const { data } = await api.post<Employee>("/employees", payload);
  return data;
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
  const { data } = await api.put<Employee>(`/employees/${id}`, payload);
  return data;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}
