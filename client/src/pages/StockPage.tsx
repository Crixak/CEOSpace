import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { adjustStock, listStock } from "../api/stock";
import type { Stock } from "../types";

export function StockPage() {
  const { user, activeBranchId } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<Stock | null>(null);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const branchParam = user?.role === "ADMIN" ? activeBranchId ?? undefined : undefined;

  function refresh() {
    setLoading(true);
    listStock(branchParam)
      .then(setStocks)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [branchParam]);

  async function submitAdjustment() {
    if (!adjusting) return;
    setError(null);
    try {
      await adjustStock({
        productId: adjusting.productId,
        branchId: adjusting.branchId,
        quantity: Number(delta),
        reason: reason || undefined,
      });
      setAdjusting(null);
      setDelta("0");
      setReason("");
      refresh();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        "No se pudo ajustar el stock";
      setError(message);
    }
  }

  const canAdjust = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <div>
      <div className="page-header">
        <h1>Stock</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Sucursal</th>
                <th>Cantidad</th>
                <th>Mínimo</th>
                <th>Estado</th>
                {canAdjust && <th></th>}
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id} className={s.lowStock ? "low-stock" : ""}>
                  <td>{s.product.name}</td>
                  <td>{s.product.category?.name ?? "-"}</td>
                  <td>{s.branch.name}</td>
                  <td>
                    {s.quantity} {s.product.unit === "KG" ? "kg" : "un"}
                  </td>
                  <td>{s.product.minStock}</td>
                  <td>
                    {s.lowStock ? (
                      <span className="badge badge--danger">Bajo</span>
                    ) : (
                      <span className="badge badge--success">OK</span>
                    )}
                  </td>
                  {canAdjust && (
                    <td>
                      <button className="btn btn--secondary" onClick={() => setAdjusting(s)}>
                        Ajustar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adjusting && (
        <div className="card" style={{ marginTop: 20, maxWidth: 420 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            Ajustar stock: {adjusting.product.name} ({adjusting.branch.name})
          </div>
          <div className="form-grid">
            <label>
              Cantidad (+/-)
              <input type="number" step="0.001" value={delta} onChange={(e) => setDelta(e.target.value)} />
            </label>
            <label>
              Motivo
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opcional" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={submitAdjustment}>
              Guardar
            </button>
            <button className="btn btn--secondary" onClick={() => setAdjusting(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
