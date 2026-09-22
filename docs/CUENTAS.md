# Cuentas de clientes y administración

## Accesos

- `/cuenta/login`: acceso de clientes; también está en el encabezado de la tienda.
- `/cuenta/registro`: registro público con contraseña confirmada.
- `/cuenta`: datos personales y estado de verificación del correo.
- `/cuenta/direcciones`: crear, editar y eliminar direcciones, con una principal.
- `/cuenta/pedidos`: historial paginado y detalle privado de cada compra.
- `/cuenta/seguridad`: cambio de contraseña y cierre de sesiones.
- `/admin/login`: acceso exclusivo de personal. Incluye código TOTP o código de recuperación si la cuenta activó 2FA.
- `/admin/seguridad`: contraseña, sesiones y activación/desactivación de 2FA.
- `/admin/equipo`: el propietario crea accesos `staff`/`owner` y suspende accesos. No puede suspenderse a sí mismo ni dejar la tienda sin propietario activo.
- `/admin/clientes`: cuentas registradas, verificación, cantidad de compras y suspensión por el propietario.

El primer administrador se crea con `npm run admin:create`. No hay una contraseña predeterminada. Los accesos de personal nuevos deben recibir su contraseña por un canal privado y cambiarla desde Seguridad.

## Separación y privacidad

Better Auth usa dos instancias, rutas y prefijos de cookies distintos:

| Uso | API | Cookie | Modelos |
| --- | --- | --- | --- |
| Personal | `/api/auth` | `tglab_admin` | `User`, `Session`, `Account`, `Verification`, `TwoFactor` |
| Clientes | `/api/customer-auth` | `tglab_customer` | `CustomerUser`, `CustomerSession`, `CustomerAccount`, `CustomerVerification` |

El registro público nunca crea personal. Todas las páginas privadas y acciones comprueban la sesión en servidor. El panel también comprueba rol, suspensión y estado activo. Las cookies no almacenan una copia cacheada de la autorización; suspender una cuenta elimina sus sesiones.

Los pedidos nuevos toman `accountId` de la sesión del servidor. Nunca del formulario ni solo de una coincidencia de correo. `Customer` sigue siendo la ficha de contacto del checkout; no es una identidad autenticada. Editar el perfil o una dirección no modifica snapshots de pedidos.

Las compras antiguas como invitado se asocian con una acción explícita y correo verificado. Solo se actualizan pedidos sin cuenta; nunca se transfieren pedidos de otra identidad. Los datos internos, payloads de pago y notas de personal no se incluyen en el detalle del cliente.

La página de pago y sus acciones requieren la cuenta propietaria o, para invitados, una cookie HttpOnly firmada del navegador que creó el pedido. El seguimiento público existente con número + correo continúa disponible. Las compras como invitado anteriores a este cambio pueden consultarse por seguimiento; para verlas en Mi cuenta se debe verificar el correo y asociarlas.

## Correos de acceso

Recuperación: `/cuenta/recuperar` y `/admin/recuperar`. El enlace abre `/cuenta/restablecer` o `/admin/restablecer`. Better Auth genera tokens con vencimiento y de un solo uso; al cambiar la contraseña mediante recuperación se revocan las sesiones existentes.

Configurar en el entorno del servidor:

```dotenv
RESEND_API_KEY=...
EMAIL_FROM=Nombre de la tienda <cuentas@tu-dominio-verificado.cl>
BETTER_AUTH_URL=https://tu-dominio.cl
NEXT_PUBLIC_SITE_URL=https://tu-dominio.cl
```

El remitente debe estar autorizado en Resend. Reiniciar/reconstruir el servidor después de configurar las variables. No se incluyen claves ni tokens en el repositorio.

Sin `RESEND_API_KEY`, `isAuthEmailConfigured()` devuelve `false`: recuperación y envío de verificación quedan desactivados con un aviso visible. **No se simula el envío ni se imprimen enlaces de acceso en consola.** El registro y las compras nuevas con cuenta siguen funcionando, pero no se vinculan compras antiguas hasta verificar el correo. Un fallo de entrega nunca se presenta como envío exitoso.

Los textos de las pantallas y correos se guardan en `Setting`, grupo `account`, con defaults en `src/config/account-settings.ts`, incorporado a `settings-schema.ts`. La marca se obtiene de `Setting.brand`.

## Migración y pruebas

La migración `20260908182244_customer_accounts` agrega las tablas de identidad de clientes, rate limiting y referencias opcionales de pedidos/direcciones. No elimina tablas, cuentas ni pedidos existentes.

```bash
npm run db:migrate:deploy
npm run db:generate
npm run check
npm run test:integration
npx playwright test tests/e2e/accounts.spec.ts --workers=1
```

Reiniciar `next dev` si tenía en memoria el cliente Prisma anterior. Los intentos de autenticación se limitan mediante PostgreSQL, también con varios procesos del servidor. En producción, el proxy de confianza debe sobrescribir las cabeceras de IP de los clientes.

Las pruebas de integración usan correos capturados en memoria, sin envíos reales. Las pruebas de navegador usan un servidor de prueba en el puerto 3100 sin proveedor de correo, datos propios identificados por UUID y limpieza al terminar. Cubren clientes y administración en escritorio y móvil.

Referencias usadas para las APIs: [Better Auth: correo y contraseña](https://www.better-auth.com/docs/authentication/email-password), [Better Auth: segundo factor](https://www.better-auth.com/docs/plugins/2fa). Para Next.js se consultaron las guías de autenticación de la versión instalada en `node_modules/next/dist/docs/`.
