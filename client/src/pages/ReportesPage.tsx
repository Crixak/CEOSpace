import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getInventoryValue, getSalesSummary, getTopProducts } from "../api/reports";
import type { SalesSummary, TopProduct } from "../types";

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function ReportesPage() {
  const { activeBranchId } = useAuth();
  const [from, setFrom] = useState(daysAgoISO(30).slice(0, 10));
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventoryValue, setInventoryValue] = useState<{ totalValue: number; itemsCount: number } | null>(null);

  useEffect(() => {
    const branchId = activeBranchId ?? undefined;
    getSalesSummary({ branchId, from: new Date(from).toISOString() }).then(setSummary);
    getTopProducts({ branchId, from: new Date(from).toISOString(), limit: 10 }).then(setTopProducts);
    getInventoryValue(branchId).then(setInventoryValue);
  }, [activeBranchId, from]);

  return (
    <div>
      <div className="page-header">
        <h1>Reportes</h1>
        <label>
          Desde
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
      </div>

      <div className="card-grid">
        <div className="stat-tile">
          <div className="stat-tile__label">Ventas en el período</div>
          <div className="stat-tile__value">{formatCurrency(summary?.totalSales ?? 0)}</div>
          <div className="text-muted">{summary?.salesCount ?? 0} ventas</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">Valorización de inventario</div>
          <div className="stat-tile__value">{formatCurrency(inventoryValue?.totalValue ?? 0)}</div>
          <div className="text-muted">{inventoryValue?.itemsCount ?? 0} productos en stock</div>
        </div>
      </div>

      <div className="section-title">Productos más vendidos</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad vendida</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.productId}>
                <td>{p.name}</td>
                <td>{p.quantity}</td>
                <td>{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
