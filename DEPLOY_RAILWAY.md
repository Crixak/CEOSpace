# Desplegar en Railway (para ir viendo el avance)

Railway va a levantar 3 piezas dentro de un mismo proyecto: Postgres, la API (`/server`) y el frontend (`/client`). Cada una se conecta al mismo repo de GitHub, apuntando a una subcarpeta distinta.

## 1. Crear el proyecto

1. Entrá a [railway.app](https://railway.app) y creá una cuenta (podés usar GitHub para loguearte).
2. `New Project` → `Deploy from GitHub repo` → seleccioná `Crixak/CEOSpace`.
3. Autorizá el acceso de Railway a ese repo si te lo pide.

## 2. Base de datos

1. Dentro del proyecto: `+ New` → `Database` → `Add PostgreSQL`.
2. Listo, Railway la deja corriendo y expone variables como `DATABASE_URL` automáticamente para referenciarlas desde otros servicios.

## 3. Servicio del backend (API)

1. `+ New` → `GitHub Repo` → mismo repo `Crixak/CEOSpace`.
2. En **Settings** de ese servicio:
   - **Root Directory**: `server`
   - Railway va a detectar el `Dockerfile` de `/server` automáticamente.
3. En **Variables**, agregá:
   - `DATABASE_URL` → click en "Add Reference" y elegí la variable `DATABASE_URL` del servicio Postgres (así queda linkeada, no hace falta copiarla a mano).
   - `JWT_SECRET` → un valor random y largo (por ejemplo generalo con `openssl rand -hex 32` en tu terminal).
   - No hace falta setear `PORT`: Railway lo inyecta solo y nuestro server ya lo respeta.
4. En **Settings → Networking**, click en `Generate Domain` para tener una URL pública (algo como `https://el-amanecer-server.up.railway.app`). Copiala, la vas a necesitar en el paso 4.
5. (Opcional) En **Settings → Health Check Path**, poné `/health`.
6. Hacé deploy. Cuando termine, corré las migraciones y el seed una sola vez desde la pestaña **Shell** de Railway del servicio del backend (o con `railway run` desde tu terminal si instalás el CLI):
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

## 4. Servicio del frontend (client)

1. `+ New` → `GitHub Repo` → mismo repo de nuevo.
2. En **Settings**:
   - **Root Directory**: `client`
   - Railway detecta el `Dockerfile` de `/client`.
3. En **Variables**, agregá:
   - `VITE_API_URL` → la URL pública del backend que copiaste en el paso 3 (ej. `https://el-amanecer-server.up.railway.app`). Este valor se usa en build-time (queda "horneado" en el bundle), así que si cambia la URL del backend hay que volver a hacer deploy del frontend.
4. En **Settings → Networking**, `Generate Domain` y, si te lo pide, indicá que el puerto expuesto por el contenedor es `80` (así apunta al nginx que sirve el build).
5. Deploy. Esa URL pública (`https://el-amanecer-client.up.railway.app`) es la que le compartís a tu compañero para que vaya viendo el avance.

## 5. Probar

Entrá a la URL del frontend y logueate con alguno de los usuarios de prueba del seed:

- `admin@elamanecer.com` / `amanecer123`
- `encargado.centro@elamanecer.com` / `amanecer123`
- `vendedor.centro@elamanecer.com` / `amanecer123`

## Notas

- Cada vez que hagamos push a la rama conectada, Railway redeploya solo (CI/CD automático).
- Cuando quieran pasar a un servidor propio, es el mismo `docker-compose.yml` del repo — Railway simplemente corre cada `Dockerfile` por separado.
- Los usuarios de prueba y contraseñas son solo para esta etapa de pruebas; antes de usarlo en el negocio real hay que cambiar contraseñas y `JWT_SECRET`.
