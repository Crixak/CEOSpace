# El Amanecer — App de gestión

Aplicación de gestión para un restaurant/bodegón con varias sucursales: ventas, stock, empleados, proveedores y compras, con reportes/dashboard.

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma (`/server`)
- **Base de datos**: PostgreSQL
- **Frontend**: React + Vite + TypeScript (`/client`)

## Estructura

```
/server   API REST (auth, sucursales, empleados, productos, stock, ventas, proveedores, compras, reportes)
/client   Panel web (React)
```

## Requisitos

- Node.js 20+
- Docker (opcional, para levantar Postgres fácil)

## Puesta en marcha (desarrollo local)

### 1. Base de datos

Con Docker (recomendado):

```bash
docker compose up -d postgres
```

O usá tu propia instancia de PostgreSQL y ajustá `DATABASE_URL` en el paso siguiente.

### 2. Backend

```bash
cd server
cp .env.example .env     # ajustar DATABASE_URL / JWT_SECRET si hace falta
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev               # http://localhost:4000
```

El seed crea 2 sucursales, categorías y productos de ejemplo, y estos usuarios (contraseña `amanecer123`):

- `admin@elamanecer.com` — ADMIN (ve todas las sucursales)
- `encargado.centro@elamanecer.com` — MANAGER (sucursal Centro)
- `vendedor.centro@elamanecer.com` — SELLER (sucursal Centro)

### 3. Frontend

```bash
cd client
cp .env.example .env      # VITE_API_URL apuntando al backend
npm install
npm run dev                # http://localhost:5173
```

## Roles

- **ADMIN**: ve y administra todas las sucursales, empleados, catálogo de productos y sucursales.
- **MANAGER** (encargado de sucursal): gestiona ventas, stock, compras y proveedores de su propia sucursal.
- **SELLER** (vendedor): registra ventas y consulta stock de su propia sucursal.

## Módulos incluidos (v1)

- **Ventas**: registro rápido de venta por sucursal, descuenta stock automáticamente, historial.
- **Stock**: stock por producto y sucursal, alertas de stock bajo, ajustes manuales con trazabilidad (`StockMovement`).
- **Proveedores y compras**: alta de proveedores, órdenes de compra, recepción de mercadería que impacta el stock.
- **Empleados**: alta/edición, asignación de sucursal y rol.
- **Reportes**: ventas por período, productos más vendidos, valorización de inventario, stock crítico.

## Desplegar una versión de prueba online

Para que puedan ir viendo el avance sin montar un servidor propio todavía, ver [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md) — pasos para desplegar en Railway (Postgres + API + frontend) conectando directamente este repo de GitHub.

## Despliegue con Docker

```bash
cp server/.env.example server/.env   # solo como referencia de variables
JWT_SECRET=un-secreto-fuerte docker compose up -d --build
```

Esto levanta Postgres, la API (puerto 4000) y el frontend servido con nginx (puerto 8080). Antes de usarlo por primera vez, corré las migraciones y el seed dentro del contenedor del server:

```bash
docker compose exec server npx prisma migrate deploy
docker compose exec server npm run prisma:seed
```

## Próximos pasos sugeridos

- Roles más granulares y auditoría de acciones.
- Impresión/exportación de tickets de venta.
- Múltiples métodos de pago y caja diaria.
- Notificaciones de stock bajo (email/WhatsApp).
