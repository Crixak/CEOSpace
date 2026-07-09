import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createEmployee, deactivateEmployee, listEmployees } from "../api/employees";
import { listBranches } from "../api/branches";
import type { Branch, Employee, Role } from "../types";

const emptyForm = { name: "", email: "", password: "", role: "SELLER" as Role, branchId: "" };

export function EmpleadosPage() {
  const { user, activeBranchId } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const branchParam = user?.role === "ADMIN" ? activeBranchId ?? undefined : undefined;

  function refresh() {
    listEmployees(branchParam).then(setEmployees);
  }

  useEffect(refresh, [branchParam]);
  useEffect(() => {
    if (user?.role === "ADMIN") listBranches().then(setBranches);
  }, [user?.role]);

  async function submit() {
    setError(null);
    try {
      await createEmployee({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        branchId: form.branchId || null,
      });
      setForm(emptyForm);
      setShowForm(false);
      refresh();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        "No se pudo crear el empleado";
      setError(message);
    }
  }

  async function toggleActive(emp: Employee) {
    await deactivateEmployee(emp.id);
    refresh();
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <div className="page-header">
        <h1>Empleados</h1>
        {isAdmin && (
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "Nuevo empleado"}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="form-grid">
            <label>
              Nombre
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label>
              Rol
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="SELLER">Vendedor</option>
                <option value="MANAGER">Encargado</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
            <label>
              Sucursal
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">Sin asignar</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn" onClick={submit}>
            Guardar
          </button>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Sucursal</th>
              <th>Estado</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.email}</td>
                <td>{emp.role}</td>
                <td>{emp.branch?.name ?? "-"}</td>
                <td>
                  {emp.active ? (
                    <span className="badge badge--success">Activo</span>
                  ) : (
                    <span className="badge badge--muted">Inactivo</span>
                  )}
                </td>
                {isAdmin && (
                  <td>
                    {emp.active && (
                      <button className="btn btn--danger" onClick={() => toggleActive(emp)}>
                        Desactivar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
