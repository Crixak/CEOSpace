import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VentasPage } from "./pages/VentasPage";
import { MesasPage } from "./pages/MesasPage";
import { StockPage } from "./pages/StockPage";
import { EmpleadosPage } from "./pages/EmpleadosPage";
import { ProveedoresPage } from "./pages/ProveedoresPage";
import { ComprasPage } from "./pages/ComprasPage";
import { ReportesPage } from "./pages/ReportesPage";
import { CartaQrPage } from "./pages/CartaQrPage";
import { PublicMenuPage } from "./pages/PublicMenuPage";

// El vendedor no tiene dashboard (no ve ventas del día global): entra directo a Ventas
function HomePage() {
  const { user } = useAuth();
  if (user?.role === "SELLER") return <Navigate to="/ventas" replace />;
  return <DashboardPage />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/carta/:branchId" element={<PublicMenuPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/ventas" element={<VentasPage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER"]} />}>
                <Route path="/mesas" element={<MesasPage />} />
                <Route path="/carta-qr" element={<CartaQrPage />} />
                <Route path="/compras" element={<ComprasPage />} />
                <Route path="/proveedores" element={<ProveedoresPage />} />
                <Route path="/empleados" element={<EmpleadosPage />} />
                <Route path="/reportes" element={<ReportesPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
