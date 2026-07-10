import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicMenu } from "../api/publicMenu";
import { Logo } from "../components/Logo";
import { money } from "../lib/pricing";
import type { PublicMenu } from "../api/publicMenu";
import type { PriceTier } from "../types";

const TIER_LABELS: Record<PriceTier, string> = {
  DIA: "Precios de Día",
  NOCHE: "Precios de Noche",
  FINDE: "Precios de Fin de Semana",
};

export function PublicMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!branchId) return;
    fetchPublicMenu(branchId)
      .then((data) => {
        setMenu(data);
        setActiveCategory(data.categories[0]?.id ?? null);
      })
      .catch(() => setError("No pudimos cargar la carta. Probá escaneando el QR de nuevo."));
  }, [branchId]);

  useEffect(() => {
    if (!menu) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveCategory(visible.target.id);
      },
      { rootMargin: "-120px 0px -70% 0px" }
    );
    for (const cat of menu.categories) {
      const el = sectionRefs.current[cat.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [menu]);

  const categoryChips = useMemo(() => menu?.categories.map((c) => ({ id: c.id, name: c.name })) ?? [], [menu]);

  function scrollTo(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (error) {
    return (
      <div className="menu-page menu-page--center">
        <Logo size={56} />
        <p className="text-muted" style={{ marginTop: 12 }}>{error}</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="menu-page menu-page--center">
        <Logo size={56} />
        <p className="text-muted" style={{ marginTop: 12 }}>Cargando la carta...</p>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <header className="menu-header">
        <Logo size={52} />
        <h1>El Amanecer</h1>
        <p className="menu-header__branch">{menu.branch.name}</p>
        {menu.branch.address && <p className="menu-header__address">{menu.branch.address}</p>}
        <div className="tier-banner" style={{ marginTop: 10 }}>
          <span className="tier-banner__dot" />
          {TIER_LABELS[menu.tier]}
        </div>
      </header>

      <nav className="menu-nav">
        {categoryChips.map((c) => (
          <button
            key={c.id}
            className={`menu-nav__chip ${activeCategory === c.id ? "menu-nav__chip--active" : ""}`}
            onClick={() => scrollTo(c.id)}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <main className="menu-content">
        {menu.categories.map((category) => (
          <section
            key={category.id}
            id={category.id}
            ref={(el) => {
              sectionRefs.current[category.id] = el;
            }}
            className="menu-section"
          >
            <h2 className="menu-section__title">{category.name}</h2>
            <ul className="menu-item-list">
              {category.items.map((item) => (
                <li key={item.id} className="menu-item">
                  <div className="menu-item__info">
                    <div className="menu-item__name">
                      {item.name}
                      {item.vegetarian && <span className="badge badge--veg">Vegetariano</span>}
                    </div>
                    {item.description && <p className="menu-item__desc">{item.description}</p>}
                  </div>
                  <div className="menu-item__prices">
                    {item.cashPrice !== item.price && (
                      <span className="menu-item__list-price">{money(item.price)}</span>
                    )}
                    <span className="menu-item__cash-price">{money(item.cashPrice)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <footer className="menu-footer">
        <p>Cubierto por persona: $250 · ½ porción se cobra el 70% del valor de la porción</p>
        <p>Precio tachado: lista · Precio destacado: pagando en efectivo</p>
        <p>Subí tu foto a Instagram y etiquetanos @el.amanecer — ¡participá de sorteos!</p>
      </footer>
    </div>
  );
}
