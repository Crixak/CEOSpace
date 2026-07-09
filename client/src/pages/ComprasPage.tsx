import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listSuppliers } from "../api/suppliers";
import { listProducts } from "../api/products";
import { listBranches } from "../api/branches";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
} from "../api/purchases";
import type { Branch, Product, PurchaseOrder, Supplier } from "../types";

interface Line {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export function ComprasPage() {
  const { user, activeBranchId } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderBranchId, setOrderBranchId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const branchParam = user?.role === "ADMIN" ? activeBranchId ?? undefined : undefined;

  function refreshOrders() {
    listPurchaseOrders({ branchId: branchParam }).then(setOrders);
  }

  useEffect(() => {
    listSuppliers().then(setSuppliers);
    listProducts().then(setProducts);
    if (user?.role === "ADMIN") listBranches().then(setBranches);
  }, [user?.role]);

  useEffect(refreshOrders, [branchParam]);
  useEffect(() => {
    if (user?.role === "ADMIN") setOrderBranchId(activeBranchId ?? "");
  }, [activeBranchId, user?.role]);

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0), [lines]);

  function addLine() {
    const product = products.find((p) => p.id === productId);
    const quantity = Number(qty);
    const unitCost = Number(cost);
    if (!product || !quantity || quantity <= 0) return;
    setLines((prev) => [...prev, { productId: product.id, name: product.name, quantity, unitCost }]);
    setProductId("");
    setQty("1");
    setCost("0");
  }

  async function submitOrder() {
    if (lines.length === 0 || !supplierId) return;
    if (user?.role === "ADMIN" && !orderBranchId) {
      setError("Seleccioná una sucursal");
      return;
    }
    setError(null);
    try {
      await createPurchaseOrder({
        supplierId,
        branchId: user?.role === "ADMIN" ? orderBranchId : undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      });
      setLines([]);
      setSupplierId("");
      refreshOrders();
    } catch {
      setError("No se pudo crear la orden de compra");
    }
  }

  async function receive(order: PurchaseOrder) {
    await receivePurchaseOrder(order.id);
    refreshOrders();
  }

  async function cancel(order: PurchaseOrder) {
    await cancelPurchaseOrder(order.id);
    refreshOrders();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Compras</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          <label>
            Proveedor
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {user?.role === "ADMIN" && (
            <label>
              Sucursal
              <select value={orderBranchId} onChange={(e) => setOrderBranchId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Producto
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <label>
            Costo unitario
            <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn--secondary" onClick={addLine} disabled={!productId}>
              Agregar ítem
            </button>
          </div>
        </div>

        {lines.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Costo unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td>{l.name}</td>
                  <td>{l.quantity}</td>
                  <td>${l.unitCost.toFixed(2)}</td>
                  <td>${(l.quantity * l.unitCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <strong>Total: ${total.toFixed(2)}</strong>
          <button className="btn" onClick={submitOrder} disabled={lines.length === 0 || !supplierId}>
            Crear orden de compra
          </button>
        </div>
      </div>

      <div className="section-title">Órdenes de compra</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Sucursal</th>
              <th>Estado</th>
              <th>Ítems</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.createdAt).toLocaleString("es-AR")}</td>
                <td>{o.supplier?.name ?? "-"}</td>
                <td>{o.branch?.name ?? "-"}</td>
                <td>
                  {o.status === "PENDING" && <span className="badge badge--muted">Pendiente</span>}
                  {o.status === "RECEIVED" && <span className="badge badge--success">Recibida</span>}
                  {o.status === "CANCELLED" && <span className="badge badge--danger">Cancelada</span>}
                </td>
                <td>{o.items.length}</td>
                <td>
                  {o.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn--secondary" onClick={() => receive(o)}>
                        Recibir
                      </button>
                      <button className="btn btn--danger" onClick={() => cancel(o)}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
