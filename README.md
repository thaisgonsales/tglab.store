# TG LAB — Tienda online

E-commerce de TG LAB (emprendimiento de impresión 3D, Chiloé, Región de Los
Lagos, Chile). Next.js + TypeScript + Tailwind + PostgreSQL + Prisma.

La planificación completa está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).
El estado por fases está más abajo.

---

## Requisitos

- **Node.js 22 LTS** (ver `.nvmrc`)
- **npm 11+** (`npm install -g npm@11`)
- **PostgreSQL 16 o 17** instalado localmente (para el cluster de desarrollo).
  En producción se usa un Postgres administrado (Neon, Prisma Postgres, etc.).

## Instalación

```bash
npm install
cp .env.example .env        # y completa los valores (ver abajo)
npm run dev:db:init         # crea y levanta el Postgres local del proyecto (.devdb/)
npm run db:migrate          # aplica las migraciones
npm run db:seed             # datos DEMO de desarrollo
npm run admin:create        # crea el primer usuario del panel (rol "owner")
npm run dev                 # http://localhost:3000
```

## Base de datos en desarrollo

El proyecto usa un **cluster PostgreSQL dedicado** en `.devdb/` (ignorado por
git, autenticación `trust` solo en `127.0.0.1:5433`, sin contraseña). No
requiere Docker ni permisos de administrador.

| Comando                 | Acción                                    |
| ----------------------- | ----------------------------------------- |
| `npm run dev:db:init`   | crea el cluster + bases `tglab` / `tglab_shadow` y lo inicia |
| `npm run dev:db:start`  | inicia el servidor                        |
| `npm run dev:db:stop`   | detiene el servidor                       |
| `npm run dev:db:status` | estado                                    |

Si prefieres otro Postgres (uno ya instalado, Docker, Neon…), solo cambia
`DATABASE_URL` y `SHADOW_DATABASE_URL` en `.env`.

## Migraciones y Prisma

```bash
npm run db:migrate           # crear/aplicar migración en desarrollo
npm run db:migrate:deploy    # aplicar migraciones en producción
npm run db:generate          # regenerar el cliente (src/generated/prisma)
npm run db:studio            # explorar la BD
npm run db:reset             # ⚠️ recrea la BD y re-siembra (solo desarrollo)
```

> Prisma 7 genera el cliente en `src/generated/prisma/` (no versionado) y exige
> un _driver adapter_. `src/server/db.ts` elige automáticamente entre
> `@prisma/adapter-pg` (URLs `postgres://`) y Prisma Accelerate / Prisma
> Postgres (URLs `prisma+postgres://`).

## Scripts

| Comando                 | Descripción                                        |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | servidor de desarrollo                             |
| `npm run build`         | build de producción                               |
| `npm run start`         | servir el build                                    |
| `npm run lint`          | ESLint                                             |
| `npm run typecheck`     | `tsc --noEmit`                                     |
| `npm run test`          | pruebas unitarias (Vitest)                         |
| `npm run test:e2e`      | pruebas end-to-end (Playwright)                    |
| `npm run format`        | Prettier                                           |
| `npm run check`         | lint + typecheck + test + build (todo junto)      |
| `npm run admin:create`  | crear/actualizar usuario del panel                 |

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Resumen:

| Grupo            | Variables clave                                                             | ¿Obligatoria?                         |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| App              | `NEXT_PUBLIC_SITE_URL`, `APP_ENV`                                          | sí                                    |
| Base de datos    | `DATABASE_URL`, `SHADOW_DATABASE_URL`                                      | sí                                    |
| Autenticación    | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                                    | sí                                    |
| Almacenamiento   | `STORAGE_DRIVER`, `S3_*`                                                   | no (por defecto local en desarrollo)  |
| Pagos            | `MERCADOPAGO_*`, `PAYMENTS_BANK_TRANSFER_ENABLED`, `TRANSBANK_*`           | no (sin claves, el método no aparece) |
| Email            | `RESEND_API_KEY`, `EMAIL_FROM`                                            | no (sin clave, los emails van a consola) |
| Analítica        | `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`                         | no                                    |
| Monitoreo        | `SENTRY_DSN`                                                              | no                                    |

