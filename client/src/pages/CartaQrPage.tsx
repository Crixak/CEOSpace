import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "../context/AuthContext";
import { listBranches } from "../api/branches";
import type { Branch } from "../types";

interface BranchQr {
  branch: Branch;
  url: string;
  dataUrl: string;
}

export function CartaQrPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<BranchQr[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const allBranches = await listBranches();
        const branches =
          user?.role === "ADMIN" ? allBranches : allBranches.filter((b) => b.id === user?.branchId);

        const withQr = await Promise.all(
          branches.map(async (branch) => {
            const url = `${window.location.origin}/carta/${branch.id}`;
            const dataUrl = await QRCode.toDataURL(url, {
              width: 480,
              margin: 2,
              color: { dark: "#231f1b", light: "#ffffff" },
            });
            return { branch, url, dataUrl };
          })
        );
        setItems(withQr);
      } catch {
        setError("No se pudieron generar los códigos QR");
      }
    }
    load();
  }, [user?.role, user?.branchId]);

  return (
    <div>
      <div className="page-header">
        <h1>Carta QR</h1>
      </div>

      <p className="text-muted" style={{ marginBottom: 20, maxWidth: 640 }}>
        Imprimí este código y pegalo en las mesas o en la entrada de cada sucursal. Al escanearlo, el
        cliente ve la carta actualizada con los precios de la franja horaria vigente (Día, Noche o Fin de
        semana), sin necesidad de instalar nada ni loguearse.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card-grid">
        {items.map(({ branch, url, dataUrl }) => (
          <div key={branch.id} className="card" style={{ textAlign: "center" }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              {branch.name}
            </div>
            <img
              src={dataUrl}
              alt={`QR de la carta de ${branch.name}`}
              style={{ width: "100%", maxWidth: 260, borderRadius: 8, border: "1px solid var(--color-border)" }}
            />
            <p className="text-muted" style={{ fontSize: 12, wordBreak: "break-all", marginTop: 10 }}>
              {url}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
              <a className="btn btn--secondary" href={dataUrl} download={`carta-qr-${branch.id}.png`}>
                Descargar PNG
              </a>
              <a className="btn" href={url} target="_blank" rel="noreferrer">
                Ver carta
              </a>
            </div>
          </div>
        ))}
        {items.length === 0 && !error && <p className="text-muted">Cargando códigos QR...</p>}
      </div>
    </div>
  );
}
