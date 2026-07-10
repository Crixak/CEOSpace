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

## Módulos incluidos

- **Ventas (comandas por mesa / take away)**: el mozo abre una mesa (de la lista de mesas de la sucursal) o un pedido take away, le va cargando productos que se guardan en el servidor (la cuenta acumula aunque cambie de pantalla o de dispositivo), y al **cerrar la mesa** se genera la venta con la franja de precios vigente y la forma de pago elegida.
- **Mesas**: lista fija de mesas por sucursal, administrable por ADMIN/MANAGER. No se puede eliminar una mesa con comanda abierta.
- **Precios por franja horaria**: cada producto tiene precio de Día / Noche / Fin de semana, con precio de lista y precio efectivo (descuento). La franja se calcula automáticamente en horario de Argentina (sáb/dom → Finde; lun-vie hasta las 18 → Día, desde las 18 → Noche).
- **Stock**: stock por producto y sucursal para insumos con control de inventario (`tracksStock`), alertas de stock bajo, ajustes manuales trazables (`StockMovement`). Los platos de la carta no descuentan stock.
- **Proveedores y compras**: alta de proveedores, órdenes de compra, recepción de mercadería que impacta el stock.
- **Empleados**: alta/edición, asignación de sucursal y rol.
- **Reportes**: ventas por período, productos más vendidos, valorización de inventario, stock crítico.

### Importar la carta

La carta real de El Amanecer se importa con:

```bash
npm run menu:import   # dentro de /server, después del seed
```

Lee `prisma/menu-data.json` (parseado de los PDF Día/Noche/Fin de semana) y carga categorías, productos y los 3 precios por franja.

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
