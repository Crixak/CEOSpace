import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listBranches } from "../api/branches";
import type { Branch } from "../types";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", roles: ["ADMIN", "MANAGER", "SELLER"] },
  { to: "/ventas", label: "Ventas", roles: ["ADMIN", "MANAGER", "SELLER"] },
  { to: "/stock", label: "Stock", roles: ["ADMIN", "MANAGER", "SELLER"] },
  { to: "/compras", label: "Compras", roles: ["ADMIN", "MANAGER"] },
  { to: "/proveedores", label: "Proveedores", roles: ["ADMIN", "MANAGER"] },
  { to: "/empleados", label: "Empleados", roles: ["ADMIN", "MANAGER"] },
  { to: "/reportes", label: "Reportes", roles: ["ADMIN", "MANAGER"] },
];

export function Layout() {
  const { user, activeBranchId, setActiveBranchId, logout } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      listBranches().then(setBranches).catch(() => setBranches([]));
    }
  }, [user?.role]);

  if (!user) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          El Amanecer
          <span>Panel de gestión</span>
        </div>
        <nav>
          {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            {user.role === "ADMIN" ? (
              <select
                value={activeBranchId ?? ""}
                onChange={(e) => setActiveBranchId(e.target.value || null)}
              >
                <option value="">Todas las sucursales</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{user.branch?.name ?? "Sin sucursal asignada"}</strong>
            )}
          </div>
          <div className="topbar__user">
            <span>
              {user.name} <span className="text-muted">({user.role})</span>
            </span>
            <button className="btn btn--secondary" onClick={logout}>
              Salir
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
