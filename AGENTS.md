<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TG LAB — guía para trabajar en este repositorio

E-commerce de TG LAB (impresión 3D, Chiloé, Chile). Plan completo:
`docs/ARQUITECTURA.md`. Estado por fases: `README.md`.

## Stack

- Next.js 16 (App Router, React 19) — **la convención `middleware` se llama `proxy`** (`src/proxy.ts`).
- TypeScript `strict` + `noUncheckedIndexedAccess`.
- Tailwind CSS v4 (tokens en `src/app/globals.css`; el color de marca se inyecta en runtime desde `Setting`).
- PostgreSQL + Prisma 7. Cliente generado en `src/generated/prisma/` (no editar, no versionar).
- Better Auth (`src/server/auth/`) — solo staff. Roles `owner` / `staff`.
- Vitest (unit) + Playwright (e2e).

## Reglas del proyecto

- **El servidor es la única fuente de verdad de precios.** Nunca confiar en montos del cliente. Todo dinero es `Int` CLP (sin decimales), con IVA incluido.
- **Nada de identidad visual ni textos hardcodeados**: van en `Setting` vía `src/config/settings-schema.ts` + `SettingsService`.
- **Lógica de negocio en `src/server/services/`**, no en componentes ni route handlers.
- **Proveedores externos detrás de interfaces** en `src/server/providers/` (pagos, storage, email, boleta).
- **Snapshots en pedidos**: editar/archivar productos nunca debe alterar pedidos históricos. Preferir archivar a borrar.
- **No implementar funcionalidad falsa.** Si falta una credencial externa, dejar la integración lista y desactivada (`isConfigured() === false`), documentar qué falta.
- **Validar toda entrada con Zod** (Server Actions, route handlers, formularios).
- Fechas: guardar en UTC, mostrar en `America/Santiago` (`src/lib/datetime.ts`).
- Textos de UI en español (es-CL).

## Comandos

```bash
npm run dev:db:start   # Postgres local (.devdb/, puerto 5433)
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + test + build — correr tras cada cambio importante
npm run db:migrate     # nueva migración
npm run admin:create   # crear usuario del panel
```

- Los scripts que importan código con `import "server-only"` corren con `tsx --conditions=react-server` (ya configurado en los scripts npm).
- Antes de una migración destructiva: detenerse y explicar las consecuencias.

## Convenciones de código

- Rutas de la tienda: grupo `src/app/(store)/`. Panel: `src/app/admin/(app)/` (con `requireStaff()`), login en `src/app/admin/login/`.
- Componentes UI base en `src/components/ui/` (estilo shadcn, escritos a mano). Íconos de marca en `src/components/icons/` (lucide dejó de incluirlos).
- Server Components por defecto; `"use client"` solo con interacción real.
- Importar el cliente Prisma desde `@/server/db` (nunca instanciar otro).
