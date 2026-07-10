import { useMemo, useState } from "react";
import { addOrderItem, cancelOrder, closeOrder, removeOrderItem } from "../api/orders";
import { money, tierUnitPrice, TIER_LABELS } from "../lib/pricing";
import type { Order, PaymentMethod, PriceTier, Product } from "../types";

interface Props {
  order: Order;
  products: Product[];
  tier: PriceTier;
  onChange: (order: Order) => void;
  onClosed: (total: number) => void;
  onBack: () => void;
}

export function OrderDetail({ order, products, tier, onChange, onClosed, onBack }: Props) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const categories = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of products) if (p.category) names.set(p.category.id, p.category.name);
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filteredProducts = useMemo(
    () => (categoryFilter ? products.filter((p) => p.categoryId === categoryFilter) : products),
    [products, categoryFilter]
  );

  const total = useMemo(
    () =>
      order.items.reduce((sum, item) => {
        const product = productMap.get(item.productId) ?? item.product;
        return sum + tierUnitPrice(product, tier, paymentMethod) * Number(item.quantity);
      }, 0),
    [order.items, productMap, tier, paymentMethod]
  );

  function handleError(err: unknown, fallback: string) {
    const message =
      (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? fallback;
    setError(message);
  }

  async function add() {
    const product = productMap.get(productId);
    const qty = Number(quantity);
    if (!product || !qty || qty <= 0) return;
    setError(null);
    setBusy(true);
    try {
      const updated = await addOrderItem(order.id, { productId, quantity: qty });
      onChange(updated);
      setProductId("");
      setQuantity("1");
    } catch (err) {
      handleError(err, "No se pudo agregar el producto");
    } finally {
      setBusy(false);
    }
  }

  async function remove(itemId: string) {
    setError(null);
    try {
      const updated = await removeOrderItem(order.id, itemId);
      onChange(updated);
    } catch (err) {
      handleError(err, "No se pudo quitar el producto");
    }
  }

  async function close() {
    if (order.items.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const sale = await closeOrder(order.id, paymentMethod);
      onClosed(Number(sale.total));
    } catch (err) {
      handleError(err, "No se pudo cerrar la comanda");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm("¿Cancelar la comanda? Se pierden los productos cargados.")) return;
    setBusy(true);
    try {
      await cancelOrder(order.id);
      onBack();
    } catch (err) {
      handleError(err, "No se pudo cancelar la comanda");
      setBusy(false);
    }
  }

  const title =
    order.type === "TAKEAWAY" ? "Take away" : order.table?.label ?? "Mesa";

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn--secondary" onClick={onBack}>
            ← Mesas
          </button>
          <h1 style={{ margin: 0 }}>{title}</h1>
        </div>
        <div className="tier-banner">
          <span className="tier-banner__dot" />
          {TIER_LABELS[tier]}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-grid">
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
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.vegetarian ? "(veg) " : ""}
                  {p.name} — {money(tierUnitPrice(p, tier, "OTHER"))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn" onClick={add} disabled={!productId || busy}>
              Agregar a la comanda
            </button>
          </div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>
        Comanda
      </div>
      <div className="card">
        {order.items.length === 0 ? (
          <p className="text-muted">Todavía no hay productos cargados.</p>
        ) : (
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
              {order.items.map((item) => {
                const product = productMap.get(item.productId) ?? item.product;
                const unit = tierUnitPrice(product, tier, paymentMethod);
                return (
                  <tr key={item.id}>
                    <td>{product.name}</td>
                    <td>{Number(item.quantity)}</td>
                    <td className={paymentMethod === "CASH" ? "price-cash" : ""}>{money(unit)}</td>
                    <td>{money(unit * Number(item.quantity))}</td>
                    <td>
                      <button className="btn btn--secondary" onClick={() => remove(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: 20 }}>
            Total: {money(total)}{" "}
            {paymentMethod === "CASH" && <span className="badge badge--accent">precio efectivo</span>}
          </strong>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ minWidth: 170 }}>
              Forma de pago
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="OTHER">Tarjeta / Otro</option>
                <option value="CASH">Efectivo (con descuento)</option>
              </select>
            </label>
            <button className="btn btn--secondary" onClick={cancel} disabled={busy}>
              Cancelar mesa
            </button>
            <button className="btn" onClick={close} disabled={order.items.length === 0 || busy}>
              Cerrar y cobrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
