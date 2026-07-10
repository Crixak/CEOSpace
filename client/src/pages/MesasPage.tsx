import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listBranches } from "../api/branches";
import { createTable, deleteTable, listTables } from "../api/tables";
import type { Branch, Table } from "../types";

export function MesasPage() {
  const { user, activeBranchId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [tables, setTables] = useState<Table[]>([]);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      listBranches().then((bs) => {
        setBranches(bs);
        setBranchId((prev) => prev || activeBranchId || bs[0]?.id || "");
      });
    } else {
      setBranchId(user?.branchId ?? "");
    }
  }, [isAdmin, activeBranchId, user?.branchId]);

  const effectiveBranch = isAdmin ? branchId || undefined : undefined;

  const refresh = useCallback(() => {
    if (isAdmin && !effectiveBranch) {
      setTables([]);
      return;
    }
    listTables(effectiveBranch).then(setTables).catch(() => setTables([]));
  }, [isAdmin, effectiveBranch]);

  useEffect(refresh, [refresh]);

  async function add() {
    if (!label.trim()) return;
    setError(null);
    try {
      await createTable({ label: label.trim(), branchId: effectiveBranch });
      setLabel("");
      refresh();
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          "No se pudo crear la mesa"
      );
    }
  }

  async function remove(table: Table) {
    setError(null);
    try {
      await deleteTable(table.id);
      refresh();
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          "No se pudo eliminar la mesa"
      );
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mesas</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          {isAdmin && (
            <label>
              Sucursal
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Nombre / número de mesa
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. Mesa 9, Barra 2"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn" onClick={add} disabled={!label.trim()}>
              Agregar mesa
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Mesa</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.id}>
                <td>{table.label}</td>
                <td>
                  {table.occupied ? (
                    <span className="badge badge--danger">Ocupada</span>
                  ) : (
                    <span className="badge badge--success">Libre</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn--danger"
                    onClick={() => remove(table)}
                    disabled={table.occupied}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  No hay mesas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
