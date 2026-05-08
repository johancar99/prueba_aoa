# Backend — Inventario y Kardex (AOA)

API GraphQL para gestión de productos, inventario valorado (precio promedio ponderado), kardex de movimientos y usuarios. Pensado para pruebas técnicas y entornos controlados; el revisor puede validar reglas de negocio, transacciones, autenticación y calidad de capas.

## Stack

| Tecnología | Uso |
|------------|-----|
| **Node.js** + **TypeScript** | Runtime y tipado estricto |
| **Express** | Servidor HTTP |
| **Apollo Server 4** (`@apollo/server`) | GraphQL sobre `/graphql` |
| **MongoDB** + **Mongoose 8** | Persistencia |
| **JWT** (`jsonwebtoken`) | Autenticación stateless |
| **Yup** | Validación de inputs de dominio |
| **DataLoader** | Batch de `Product` y `User` al resolver relaciones desde `Movement` |
| **bcryptjs** | Hash de contraseñas (12 rounds en `pre('save')`) |

## Requisitos

- Node.js 18+ (alineado con el `Dockerfile`)
- MongoDB accesible (local o contenedor)
- Variables de entorno (ver `.env.example`)

## Puesta en marcha

1. Copiar entorno:

   ```bash
   cp .env.example .env
   ```

2. Ajustar `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mínimo obligatorio según `src/config/env.ts`).

3. Instalar y ejecutar:

   ```bash
   npm install
   npm run dev
   ```

4. Compilación producción:

   ```bash
   npm run build
   npm start
   ```

El endpoint GraphQL queda en `http://localhost:<PORT>/graphql` (por defecto `4000`).

### Docker

El `Dockerfile` usa `npm run dev` con `ts-node-dev`. En orquestación típica (p. ej. Compose del monorepo), el servicio suele mapear el puerto `4000` y usar un hostname de red para MongoDB (`mongodb://mongodb:27017/...` en `.env.example`).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `development` \| `production` (afecta logging de errores GraphQL) |
| `PORT` | Puerto HTTP (default `4000`) |
| `MONGO_URI` | URI de conexión MongoDB (**obligatoria**) |
| `JWT_SECRET` | Secreto para firmar JWT (**obligatoria**) |
| `ADMIN_NAME` | Nombre del usuario admin sembrado (default `Administrador`) |
| `ADMIN_EMAIL` | Email del admin inicial (**obligatoria** para el seeder) |
| `ADMIN_PASSWORD` | Contraseña del admin inicial (**obligatoria** para el seeder) |

Al arranque, `seedAdminUser` crea un usuario **ADMIN** solo si no existe ningún administrador **activo**.

## Arquitectura (capas)

```
src/
├── app.ts                 # Bootstrap Express + Apollo + contexto
├── config/                # env, conexión DB
├── graphql/
│   ├── typeDefs/          # Esquema GraphQL (graphql-tag)
│   ├── resolvers/         # Orquestación fina; delegación a servicios
│   ├── loaders/           # DataLoaders (producto / usuario por ID)
│   ├── guards/            # requireAuth / requireRole
│   └── errors/            # formatError sanitizado + factory de validación
├── middlewares/           # JWT opcional en request → req.user
├── models/                # Esquemas Mongoose + índices
├── services/              # Reglas de negocio, transacciones, agregaciones
├── types/                 # GraphQLContext, ampliación Express
└── utils/                 # Validadores Yup, paginación, transacciones, ObjectId, fechas, seeder
```

**Principio:** la lógica de negocio vive en **servicios**; los resolvers comprueban auth/RBAC y delegan. Las mutaciones sensibles validan con **Yup** antes de persistir.

## Dominio e inventario

### Kardex

Cada movimiento guarda **stock anterior** (`previousStock`) y **stock nuevo** (`newStock`), tipo `IN` / `OUT`, cantidad, `unitPrice` cuando aplica, `productId`, `userId` y observaciones opcionales.

- **Entrada (`IN`)**: actualiza stock y recalcula **precio promedio ponderado** sobre el producto:

  \[
  \text{PPP}_{\text{nuevo}} = \frac{\text{stock}_{\text{ant}} \times \text{PPP}_{\text{ant}} + \text{cantidad} \times \text{precio\_entrega}}{\text{stock}_{\text{nuevo}}}
  \]

- **Salida (`OUT`)**: no rebaja el PPP; valida stock suficiente (no stock negativo).

### Producto y trazabilidad

- **`updateProduct`** no permite cambiar `stock` ni `averagePrice` por la API: el stock solo cambia vía **movimientos** (o flujo controlado de alta inicial).
- **`createProduct`** con `stock > 0` abre una transacción y registra un movimiento **`IN`** inicial (“Initial stock entry”) para alinear kardex e inventario.

### Valorización

- `inventoryTotalValue`: agregación `sum(stock × averagePrice)` sobre productos activos.
- `lowStockProducts`: productos activos con `stock ≤ minStock`.

### Alerta post-movimiento

En la respuesta de `registerMovement`, el tipo `Movement` expone **`lowStockAlert`** (nullable): solo tiene sentido en esa mutación; en listados suele ser `null`.

