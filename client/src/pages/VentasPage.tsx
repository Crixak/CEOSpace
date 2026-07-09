import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listProducts } from "../api/products";
import { listBranches } from "../api/branches";
import { createSale, listSales } from "../api/sales";
import type { Branch, Product, Sale } from "../types";

interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export function VentasPage() {
  const { user, activeBranchId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [saleBranchId, setSaleBranchId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listProducts().then(setProducts);
    if (user?.role === "ADMIN") listBranches().then(setBranches);
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setSaleBranchId(activeBranchId ?? "");
    }
  }, [activeBranchId, user?.role]);

  const branchIdForQuery = user?.role === "ADMIN" ? activeBranchId ?? undefined : undefined;

  useEffect(() => {
    listSales({ branchId: branchIdForQuery }).then(setSales);
  }, [branchIdForQuery]);

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.price * line.quantity, 0), [cart]);

  function addToCart() {
    const product = products.find((p) => p.id === selectedProductId);
    const qty = Number(quantity);
    if (!product || !qty || qty <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: qty }];
    });
    setSelectedProductId("");
    setQuantity("1");
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function confirmSale() {
    if (cart.length === 0) return;
    if (user?.role === "ADMIN" && !saleBranchId) {
      setError("Seleccioná una sucursal para registrar la venta");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createSale({
        branchId: user?.role === "ADMIN" ? saleBranchId : undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      setCart([]);
      const refreshed = await listSales({ branchId: branchIdForQuery });
      setSales(refreshed);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        "No se pudo registrar la venta";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Ventas</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          {user?.role === "ADMIN" && (
            <label>
              Sucursal
              <select value={saleBranchId} onChange={(e) => setSaleBranchId(e.target.value)}>
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
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit === "KG" ? "kg" : "un"}) - ${Number(p.price).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn--secondary" onClick={addToCart} disabled={!selectedProductId}>
              Agregar
            </button>
          </div>
        </div>

        {cart.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unit.</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.productId}>
                  <td>{line.name}</td>
                  <td>{line.quantity}</td>
                  <td>${line.price.toFixed(2)}</td>
                  <td>${(line.price * line.quantity).toFixed(2)}</td>
                  <td>
                    <button className="btn btn--secondary" onClick={() => removeLine(line.productId)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <strong>Total: ${total.toFixed(2)}</strong>
          <button className="btn" onClick={confirmSale} disabled={cart.length === 0 || submitting}>
            {submitting ? "Confirmando..." : "Confirmar venta"}
          </button>
        </div>
      </div>

      <div className="section-title">Historial de ventas</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sucursal</th>
              <th>Vendedor</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{new Date(sale.createdAt).toLocaleString("es-AR")}</td>
                <td>{sale.branch?.name ?? "-"}</td>
                <td>{sale.user?.name ?? "-"}</td>
                <td>{sale.items.length}</td>
                <td>${Number(sale.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
