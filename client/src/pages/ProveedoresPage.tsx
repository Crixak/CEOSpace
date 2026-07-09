import { useEffect, useState } from "react";
import { createSupplier, listSuppliers } from "../api/suppliers";
import type { Supplier } from "../types";

const emptyForm = { name: "", cuit: "", phone: "", email: "", address: "" };

export function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listSuppliers().then(setSuppliers);
  }

  useEffect(refresh, []);

  async function submit() {
    setError(null);
    try {
      await createSupplier(form);
      setForm(emptyForm);
      setShowForm(false);
      refresh();
    } catch {
      setError("No se pudo crear el proveedor");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Proveedores</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Nuevo proveedor"}
        </button>
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
              CUIT
              <input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
            </label>
            <label>
              Teléfono
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Dirección
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
              <th>CUIT</th>
              <th>Teléfono</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.cuit ?? "-"}</td>
                <td>{s.phone ?? "-"}</td>
                <td>{s.email ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
