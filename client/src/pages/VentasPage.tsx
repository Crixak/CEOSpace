import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCurrentTier, listProducts } from "../api/products";
import { listBranches } from "../api/branches";
import { createSale, listSales } from "../api/sales";
import type { Branch, PaymentMethod, PriceTier, Product, Sale } from "../types";

interface CartLine {
  productId: string;
  name: string;
  quantity: number;
}

const TIER_LABELS: Record<PriceTier, string> = {
  DIA: "Precios de Día",
  NOCHE: "Precios de Noche",
  FINDE: "Precios de Fin de Semana",
};

function tierUnitPrice(product: Product, tier: PriceTier, paymentMethod: PaymentMethod): number {
  const tierPrice = product.prices?.find((p) => p.tier === tier);
  if (tierPrice) {
    return Number(paymentMethod === "CASH" ? tierPrice.cashPrice : tierPrice.price);
  }
  return Number(product.price);
}

export function VentasPage() {
  const { user, activeBranchId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tier, setTier] = useState<PriceTier>("DIA");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("OTHER");
  const [saleBranchId, setSaleBranchId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listProducts().then(setProducts);
    fetchCurrentTier().then(setTier).catch(() => {});
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

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const categories = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of products) {
      if (p.category) names.set(p.category.id, p.category.name);
    }
    return Array.from(names.entries());
  }, [products]);

  const filteredProducts = useMemo(
    () => (categoryFilter ? products.filter((p) => p.categoryId === categoryFilter) : products),
    [products, categoryFilter]
  );

  const total = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const product = productMap.get(line.productId);
        if (!product) return sum;
        return sum + tierUnitPrice(product, tier, paymentMethod) * line.quantity;
      }, 0),
    [cart, productMap, tier, paymentMethod]
  );

  function addToCart() {
    const product = productMap.get(selectedProductId);
    const qty = Number(quantity);
    if (!product || !qty || qty <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: qty }];
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
        paymentMethod,
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

  const money = (v: number) =>
    v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

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
            Categoría
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Producto
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.vegetarian ? "(veg) " : ""}
                  {p.name} — {money(tierUnitPrice(p, tier, paymentMethod))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label>
            Forma de pago
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="OTHER">Tarjeta / Otro</option>
              <option value="CASH">Efectivo (con descuento)</option>
            </select>
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
              {cart.map((line) => {
                const product = productMap.get(line.productId);
                const unit = product ? tierUnitPrice(product, tier, paymentMethod) : 0;
                return (
                  <tr key={line.productId}>
                    <td>{line.name}</td>
                    <td>{line.quantity}</td>
                    <td className={paymentMethod === "CASH" ? "price-cash" : ""}>{money(unit)}</td>
                    <td>{money(unit * line.quantity)}</td>
                    <td>
                      <button className="btn btn--secondary" onClick={() => removeLine(line.productId)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 18 }}>
            Total: {money(total)}{" "}
            {paymentMethod === "CASH" && <span className="badge badge--accent">precio efectivo</span>}
          </strong>
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
              <th>Franja</th>
              <th>Pago</th>
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
                <td>
                  {sale.priceTier ? (
                    <span className="badge badge--muted">{sale.priceTier}</span>
                  ) : (
                    "-"
                  )}
                </td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
