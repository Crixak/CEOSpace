import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "../context/AuthContext";
import { getSalesSummary, getLowStock } from "../api/reports";
import type { LowStockItem, SalesSummary } from "../types";

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function DashboardPage() {
  const { activeBranchId } = useAuth();
  const [today, setToday] = useState<SalesSummary | null>(null);
  const [month, setMonth] = useState<SalesSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const branchId = activeBranchId ?? undefined;
    Promise.all([
      getSalesSummary({ branchId, from: startOfDayISO() }),
      getSalesSummary({ branchId, from: startOfMonthISO() }),
      getLowStock(branchId),
    ])
      .then(([todaySummary, monthSummary, low]) => {
        setToday(todaySummary);
        setMonth(monthSummary);
        setLowStock(low);
      })
      .finally(() => setLoading(false));
  }, [activeBranchId]);

  if (loading) return <p>Cargando dashboard...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="card-grid">
        <div className="stat-tile">
          <div className="stat-tile__label">Ventas de hoy</div>
          <div className="stat-tile__value">{formatCurrency(today?.totalSales ?? 0)}</div>
          <div className="text-muted">{today?.salesCount ?? 0} ventas</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">Ventas del mes</div>
          <div className="stat-tile__value">{formatCurrency(month?.totalSales ?? 0)}</div>
          <div className="text-muted">{month?.salesCount ?? 0} ventas</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">Productos con stock bajo</div>
          <div className="stat-tile__value">{lowStock.length}</div>
        </div>
      </div>

      <div className="section-title">Ventas por día (este mes)</div>
      <div className="card" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={month?.byDay ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ded5" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="total" fill="#8a2b2b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {lowStock.length > 0 && (
        <>
          <div className="section-title">Alertas de stock bajo</div>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Sucursal</th>
                  <th>Stock actual</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={`${item.productId}-${item.branchId}`} className="low-stock">
                    <td>{item.productName}</td>
                    <td>{item.branchName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