**Nunca** se suben secretos al repositorio. Solo `.env.example`.

## Panel de administración

- `/admin` — requiere sesión de staff.
- El primer usuario se crea con `npm run admin:create` (rol `owner`
  automáticamente). No existen contraseñas por defecto.
- Modo no interactivo (CI / bootstrap):
  `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create`.

## Pagos

**Mercado Pago (Checkout Pro)** — integración completa (crear preferencia,
redirección, webhook con validación de firma, verificación de monto contra la
BD, idempotencia, descuento de stock al aprobarse). Está **inactiva hasta
cargar las credenciales**: mientras `MERCADOPAGO_ACCESS_TOKEN` /
`MERCADOPAGO_PUBLIC_KEY` estén vacíos el método no aparece en el checkout y
**no se simula ningún pago**.

Para activarla (sandbox):

1. Sigue los pasos del bloque "Mercado Pago" en `.env.example` para obtener
   `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` (TEST-...) y
   `MERCADOPAGO_WEBHOOK_SECRET`, y déjalos en `.env`.
2. Para que MP alcance el webhook en local, expón el puerto con un túnel
   (p. ej. `ngrok http 3000`) y usa esa URL pública en `NEXT_PUBLIC_SITE_URL`
   y en la config de webhooks de MP.
3. Prueba con las [tarjetas de test de Mercado Pago](https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards).

**Transferencia bancaria** — método real, sin credenciales: el cliente ve los
datos (configurados en `/admin/configuracion`) y el equipo confirma el pago
desde `/admin/pedidos` (ahí se descuenta el stock).

**Webpay Plus (Transbank)** — integración mediante el SDK oficial. Solo aparece
cuando `TRANSBANK_COMMERCE_CODE` y `TRANSBANK_API_KEY` están configurados. El
retorno confirma la transacción directamente con Transbank y vuelve a validar
el monto del pedido antes de descontar stock.

En todos los casos: el stock se **reserva** al crear el pedido y solo se
**descuenta** al confirmarse el pago. Nunca se almacenan datos de tarjeta.

## Emails transaccionales

Desacoplado detrás de `EmailProvider` (`src/server/email/`). Se envían al crear
un pedido, al confirmarse el pago y en cada cambio de estado (preparación,
enviado, listo para retiro, entregado, cancelado).

- **Con `RESEND_API_KEY`** → envía con Resend.
- **Sin clave, en desarrollo/test** → imprime el correo en la consola.
- **Sin clave, en producción** → **no envía y registra el fallo** (no finge).

Un fallo de email nunca rompe el checkout ni un cambio de estado.

## SEO y analítica

- **Metadatos** por página (title/description/canonical/OpenGraph), `sitemap.xml`
  y `robots.txt` dinámicos.
- **Datos estructurados** JSON-LD: `Organization` + `WebSite` (home),
  `Product` + `BreadcrumbList` (ficha de producto).
- **Imagen OpenGraph** generada en `/api/og` (fallback cuando no se sube una en
  `/admin/configuracion`); acepta `?title=` y `?subtitle=`.
- **Analítica opcional**: GA4 (`NEXT_PUBLIC_GA4_ID`) y Meta Pixel
  (`NEXT_PUBLIC_META_PIXEL_ID`). Sin IDs no se carga ningún script de terceros.
  Eventos de e-commerce: `view_item`, `add_to_cart`, `remove_from_cart`,
  `view_cart`, `begin_checkout`, `purchase` (deduplicado por pedido).

## Páginas informativas

