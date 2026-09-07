# TG LAB — Fase 1: Arquitectura y Planificación

> Documento de planificación. **Aún no hay código.** La implementación no comienza
> hasta que la arquitectura sea aprobada. Última actualización: 2026-09-07.

---

## 0. Inconsistencias y observaciones detectadas (léelo primero)

| # | Tema | Observación / recomendación |
|---|------|------------------------------|
| 1 | **Vercel gratis** | El plan Hobby de Vercel **prohíbe uso comercial** en sus Términos. Para producción hay que presupuestar Vercel Pro (~USD 20/mes) **o** un VPS. Ver sección de costos. |
| 2 | **Pagos "reales" desde el día 1** | Transbank Webpay exige afiliación comercial (días/semanas de trámite). Para poder **lanzar antes**, la arquitectura incluye **transferencia bancaria manual** (100% real y legal para persona natural) + **Mercado Pago** (onboarding inmediato). Webpay se suma cuando esté aprobado. |
| 3 | **"Comprar sin cuenta" + favoritos/repetir compra** | No es contradicción: se construye *guest-first* y las cuentas son una capa opcional encima. Prioridad: checkout invitado. |
| 4 | **Video autohospedado** | Transcodificar/servir video es caro y frágil. Recomiendo un servicio (Bunny Stream o Cloudflare Stream). MP4 en almacenamiento + CDN es aceptable para empezar con límites estrictos. |
| 5 | **"No hardcodear NADA" (colores, logo, favicon, textos)** | Factible: theming en runtime con variables CSS desde la config, `favicon`/Open Graph vía rutas dinámicas de Next.js. |
| 6 | **IVA / Ley del Consumidor** | En Chile el precio mostrado al consumidor final **debe incluir IVA**. Los campos de precio se diseñan como "precio final con IVA incluido". No es asesoría legal. |
| 7 | **Boleta electrónica** | Como persona natural con Inicio de Actividades puedes emitir boletas desde el portal gratuito del SII manualmente al principio. La tienda deja una **interfaz desacoplada** (`DocumentService`) lista para conectar un proveedor después. No se inventa integración con el SII. |
| 8 | **Testing "de todo"** | Cobertura total es inviable como fase inicial. Se prioriza el **flujo crítico** (producto → variante → carrito → checkout → pago → pedido → stock), más pruebas unitarias de precios/descuentos/cupones/stock. |
| 9 | **RUT y datos personales** | Se guarda el mínimo: RUT solo en el pedido (necesario para boleta), validado con dígito verificador. |

---

## 1. Arquitectura propuesta

**Aplicación monolítica modular en Next.js (App Router)** — un solo despliegue, tres zonas:

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 (App Router)                  │
│                                                             │
│  STOREFRONT (público)      ADMIN (/admin)     API/WEBHOOKS   │
│  - Server Components        - Auth requerida  - route handlers│
│  - SEO, ISR/cache           - CRUD completo   - pagos webhooks│
│  - Server Actions carrito   - RBAC            - idempotencia  │
└───────────────┬─────────────────┬──────────────────┬─────────┘
                │                 │                  │
        ┌───────▼───────┐  ┌──────▼──────┐   ┌───────▼────────┐
        │  Capa de       │  │  Prisma ORM │   │ Proveedores    │
        │  Servicios     │  │  PostgreSQL │   │ externos       │
        │  (dominio)     │  └─────────────┘   │ (adaptadores)  │
        │ - PricingService                    │ - PaymentProvider
        │ - InventoryService                  │ - EmailProvider │
        │ - OrderService                      │ - StorageProvider
        │ - ShippingService                   │ - DocumentService (boleta)
        │ - CartService                       │ - ShippingCarrier (futuro)
        │ - SettingsService                   └────────────────┘
        └────────────────┘
