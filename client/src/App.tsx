import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VentasPage } from "./pages/VentasPage";
import { StockPage } from "./pages/StockPage";
import { EmpleadosPage } from "./pages/EmpleadosPage";
import { ProveedoresPage } from "./pages/ProveedoresPage";
import { ComprasPage } from "./pages/ComprasPage";
import { ReportesPage } from "./pages/ReportesPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/ventas" element={<VentasPage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER"]} />}>
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