Nosotros, contacto, preguntas frecuentes, términos, privacidad,
cambios/devoluciones y despachos se editan desde `/admin/paginas`. Mientras no
se editen muestran un contenido por defecto; las legales llevan `[PLACEHOLDER]`
hasta completarse con los datos reales de TG LAB.

## Almacenamiento de archivos

`STORAGE_DRIVER=local` guarda las subidas en `public/uploads/` (solo desarrollo).
En producción se usa `STORAGE_DRIVER=s3` con Cloudflare R2 (S3-compatible).

## Testing

- **Unitarias** (Vitest): `npm run test` — lógica pura (`tests/unit/`).
- **Integración** (BD real): `npm run test:integration` — reservas de stock,
  aplicación de pagos, seguimiento de pedidos, emails.
- **E2E** (Playwright): `npm run test:e2e` — flujo crítico
  catálogo → variante → carrito → checkout → pedido → seguimiento público.

## Deploy

Pendiente (Fase 15). Objetivo: Vercel + Postgres administrado + Cloudflare R2.
Ver `docs/ARQUITECTURA.md` §16.

## Backups

Pendiente (Fase 15). Estrategia definida en `docs/ARQUITECTURA.md` §17.

---

## Estado por fases

| Fase                                    | Estado                            |
| --------------------------------------- | --------------------------------- |
| **F0 — Setup del proyecto**             | ✅ completada                      |
| **F1 — Base de datos (schema + seed)**  | ✅ completada                      |
| **F2 — Auth admin + shell**             | ✅ completada                      |
| **F3 — Catálogo admin**                 | ✅ completada                      |
| **F4 — Variantes + stock**              | ✅ completada                      |
| **F5 — Storefront catálogo**            | ✅ completada                      |
| **F6 — Carrito**                        | ✅ completada                      |
| **F7 — Checkout + despachos + pedidos** | ✅ completada                      |
| **F8 — Pagos**                          | ✅ código listo — falta activar Mercado Pago (credenciales) |
| **F9 — Pedidos admin + seguimiento + emails** | ✅ completada                 |
| **F10 — Cupones**                        | ✅ completada                      |
| **F11 — Solicitudes personalizadas**     | ✅ completada                      |
| **F12 — Cuentas de cliente**             | ✅ cuentas, seguridad, direcciones, pedidos, favoritos y reseñas verificadas |
| **F13 — SEO + analítica + legales**     | ✅ completada                      |
| **F14 — Hardening + testing + performance** | ✅ CSP, consentimiento, Sentry opcional, rate limits, CI, unitarias, integración y E2E |
| **F15 — Deploy + backups + boleta + docs** | 🟡 Railway preparado; falta crear servicios/dominio, activar backups y credenciales; boleta manual disponible |

### Desviaciones respecto a `docs/ARQUITECTURA.md`

Decisiones tomadas durante la Fase 0 (todas dentro de "usar versiones estables y
actuales"):

- **Next.js 16** (no 15): es la versión estable actual. La convención
  `middleware` se renombró a `proxy` (`src/proxy.ts`).
- **npm** (no pnpm): `corepack` no pudo activarse en este equipo (permisos).
  Todo el flujo funciona con npm 11.
- **Prisma 7**: cliente generado en `src/generated/prisma/`, requiere driver
  adapter (`@prisma/adapter-pg`).
- **PostgreSQL local dedicado** en `.devdb/` en vez de Docker (no disponible) o
  `prisma dev` (inestable bajo carga concurrente).
- **Better Auth** con control de acceso por roles `owner` / `staff`.

## Accesos de clientes y personal

Los clientes se registran en `/cuenta/registro` e ingresan en `/cuenta/login`. El personal ingresa en `/admin/login`; el propietario gestiona accesos en `/admin/equipo`.

Ver [Cuentas: configuración, correos y pruebas](docs/CUENTAS.md). Recuperación y verificación requieren `RESEND_API_KEY` y un remitente autorizado; sin credenciales se muestran desactivadas, sin simular envíos.