```

Principios:

- **Toda regla de negocio vive en la capa de servicios** (`/src/server/services`), no en componentes ni en route handlers. Testeable en aislamiento.
- **El servidor es la única fuente de verdad de precios.** El frontend nunca envía montos; envía IDs y cantidades. `PricingService` recalcula desde la BD en cada render del carrito y de nuevo al crear el pedido y al confirmar el pago.
- **Adaptadores para todo lo externo** detrás de interfaces (`PaymentProvider`, `StorageProvider`, `EmailProvider`, `DocumentService`). Cambiar de proveedor o agregar uno nuevo no toca el dominio.
- **Datos históricos inmutables**: los pedidos guardan *snapshots*. Cambiar o archivar un producto no altera pedidos pasados.
- **Server Components por defecto**, Client Components solo donde hay interacción (galería, selector de variantes, carrito, filtros, formularios admin).

---

## 2. Stack definitivo y versiones

| Capa | Elección | Versión objetivo (verificar la estable al implementar) |
|------|----------|--------|
| Runtime | Node.js LTS | 22.x |
| Gestor de paquetes | pnpm | 9.x |
| Framework | **Next.js** App Router | 15.x (React 19) |
| Lenguaje | **TypeScript** (`strict: true`) | 5.7+ |
| Estilos | **Tailwind CSS** | v4 |
| Componentes UI | **shadcn/ui** (Radix primitives) — accesibles, copiados al repo | actual |
| ORM | **Prisma** | 6.x |
| Base de datos | **PostgreSQL** | 16/17 |
| Autenticación | **Better Auth** (TS-first, credenciales + sesiones + plugins RBAC/2FA/rate-limit). Alternativa: Auth.js v5. | 1.x |
| Validación | **Zod** (en cada Server Action, route handler y formulario) | actual |
| Formularios | React Hook Form + `@hookform/resolvers` (Zod) | actual |
| Estado cliente (admin) | TanStack Query (solo donde haga falta) | v5 |
| Drag & drop | `dnd-kit` (ordenar imágenes/categorías) | actual |
| Imágenes | `next/image` + `sharp` (renditions webp/avif al subir) + CDN de optimización | actual |
| Emails | **Resend** + **React Email** (plantillas) | actual |
| Rate limiting / cache | Upstash Redis (o memoria + BD si se prefiere cero servicios) | actual |
| Errores | **Sentry** (free tier) | actual |
| Tests | **Vitest** (unit), **Playwright** (e2e) | actual |
| Lint/format | ESLint (config Next) + Prettier | actual |
| CI | GitHub Actions (lint + typecheck + test + build) | — |
| Pagos CL | `transbank-sdk` (oficial), SDK oficial de Mercado Pago, Flow vía REST | actual |

> Antes de fijar cada dependencia crítica se verifica su última versión estable y que esté mantenida activamente. No se usan paquetes abandonados.

---

## 3. Estructura del proyecto

```
tglab.store/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     # datos DEMO (no hardcode en la app)
├── public/
├── src/
│   ├── app/
│   │   ├── (store)/                # storefront
│   │   │   ├── page.tsx            # home
│   │   │   ├── productos/
│   │   │   ├── producto/[slug]/
│   │   │   ├── categoria/[...slug]/
│   │   │   ├── personalizados/
│   │   │   ├── carrito/
│   │   │   ├── checkout/
│   │   │   ├── pedido/             # seguimiento (nº + email)
│   │   │   ├── nosotros/ contacto/ preguntas-frecuentes/ ...
│   │   │   └── cuenta/             # opcional (fase posterior)
│   │   ├── admin/
│   │   │   ├── layout.tsx          # protegido por middleware
│   │   │   ├── page.tsx            # dashboard
│   │   │   ├── productos/ categorias/ atributos/ pedidos/
│   │   │   ├── clientes/ cupones/ despachos/ personalizados/
│   │   │   └── configuracion/
│   │   ├── api/
│   │   │   ├── webhooks/{mercadopago,webpay,flow}/route.ts
│   │   │   ├── uploads/route.ts
│   │   │   └── og/route.tsx        # Open Graph dinámico
│   │   ├── sitemap.ts  robots.ts
│   │   ├── layout.tsx              # theming desde SettingsService
│   │   └── not-found.tsx  error.tsx
│   ├── server/
│   │   ├── services/               # PricingService, InventoryService, ...
│   │   ├── providers/              # payment/, storage/, email/, documents/
│   │   ├── repositories/           # acceso a datos con Prisma
│   │   ├── auth/                   # config Better Auth
│   │   └── actions/                # Server Actions (validadas con Zod)
│   ├── lib/                        # utilidades (formato CLP, RUT, fechas TZ)
│   ├── components/                 # UI compartida
│   └── config/                     # constantes no sensibles, enums
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.example                   # documentado, sin secretos
├── .github/workflows/ci.yml
└── README.md
```

---

## 4. Modelo de base de datos propuesto

Entidades principales (Prisma).

**Usuarios y clientes**
- `AdminUser` — `id, email (unique), passwordHash, name, role (OWNER|STAFF), isActive, twoFactorSecret?, lastLoginAt, createdAt`
- `Customer` — `id, email (unique), firstName, lastName, phone?, rut?, passwordHash? (null = invitado), emailVerifiedAt?, createdAt`
- `Address` — `id, customerId?, region, comuna, street, number, apartment?, postalCode?, notes?, isDefault`

**Catálogo**
- `Category` — `id, parentId? (self-relation → subcategorías), name, slug (unique), description?, imageUrl?, position, isActive, seoTitle?, seoDescription?`
- `Product` — `id, name, slug (unique), sku?, shortDescription?, description (rich text/JSON), status (DRAFT|PUBLISHED|HIDDEN), isFeatured, material?, dimensions?, weightGrams?, packageWeightGrams?, packageDimensions?, allowsShipping, allowsPickup, lowStockThreshold, lastUnitsThreshold, seoTitle?, seoDescription?, publishedAt?, archivedAt?, createdAt, updatedAt`
- `ProductCategory` — `productId, categoryId, isPrimary` (M2M; una marcada como principal para breadcrumb/SEO)
- `ProductMedia` — `id, productId, type (IMAGE|VIDEO), provider, url, storageKey, posterUrl?, alt?, width?, height?, blurDataUrl?, position, isPrimary, variantId?`

**Atributos y variantes (dinámicos)**
- `Attribute` — `id, name, slug (unique), type (SELECT|COLOR), position` (reutilizable en toda la tienda)
- `AttributeValue` — `id, attributeId, label, slug, hex? (para COLOR), imageUrl? (textura), position`
- `ProductAttribute` — `productId, attributeId, position` (qué atributos usa este producto)
- `ProductVariant` — `id, productId, sku?, price (int CLP), compareAtPrice?, stock (int), reservedStock (int), weightGrams?, isActive, position` — **todo producto tiene ≥1 variante**
- `VariantAttributeValue` — `variantId, attributeId, attributeValueId` (unique `(variantId, attributeId)`)
- `CustomFieldDefinition` — `id, productId, key, label, helpText?, type (TEXT_SHORT|TEXT_LONG|NUMBER|SELECT|CHECKBOX|FILE), isRequired, maxLength?, options (JSON), position`

**Inventario**
- `InventoryMovement` — `id, variantId, type (SALE|RESTOCK|ADJUSTMENT|CANCELLATION|RETURN|RESERVATION|RELEASE), quantityDelta, stockBefore, stockAfter, reason?, orderId?, adminUserId?, createdAt`

**Carrito**
- `Cart` — `id, token (cookie httpOnly), customerId?, updatedAt, expiresAt`
- `CartItem` — `id, cartId, variantId, quantity, customizations (JSON)` (precios NO se guardan; se recalculan)

**Pedidos (con snapshots)**
- `Order` — `id, number (unique, "TG-000001"), customerId?, email, phone, firstName, lastName, rut?, status (PENDING_PAYMENT|PAID|PREPARING|READY_FOR_PICKUP|SHIPPED|DELIVERED|CANCELLED), paymentStatus (PENDING|PAID|REJECTED|CANCELLED|REFUNDED), fulfillmentMethod (SHIPPING|PICKUP), subtotal, discountTotal, shippingTotal, grandTotal, currency ("CLP"), couponCode?, shippingAddress (JSON snapshot), carrier?, trackingNumber?, trackingUrl?, customerNote?, internalNotes?, placedAt, paidAt?, createdAt, updatedAt`
- `OrderItem` — `id, orderId, productId? (ON DELETE SET NULL), variantId?, productName, variantLabel?, sku?, unitPrice, quantity, lineDiscount, lineTotal, imageUrl?` (todo *snapshot*)
- `OrderItemCustomization` — `id, orderItemId, key, label, value, fileUrl?`
- `OrderStatusHistory` — `id, orderId, fromStatus?, toStatus, note?, adminUserId?, createdAt`

**Pagos**
- `Payment` — `id, orderId, provider (MERCADOPAGO|WEBPAY|FLOW|BANK_TRANSFER), providerReference?, status (INITIATED|PENDING|AUTHORIZED|PAID|REJECTED|CANCELLED|REFUNDED), amount, idempotencyKey (unique), rawPayload (JSON), createdAt, updatedAt` — unique `(provider, providerReference)`

**Cupones**
- `Coupon` — `id, code (unique), type (PERCENT|FIXED|FREE_SHIPPING), value, startsAt?, endsAt?, minSubtotal?, maxUses?, maxUsesPerCustomer?, appliesToProductIds (JSON), appliesToCategoryIds (JSON), isActive, createdAt`
- `CouponUse` — `id, couponId, orderId, customerEmail, amountDiscounted, createdAt`

**Personalizados**
- `CustomRequest` — `id, name, email, phone?, description, quantity?, desiredDate?, notes?, status (NEW|REVIEWING|QUOTED|ACCEPTED|REJECTED|DONE), createdAt`
- `CustomRequestFile` — `id, requestId, url, storageKey, mimeType, sizeBytes`

**Despachos**
- `ShippingZone` — `id, name, isActive, position`
- `ShippingZoneLocation` — `id, zoneId, region, comuna?` (comuna null = toda la región)
- `ShippingRate` — `id, zoneId, name, price, freeOverSubtotal?, minWeightGrams?, maxWeightGrams?, isActive`

**Configuración y contenido**
- `Setting` — `key (unique), value (JSON), updatedAt` — vía `SettingsService` con validación Zod y caché. Cubre marca, colores, textos home, contacto, redes, WhatsApp, umbrales, datos de retiro, datos bancarios, IDs de analítica, etc. **Cero identidad hardcodeada.**
- `Page` — `id, slug (unique), title, content (rich), seoTitle?, seoDescription?, isPublished` — nosotros, términos, privacidad, FAQ, cambios/devoluciones, despachos.

**Documentos tributarios (boleta — desacoplado)**
- `DocumentRecord` — `id, orderId, type, status (PENDING|ISSUED|ERROR), folio?, issuedAt?, provider?, externalReference?, rawPayload (JSON)`

**Índices/constraints clave**: `Product.slug` unique; `(Product.status, publishedAt)`; `ProductVariant.productId`; `VariantAttributeValue` unique `(variantId, attributeId)`; `Order.number` unique; `Order.email`; `(InventoryMovement.variantId, createdAt)`; `Payment` unique `(provider, providerReference)` e `idempotencyKey`; `Category.slug` unique; FKs de `OrderItem` con `ON DELETE SET NULL`.

---

## 5. Productos y variantes dinámicas

1. **Atributos = datos.** En `/admin/atributos` creas "Color" (tipo COLOR, con HEX e imagen opcional por valor), "Modelo" (SELECT), "Personaje", "Acabado"… ilimitados y reutilizables entre productos.
2. **El producto elige qué atributos usa** (`ProductAttribute`).
3. **Generar combinaciones**: botón en el admin → producto cartesiano de los valores seleccionados → crea una `ProductVariant` por combinación. Puedes desmarcar combinaciones que no fabricas.
4. **Cada variante es independiente**: SKU, precio, precio oferta, stock, peso, activo/inactivo, e imágenes propias (`ProductMedia.variantId`).
5. **Producto simple** = producto con **cero** atributos y **una** variante "default". Un solo camino de código para inventario, carrito y pedido.
6. **En la tienda**: se muestran solo atributos/valores con al menos una variante activa disponible. El cliente elige un valor por atributo → se resuelve la variante exacta → se actualizan **precio, oferta, SKU, stock/disponibilidad y galería**.
7. **Swatches de color**: círculos con HEX o textura; estado seleccionado accesible (teclado + `aria`).
8. **Campos personalizados** (`CustomFieldDefinition`): validados en cliente y servidor; los valores del cliente se copian **literalmente** a `OrderItemCustomization` al crear el pedido.

---

## 6. Imágenes y videos

**Almacenamiento**: nunca binarios en PostgreSQL. Solo `url` + `storageKey` + metadatos. Objeto en **Cloudflare R2** (S3-compatible, **egress gratis**) o **Bunny Storage** (CDN incluido).

**Subida (admin)**:
1. Validar tamaño (imagen ≤ 8 MB, video ≤ 100 MB, configurable).
2. **Sniff de *magic bytes*** para confirmar el MIME real.
3. Nombre aleatorio (`nanoid`), ruta no predecible, bucket sin ejecución.
4. Imágenes: `sharp` genera renditions **AVIF/WebP** en varios anchos + `blurDataUrl`. O resize on-the-fly vía **Cloudflare Images / Bunny Optimizer**.
5. Guardar `ProductMedia` con `position`, `isPrimary`, `variantId?`.

**Galería (tienda)**: orden libre imagen/video mezclados, `position` con **drag & drop** (`dnd-kit`). Móvil: swipe, puntos de navegación, zoom. Lazy loading + `srcset`.

**Video**: recomendado **Bunny Stream** o **Cloudflare Stream** (HLS adaptativo, poster, sin transcodificar). Para empezar sin ese servicio: MP4 (H.264) en R2/CDN, `preload="none"`, **sin autoplay con sonido**, controles nativos, poster obligatorio, límite de tamaño estricto.

**Banners y archivos de solicitudes personalizadas**: mismo pipeline validado; archivos de clientes en prefijo/bucket separado, no público por defecto.

---

## 7. Inventario

- **El stock vive en `ProductVariant.stock`** (+ `reservedStock`).
- **Reserva al iniciar el pago**: TTL ~15 min (`RESERVATION`). Pago fallido/expirado → `RELEASE`. Confirmado → `SALE`.
- **Confirmación de pago** (webhook verificado server-side), en **una transacción**:
  - `UPDATE variant SET stock = stock - :qty WHERE id = :id AND stock >= :qty`, verificando filas afectadas (evita sobreventa). Alternativa: `SELECT … FOR UPDATE`.
  - Se escribe `InventoryMovement` (SALE) con `stockBefore/stockAfter`.
  - Stock insuficiente → pedido marcado para revisión, aviso al admin, ruta de reembolso (manual al inicio).
- **Idempotencia**: `Payment.idempotencyKey` + transiciones solo hacia adelante.
- **Movimientos registrados**: venta, reposición, ajuste, cancelación, devolución, reserva, liberación — con cantidad anterior/nueva, diferencia, motivo, fecha, admin responsable.
- **Umbrales configurables**: "stock bajo" y "últimas unidades" (globales en `Setting`, sobre-escribibles por producto). Alertas en dashboard.

---

## 8. Arquitectura de pedidos

1. **Checkout** → `OrderService.createDraft`:
   - El servidor **recalcula todo desde la BD**: precios de variante, ofertas vigentes, descuento de cupón, costo de despacho por zona/comuna/peso, total. **Ignora montos del frontend.**
   - Crea `Order` (`PENDING_PAYMENT`) + `OrderItem` con **snapshots** + `OrderItemCustomization` + dirección JSON snapshot.
   - **Número**: secuencia PostgreSQL → `TG-000001`.
2. **Pago**: `createTransaction` → redirección → retorno → `commitTransaction` (validación server-side: estado + **monto pagado == `order.grandTotal`**) → `markPaid` (transacción: descuento de stock, historial, email, `DocumentRecord` PENDING).
3. **Estados**: Pendiente de pago → Pagado → En preparación → Listo para retiro / Enviado → Entregado (o Cancelado). Cada cambio en `OrderStatusHistory` con autor y nota.
4. **Inmutabilidad**: editar/archivar un producto **no toca** pedidos históricos. Se **prefiere archivar** a borrar cuando hay ventas asociadas; confirmación explícita para acciones destructivas.
5. **Seguimiento público** `/pedido`: número + email → timeline + transportista/código/enlace cuando existan. Rate-limit contra enumeración.

---

## 9. Arquitectura de pagos

```ts
interface PaymentProvider {
  key: 'MERCADOPAGO' | 'WEBPAY' | 'FLOW' | 'BANK_TRANSFER';
  isConfigured(): boolean;                       // según env vars
  createTransaction(order): Promise<{ redirectUrl?: string; providerReference: string }>;
  commitTransaction(params): Promise<{ status; amountPaid; raw }>;   // validación server-side
  parseWebhook(req): Promise<{ providerReference; status; amountPaid; raw }>;
}
```

Reglas transversales:
- **Creación de orden antes de pagar**; el pago referencia la orden.
- **Validación server-side siempre**: nunca se marca pagado por un retorno del navegador sin confirmar contra el proveedor.
- **Webhooks + retorno**: el retorno da UX inmediata; el webhook es la fuente confiable (con verificación de firma donde exista).
- **Idempotencia**: `unique(provider, providerReference)` + `idempotencyKey`; transiciones solo hacia adelante.
- **Anti-manipulación de monto**: se compara el monto del proveedor con `order.grandTotal` recalculado; discrepancia → no se aprueba, se alerta.
- **Sin datos de tarjeta** en ningún punto.
- **Credenciales solo en variables de entorno**, con `SANDBOX/TEST` y `PRODUCTION` separados.
- **Si no hay credenciales reales**: `isConfigured()` = `false`, el método no aparece en checkout, el admin ve "pendiente de configurar". **No se simula ningún pago exitoso.**
- **Transferencia bancaria** (`BANK_TRANSFER`): método **real**. Orden en `PENDING_PAYMENT`, muestra datos bancarios desde `Setting`, el admin confirma el pago manualmente (ahí baja stock y se envían emails).

---

## 10. Pasarelas de pago para Chile (comparación)

| Proveedor | Onboarding | Medios | Comisión aprox. (verificar) | Notas | Recomendación |
|-----------|-----------|--------|------------------------------|-------|---------------|
| **Mercado Pago** | Inmediato | Tarjetas, débito, transferencia, dinero en cuenta | ~3,19–4,59 % + IVA según plazo | SDK Node oficial; buena doc | **Empezar aquí** |
| **Transbank Webpay Plus** | Afiliación (días/semanas); compatible con persona natural | Crédito + débito RedCompra | ~1,19–2,95 % + IVA (negociable) | `transbank-sdk` oficial; sandbox público | **Sumar cuando esté aprobado** |
| **Flow.cl** | Rápido | Webpay, Servipag, MACH, tarjetas, transferencia | Plan mensual + ~2,99 % + fijo | REST API; acceso a Webpay sin trámite directo | Alternativa si Transbank se demora |
| **Khipu** | Rápido | Solo transferencia bancaria | ~1 % + fijo | API simple | Complemento de bajo costo, opcional |
| **Transferencia manual** | Ninguno | Transferencia directa | 0 % | Confirmación manual en admin | Incluido desde el día 1 |

> Antes de programar **cada** integración se consulta exclusivamente la documentación oficial y vigente del proveedor. No se inventan endpoints ni parámetros.

---

## 11. Sistema de despachos

- **Configurable 100 % desde `/admin/despachos`.** Nada hardcodeado.
- `ShippingZone` + `ShippingZoneLocation` (región y opcionalmente comuna) + `ShippingRate` (precio fijo, por rango de peso, y/o **gratis sobre X monto**).
- **Retiro / entrega local**: opción gratuita. La **dirección exacta no se publica** hasta cargarla en `Setting`.
- **Despacho gratis** global o por zona, umbral configurable.
- **Comunas sin cobertura**: solo retiro o "contáctanos".
- En checkout: región + comuna → `ShippingService.getOptions()` → **recalculado server-side** al crear la orden.
- **Preparado para el futuro**: interfaz `ShippingCarrier` (cotización + etiqueta + tracking) para integrar luego Chilexpress / Starken / Correos de Chile. **No se implementa ahora ni se inventan sus APIs.**

---

## 12. Autenticación del administrador

- **Better Auth**, tabla `AdminUser` **separada** de `Customer`.
- Hash **scrypt** (o **Argon2id**). Sin contraseñas por defecto.
- **Sin `admin/admin`**: primer admin vía script CLI (`pnpm admin:create`) interactivo. Nada en el repo ni en el seed.
- Sesiones en **cookie httpOnly + Secure + SameSite=Lax**, expiración corta con rotación.
- **Middleware** protege `/admin/*` y `/api/admin/*`; verificación de rol en cada Server Action.
- **Rate limiting** en login + bloqueo temporal tras N intentos.
- **2FA (TOTP)** para el `OWNER`.
- **Cuentas de cliente** (fase posterior): mismo sistema, tabla `Customer`, verificación de email, nunca mezcladas con el rol admin.

---

## 13. Servicios externos necesarios

| Servicio | Para qué | Obligatorio para lanzar |
|----------|----------|--------------------------|
| Hosting (Vercel Pro **o** VPS) | Ejecutar la app | Sí |
| PostgreSQL administrado (Neon **o** Supabase) | Base de datos | Sí |
| Object Storage (Cloudflare R2 **o** Bunny) | Imágenes, banners, archivos | Sí |
| CDN/optimizador de imágenes | Resize/formatos modernos | Recomendado |
| Video (Bunny Stream **o** Cloudflare Stream) | Videos de producto | Opcional al inicio |
| Resend | Emails transaccionales | Sí (para emails reales) |
| Mercado Pago | Cobros online | Sí (o transferencia manual) |
| Transbank / Flow | Cobros online (2ª etapa) | No |
| Upstash Redis | Rate limiting / caché | Opcional |
| Sentry | Monitoreo de errores | Recomendado (free) |
| GA4 + Meta Pixel | Analítica | Opcional |
| NIC Chile + Cloudflare DNS | Dominio `.cl` + DNS/HTTPS | Sí |
| Proveedor de boleta electrónica (futuro) | Documentos SII | No (interfaz lista) |
| GitHub | Repo + CI | Sí |

---

## 14. Costos mensuales aproximados para comenzar

Valores referenciales (USD), verificar al contratar.

| Ítem | Opción económica | Opción "sin ops" |
|------|------------------|------------------|
| Dominio `.cl` | ~USD 10/año ≈ **$1/mes** (NIC Chile) | igual |
| Hosting | **VPS Hetzner CX22 + Coolify ≈ €4,5/mes** | **Vercel Pro $20/mes** |
| PostgreSQL | Neon free / Supabase free = **$0** | ~$19–25 al escalar |
| Object storage | R2: <10 GB **$0**, luego ~$0,015/GB, egress $0 | Bunny ~$1–5/mes |
| Optimización imágenes | ~$0–5 | igual |
| Video | Bunny/CF Stream ~$1–5/mes (si se usa) | uso |
| Email | Resend free (3.000/mes) = **$0** | $0 |
| Redis | Upstash free = **$0** | $0 |
| Sentry | free = **$0** | $0 |
| **Fijo mensual estimado** | **≈ $5–12/mes** | **≈ $21–30/mes** |
| Comisiones de pago | solo por venta (~2–4,5 % + IVA) | igual |

**Recomendación para empezar:** Cloudflare R2 + Neon (o Supabase) + Resend en free tier. Para producción, **Vercel Pro** (vale los $20 por seguridad por defecto y cero mantenimiento de servidor). Si el presupuesto es crítico, VPS Hetzner + Coolify a ~€5, asumiendo mantenimiento del servidor.

---

## 15. Qué puede empezar gratis

- **PostgreSQL**: Neon o Supabase free tier.
- **Storage**: Cloudflare R2 (10 GB gratis, sin egress).
- **Email**: Resend (3.000/mes, 100/día).
- **Redis**: Upstash free.
- **Errores**: Sentry free.
- **CI**: GitHub Actions.
- **Analítica**: GA4 y Meta Pixel.
- **Pagos**: sandbox de Mercado Pago / Webpay / Flow; en producción solo comisión por venta, sin costo fijo (Mercado Pago y Webpay estándar).
- **Dev/staging** puede correr en Vercel Hobby; solo la **producción** necesita Pro o VPS.

---

## 16. Estrategia de deploy

- **Repo en GitHub.** CI (GitHub Actions): `lint` + `typecheck` + `test` + `build` en cada PR.
- **Entornos**: `local` → `preview` (deploy por rama/PR) → `production` (rama `main`).
- **BD por entorno**: Neon con *branching* o BD de staging separada. Producción aislada.
- **Migraciones**: `prisma migrate deploy` en release. **Nunca** migraciones destructivas automáticas: si una migración borra/transforma datos, se detiene y se explican consecuencias antes.
- **Secretos**: panel de Vercel o `.env` del VPS con permisos restringidos. Nunca en el repo.
- **Dominio**: DNS en Cloudflare, HTTPS automático, HSTS, redirección `www` ↔ apex. Instrucciones paso a paso para NIC Chile en la fase de deploy.
- **Rollback**: Vercel mantiene despliegues previos (1 clic); en VPS, artefactos versionados.

---

## 17. Estrategia de backups

- **Base de datos**:
  - Neon/Supabase: backups automáticos y PITR en planes pagos.
  - Free tier: **`pg_dump` nocturno** vía GitHub Action programada → archivo cifrado a bucket R2 dedicado → retención 30 días + 1 copia mensual a 12 meses.
- **Storage**: versioning en R2 + ciclo de vida; sincronización periódica a un segundo bucket/proveedor.
- **Configuración de tienda**: en la BD (cubierta por backup) + **botón "Exportar configuración" (JSON)** en el admin.
- **Pedidos/clientes**: parte del backup de BD + export CSV mensual opcional.
- **Restauración**: documentada en README (crear BD nueva → `pg_restore` → verificar → re-apuntar `DATABASE_URL`). **Prueba de restauración trimestral.**
- **Nunca** borrado automático de datos de producción.

---

## 18. Seguridad (prácticas aplicadas)

- Hash de contraseñas con scrypt/Argon2id; sin credenciales por defecto ni en el repo.
- Auth admin con sesiones en cookies `httpOnly`/`Secure`/`SameSite`; 2FA para el owner; rotación de sesión.
- Autorización por rol verificada en **cada** Server Action y route handler.
- **Validación server-side con Zod** en todas las entradas; sanitización del HTML de descripciones (allowlist).
- Prisma = consultas parametrizadas (sin SQL crudo salvo el `UPDATE` de stock controlado).
- **Rate limiting** en login, seguimiento de pedidos, formularios públicos, uploads y webhooks.
- **Headers de seguridad**: CSP estricta, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`.
- **Uploads**: verificación de *magic bytes*, allowlist de MIME, límite de tamaño y dimensiones, nombres aleatorios, bucket sin ejecución, archivos de clientes no públicos.
- **CSRF**: verificación de origen de Next.js en Server Actions; route handlers same-site + verificación de origen; webhooks con firma del proveedor.
- Secretos **solo server-side** (nunca `NEXT_PUBLIC_*` para datos sensibles).
- **Sin PII en logs**; errores con IDs de correlación. No se filtran stack traces al cliente.
- Anti-manipulación de precios y de montos de pago.
- RUT validado (dígito verificador) y almacenado al mínimo.
- `pnpm audit` en CI + Dependabot; revisión de dependencias críticas antes de adoptarlas.
- Páginas de error dedicadas: 404, 500, producto inexistente, producto agotado, pago fallido.

---

## 19. Fases de implementación

Una fase está "lista" solo si está **implementada, probada y compila** — no por haber generado código.

| Fase | Contenido | Cubre del checklist |
|------|-----------|---------------------|
| **F0 — Setup** | Repo, Next 15 + TS + Tailwind v4, shadcn/ui, Prisma, ESLint/Prettier, Vitest/Playwright, GitHub Actions, `.env.example`, layout base, tokens de tema desde settings | Configuración proyecto |
| **F1 — Base de datos** | Schema Prisma completo, migraciones, `SettingsService`, seed DEMO | Base de datos, Arquitectura |
| **F2 — Auth admin + shell** | Better Auth, `AdminUser`, `admin:create`, middleware, layout `/admin`, dashboard con métricas reales | Autenticación admin, Dashboard |
| **F3 — Catálogo admin (básico)** | Categorías/subcategorías, atributos y valores, productos **simples**, subida y galería multimedia con drag&drop | Administración, Categorías, Productos, Multimedia |
| **F4 — Variantes + stock** | `ProductAttribute`, generación de combinaciones, edición por variante, `InventoryService` + movimientos + umbrales, campos personalizados | Variaciones, Stock |
| **F5 — Storefront catálogo** | Home editable, `/productos` con búsqueda/filtros dinámicos/orden/paginación, ficha de producto, galería móvil, selector de variantes y colores, personalización, relacionados | Home, Catálogo, Productos |
| **F6 — Carrito** | Carrito server-side persistente (cookie), recálculo en cada render | Carrito |
| **F7 — Checkout + despachos** | Checkout invitado, `ShippingService` configurable, retiro/despacho, recálculo server-side, creación de pedido con snapshots y número `TG-xxxxxx` | Checkout, Despachos, Pedidos |
| **F8 — Pagos** | Interfaz `PaymentProvider`, Mercado Pago (sandbox), transferencia manual, retorno + webhooks + idempotencia, descuento de stock en confirmación, anti-manipulación de monto | Pagos |
| **F9 — Pedidos admin + seguimiento + emails** | Gestión de pedidos (buscar/filtrar/estado/tracking/notas/impresión), `/pedido` público con timeline, emails Resend (React Email) | Pedidos, Seguimiento, Emails |
| **F10 — Cupones** | Tipos, reglas, límites, aplicación server-side, `CouponUse` | Cupones |
| **F11 — Personalizados** | `/personalizados` con subida de referencias, gestión y estados en admin, aviso "no constituye compra" | Personalizados |
| **F12 — Cuentas de cliente (opcional)** | Registro/login, historial de pedidos, direcciones, favoritos | Clientes |
| **F13 — SEO + analítica + legales** | Metadata, OG dinámico, sitemap, robots, canonical, Schema.org Product, breadcrumbs; GA4 + Meta Pixel con eventos e-commerce (sin duplicar `purchase`); páginas editables | SEO, Analítica, Páginas legales |
| **F14 — Hardening + testing + performance** | Headers, rate limits, validación de uploads, auditoría; e2e del flujo crítico; Core Web Vitals, caché, bundles, fuentes | Seguridad, Testing, Optimización |
| **F15 — Deploy + dominio + backups + boleta + docs** | Producción en Vercel/VPS, `tglab.cl` + DNS + HTTPS, backups automatizados + prueba de restore, `DocumentService` (boleta) desacoplado, README final | Deploy, Documentación |
| **F16 — Transbank/Flow** | Segunda pasarela cuando esté la afiliación | Pagos (ampliación) |

---

## 20. Qué información se necesita de ti

**Decisiones de arquitectura (para empezar F0):**

1. ¿Se aprueba el stack? (**Next.js 15 + TypeScript + Tailwind v4 + Prisma + PostgreSQL + Better Auth**). ¿Auth.js v5 en vez de Better Auth?
2. **Hosting de producción**: ¿Vercel Pro (~$20/mes, sin ops) o VPS Hetzner + Coolify (~€5/mes, con mantenimiento de servidor)?
3. **Base de datos**: ¿Neon o Supabase?
4. **Storage**: ¿Cloudflare R2 o Bunny?
5. **Video**: ¿se usa desde el inicio? ¿Bunny Stream, Cloudflare Stream o MP4 simple con límites?
6. **Pagos**: ¿se arranca con **Mercado Pago** (sandbox) + **transferencia manual**? ¿Cuenta de vendedor Mercado Pago ya existe? ¿Se inicia el trámite Webpay en paralelo?

**Datos que pueden quedar como *placeholder* ahora (no bloquean el desarrollo):**

7. Marca: logo y favicon (o placeholder tipográfico "TG LAB"), colores primario/secundario, textos del hero.
8. Dominio deseado (¿`tglab.cl`?) — verificar disponibilidad en NIC Chile.
9. Punto de retiro en Chiloé: ¿dirección ahora o placeholder?
10. Regiones/comunas a las que se despacha + tarifas iniciales (o placeholder editable).
11. Email remitente para Resend (ej. `hola@tglab.cl`) — requiere verificar DNS.
12. Datos bancarios para transferencia manual (placeholder hasta entregarlos).
13. RUT / nombre para páginas legales y futura boleta → placeholder claramente marcado.
14. WhatsApp, Instagram, Facebook.
15. IDs de Google Analytics 4 y Meta Pixel (si existen).
16. Umbrales por defecto: "stock bajo" (ej. 3) y "últimas unidades" (ej. 5).
17. Texto de política de cambios/devoluciones (o placeholder conforme a la Ley del Consumidor).
18. Cuenta de GitHub donde vivirá el repo.
19. Proveedor de boleta electrónica de interés a futuro (LibreDTE / Bsale / Nubox / otro).

---

## Checklist maestro (estado)

> Actualizado tras la Fase 0. Detalle de desviaciones (Next 16, npm, Prisma 7,
> Postgres local) en `README.md`.

```
[x] Arquitectura            (aprobada)
[x] Configuración proyecto  (Fase 0 completa: Next 16 + TS + Tailwind v4 + Prisma 7 + Better Auth, CI de scripts, lint/typecheck/test/build en verde)
[~] Base de datos           (schema completo + migraciones + seed DEMO; falta lógica de dominio)
[~] Autenticación admin     (Better Auth, roles owner/staff, login funcional, proxy de guarda; falta 2FA UI y rate-limit)
[~] Administración          (shell + dashboard con métricas reales + navegación; secciones son placeholders)
[x] Home
[x] Categorías
[x] Catálogo
[x] Productos
[x] Multimedia
[x] Variaciones
[x] Stock
[x] Carrito
[x] Checkout
[x] Despachos
[~] Pagos                    (MP + transferencia: código completo; MP inactivo hasta cargar credenciales)
[x] Pedidos
[x] Seguimiento
[x] Personalizados
[ ] Clientes                 (F12, opcional)
[x] Cupones
[x] Emails
[x] SEO                      (metadata, sitemap, robots, canonical, JSON-LD Product/Breadcrumb/Organization/WebSite, OG dinámico /api/og)
[x] Analítica                (GA4 + Meta Pixel opcionales, eventos e-commerce, purchase deduplicado)
[x] Páginas legales          (editables desde /admin/paginas; legales con [PLACEHOLDER] hasta datos reales)
[~] Seguridad                (rate-limit en memoria, validación de uploads, honeypot; falta auditoría F14)
[~] Testing                  (31 unit + 19 integración + 10 e2e; falta ampliar cobertura F14)
[ ] Optimización
[ ] Deploy
[ ] Documentación
```

> **Siguiente paso:** aprobar la arquitectura y responder las decisiones 1–6 de la sección 20.
> Con eso comienza la Fase 0 (setup del proyecto).
