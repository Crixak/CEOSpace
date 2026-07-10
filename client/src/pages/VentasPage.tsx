import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCurrentTier, listProducts } from "../api/products";
import { listBranches } from "../api/branches";
import { listTables } from "../api/tables";
import { getOrder, listOpenOrders, openOrder } from "../api/orders";
import { listSales } from "../api/sales";
import { OrderDetail } from "../components/OrderDetail";
import { money, TIER_LABELS, tierUnitPrice } from "../lib/pricing";
import type { Branch, Order, PriceTier, Product, Sale, Table } from "../types";

function orderTotal(order: Order, products: Map<string, Product>, tier: PriceTier): number {
  return order.items.reduce((sum, item) => {
    const product = products.get(item.productId) ?? item.product;
    return sum + tierUnitPrice(product, tier, "OTHER") * Number(item.quantity);
  }, 0);
}

export function VentasPage() {
  const { user, activeBranchId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [tier, setTier] = useState<PriceTier>("DIA");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [posBranchId, setPosBranchId] = useState<string>("");
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";
  // Para ADMIN el branch de trabajo es el activo o el elegido en el POS
  const branchParam = isAdmin ? posBranchId || activeBranchId || undefined : undefined;

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    listProducts().then(setProducts);
    fetchCurrentTier().then(setTier).catch(() => {});
    if (isAdmin) listBranches().then(setBranches);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) setPosBranchId(activeBranchId ?? "");
  }, [activeBranchId, isAdmin]);

  const refresh = useCallback(() => {
    // ADMIN sin sucursal elegida: no listamos mesas (son por sucursal)
    if (isAdmin && !branchParam) {
      setTables([]);
      setOrders([]);
    } else {
      listTables(branchParam).then(setTables).catch(() => setTables([]));
      listOpenOrders(branchParam).then(setOrders).catch(() => setOrders([]));
    }
    listSales({ branchId: branchParam }).then(setSales).catch(() => setSales([]));
  }, [isAdmin, branchParam]);

  useEffect(refresh, [refresh]);

  const orderByTable = useMemo(() => {
    const map = new Map<string, Order>();
    for (const o of orders) if (o.tableId) map.set(o.tableId, o);
    return map;
  }, [orders]);

  const takeawayOrders = orders.filter((o) => o.type === "TAKEAWAY");

  function handleError(err: unknown, fallback: string) {
    setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? fallback);
  }

  async function openTable(table: Table) {
    setError(null);
    const existing = orderByTable.get(table.id);
    if (existing) {
      setActiveOrder(existing);
      return;
    }
    try {
      const order = await openOrder({ type: "DINE_IN", tableId: table.id, branchId: branchParam });
      setActiveOrder(order);
      refresh();
    } catch (err) {
      handleError(err, "No se pudo abrir la mesa");
    }
  }

  async function startTakeaway() {
    setError(null);
    if (isAdmin && !branchParam) {
      setError("Elegí una sucursal para tomar el pedido");
      return;
    }
    try {
      const order = await openOrder({ type: "TAKEAWAY", branchId: branchParam });
      setActiveOrder(order);
      refresh();
    } catch (err) {
      handleError(err, "No se pudo crear el pedido take away");
    }
  }

  async function openExisting(orderId: string) {
    try {
      setActiveOrder(await getOrder(orderId));
    } catch (err) {
      handleError(err, "No se pudo abrir la comanda");
    }
  }

  // Vista detalle de una comanda
  if (activeOrder) {
    return (
      <OrderDetail
        order={activeOrder}
        products={products}
        tier={tier}
        onChange={setActiveOrder}
        onClosed={(total) => {
          setActiveOrder(null);
          setNotice(`Cuenta cerrada: ${money(total)}`);
          refresh();
        }}
        onBack={() => {
          setActiveOrder(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Ventas</h1>
        <div className="tier-banner">
          <span className="tier-banner__dot" />
          {TIER_LABELS[tier]}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid var(--color-success)" }}>
          {notice}
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={{ maxWidth: 280 }}>
            Sucursal
            <select value={posBranchId} onChange={(e) => setPosBranchId(e.target.value)}>
              <option value="">Seleccionar sucursal...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {isAdmin && !branchParam ? (
        <div className="card">
          <p className="text-muted">Elegí una sucursal para ver sus mesas y tomar pedidos.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
            <div className="section-title" style={{ margin: 0 }}>
              Mesas
            </div>
            <button className="btn" onClick={startTakeaway}>
              + Take away
            </button>
          </div>

          <div className="table-grid">
            {tables.map((table) => {
              const order = orderByTable.get(table.id);
              const occupied = !!order;
              return (
                <button
                  key={table.id}
                  className={`table-card ${occupied ? "table-card--busy" : ""}`}
                  onClick={() => openTable(table)}
                >
                  <span className="table-card__label">{table.label}</span>
                  {occupied ? (
                    <>
                      <span className="badge badge--danger">Ocupada</span>
                      <span className="table-card__total">
                        {money(orderTotal(order!, productMap, tier))}
                      </span>
                    </>
                  ) : (
                    <span className="badge badge--success">Libre</span>
                  )}
                </button>
              );
            })}
            {tables.length === 0 && (
              <p className="text-muted">
                No hay mesas cargadas en esta sucursal. Un encargado puede crearlas en la sección Mesas.
              </p>
            )}
          </div>

          {takeawayOrders.length > 0 && (
            <>
              <div className="section-title">Take away abiertos</div>
              <div className="table-grid">
                {takeawayOrders.map((order) => (
                  <button
                    key={order.id}
                    className="table-card table-card--busy"
                    onClick={() => openExisting(order.id)}
                  >
                    <span className="table-card__label">Take away</span>
                    <span className="badge badge--accent">Abierto</span>
                    <span className="table-card__total">
                      {money(orderTotal(order, productMap, tier))}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="section-title">Ventas cerradas (recientes)</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sucursal</th>
              <th>Vendedor</th>
              <th>Franja</th>
              <th>Pago</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 15).map((sale) => (
              <tr key={sale.id}>
                <td>{new Date(sale.createdAt).toLocaleString("es-AR")}</td>
                <td>{sale.branch?.name ?? "-"}</td>
                <td>{sale.user?.name ?? "-"}</td>
                <td>{sale.priceTier ? <span className="badge badge--muted">{sale.priceTier}</span> : "-"}</td>
                <td>
                  {sale.paymentMethod === "CASH" ? (
                    <span className="badge badge--accent">Efectivo</span>
                  ) : (
                    <span className="badge badge--muted">Otro</span>
                  )}
                </td>
                <td>{sale.items.length}</td>
                <td>{money(Number(sale.total))}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  Todavía no hay ventas cerradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