## Transacciones MongoDB

Operaciones que deben ser atómicas usan `withTransaction` (`src/utils/transaction.utils.ts`):

- Registro de movimiento + actualización de producto (stock, PPP, `lastModifiedBy`).
- Alta de producto con stock inicial + movimiento inicial.

## Autenticación y autorización

1. **Middleware** (`auth.middleware.ts`): si viene `Authorization: Bearer <token>`, valida JWT y rellena `req.user` (`userId`, `email`, `role`). No corta la petición sin token (el control fino es en GraphQL).
2. **Contexto Apollo**: expone `userId`, `userRole`, `email` y loaders.
3. **Guards** (`graphql/guards/auth.guard.ts`): `requireAuth`, `requireRole('ADMIN')`.

### Matriz práctica

| Operación | Sin token | USER | ADMIN |
|-----------|-----------|------|-------|
| `login` | ✅ | ✅ | ✅ |
| `me` | ✅ (`null` si no hay sesión) | ✅ | ✅ |
| `products`, `product`, `lowStockProducts`, `inventoryTotalValue` | ❌ | ✅ | ✅ |
| `createProduct`, `updateProduct`, `deleteProduct` | ❌ | ✅ | ✅ |
| `getKardexByProduct`, `getGlobalMovements`, `registerMovement` | ❌ | ✅ | ✅ |
| `users`, `createUser`, `updateUser`, `deleteUser` | ❌ | ❌ | ✅ |

**Usuarios:** campo **`active`**. `deleteUser` es **baja lógica** (`active: false`). No se puede desactivar el último administrador activo ni desactivarse a uno mismo. `login` y `me` ignoran usuarios inactivos.

## GraphQL — referencia rápida

**URL:** `POST /graphql`  
**Headers habituales:** `Content-Type: application/json`, y para operaciones protegidas `Authorization: Bearer <token>`.

### Queries

| Nombre | Descripción |
|--------|-------------|
| `_health` | Comprobación viva |
| `me` | Usuario actual (sin contraseña) |
| `users(filters)` | Listado paginado y filtros (ADMIN); `includeInactive` opcional |
| `products(filters)` | Búsqueda paginada por nombre/categoría |
| `product(id)` | Detalle |
| `lowStockProducts` | Stock bajo mínimo |
| `inventoryTotalValue` | Valor inventario (PPP × stock) |
| `getKardexByProduct` | Movimientos por producto (paginado) |
| `getGlobalMovements` | Movimientos globales con filtros opcionales |

### Mutations

| Nombre | Descripción |
|--------|-------------|
| `login` | Devuelve `token` + `user` |
| `createUser` / `updateUser` / `deleteUser` | CRUD usuarios (ADMIN); delete = desactivar |
| `createProduct` / `updateProduct` / `deleteProduct` | Productos; `deleteProduct` = baja lógica (`status: false`) |
| `registerMovement` | Entrada/salida con reglas de stock y PPP |

### Ejemplo: login

```json
{
  "query": "mutation($email: String!, $password: String!) { login(email: $email, password: $password) { token user { id email role active } } }",
  "variables": {
    "email": "admin@aoa.com",
    "password": "Admin12345"
  }
}
```

### Ejemplo: salida de inventario

```json
{
  "query": "mutation($input: RegisterMovementInput!) { registerMovement(input: $input) { id type quantity previousStock newStock lowStockAlert } }",
  "variables": {
    "input": {
      "productId": "<ObjectId del producto>",
      "type": "OUT",
      "quantity": 5,
      "observations": "Salida"
    }
  }
}
```

*(Requiere header `Authorization`.)* En **`IN`**, `unitPrice` es obligatorio y > 0 (validación Yup).

## Validación y errores

- **Yup** en `src/utils/validators/*` para crear/actualizar entidades y filtros donde aplica.
- Errores de validación de negocio: `GraphQLError` con `extensions.code = BAD_USER_INPUT` y `fieldErrors`.
- **`formatError`** en Apollo: mensajes seguros al cliente; en desarrollo se registra detalle en consola. Códigos útiles: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`.

## Índices MongoDB (resumen)

- **Producto:** `code` único parcial (solo `status: true`), índices de apoyo en nombre/categoría y compuesto para consultas de stock bajo.
- **Movimiento:** `{ productId, createdAt }`, `{ type, createdAt }`.
- **Usuario:** `email` único.

## Estructura de respuestas paginadas

Patrón unificado `{ items, total }` con `limit` (acotado, típ. default 10 en productos/usuarios y 20 en movimientos por defecto del helper) y `offset`.

## Seguridad — notas para revisión

- Secretos solo vía `.env`; no commitear `.env`.
- Contraseñas nunca se exponen en GraphQL; listados usan `.select('-password')`.
- JWT con expiración (p. ej. 8h en `AuthService`).

## Scripts npm

| Script | Acción |
|--------|--------|
| `npm run dev` | Desarrollo con recarga (`ts-node-dev`) |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta `node dist/app.js` |

---

Si algo del dominio o del contrato GraphQL evoluciona, este README debería actualizarse junto con los `typeDefs` y los validadores.
