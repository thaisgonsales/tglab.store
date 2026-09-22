# Despliegue de TG LAB

La aplicación requiere un servidor Node.js compatible con Next.js 16. No puede
publicarse como sitio estático porque utiliza autenticación, Server Actions,
webhooks, pagos y PostgreSQL.

## Infraestructura elegida

- Aplicación: Railway Hobby.
- Base de datos: PostgreSQL dentro del mismo proyecto Railway.
- Archivos: Cloudflare R2 mediante su API compatible con S3.
- Dominio: dominio propio con HTTPS.

El almacenamiento local sirve únicamente para desarrollo. En producción debe
configurarse `STORAGE_DRIVER=s3` porque el disco de una instancia puede ser
efímero.

## Crear el proyecto en Railway

1. Crear un proyecto vacío en Railway y conectar el repositorio de GitHub.
2. Añadir PostgreSQL desde `New > Database > PostgreSQL`.
3. En el servicio Next.js crear `DATABASE_URL` con la referencia
   `${{Postgres.DATABASE_URL}}`; el nombre `Postgres` debe coincidir con el del
   servicio de base de datos.
4. Generar primero el dominio temporal de Railway y usarlo, con `https://`, en
   `NEXT_PUBLIC_SITE_URL` y `BETTER_AUTH_URL`.
5. Copiar al servicio las demás variables descritas en `.env.example`.

El archivo `railway.json` configura automáticamente:

- inicio de Next.js en el puerto entregado por Railway;
- `prisma migrate deploy` antes de publicar cada versión;
- comprobación de `/api/health` durante un máximo de cinco minutos;
- reinicio del servicio hasta cinco veces si el proceso falla.

No se debe ejecutar `db:seed` automáticamente en producción porque contiene
productos y datos de demostración.

## Configurar Cloudflare R2

1. Crear un bucket de clase Standard.
2. Crear credenciales S3 limitadas a ese bucket.
3. Conectar un dominio público al bucket; `r2.dev` es solo para pruebas.
4. Configurar `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` y `S3_PUBLIC_URL` en Railway.
5. No copiar estas credenciales al repositorio ni usar una clave global de la
   cuenta de Cloudflare.

## Antes del primer despliegue

1. Generar un `BETTER_AUTH_SECRET` aleatorio de al menos 32 caracteres.
2. Ejecutar localmente `npm run deploy:check` cargando las mismas variables que
   tendrá Railway.
3. Desplegar y comprobar `GET /api/health`.
4. Crear al propietario con `npm run admin:create` usando `railway run` o una
   terminal autorizada con acceso a la base de datos.
5. Probar la subida de una imagen y confirmar que persiste después de un nuevo
   despliegue.

## Backups de PostgreSQL

En el servicio PostgreSQL, abrir `Backups` y activar como mínimo el snapshot
diario. Antes de vender, realizar una restauración de prueba: un backup que
nunca se ha restaurado todavía no demuestra que pueda recuperarse.

## Verificación

`/api/health` responde `200 {"status":"ok"}` cuando la aplicación puede acceder
a PostgreSQL. Responde 503 sin exponer detalles internos cuando la base de datos
no está disponible.

Antes de abrir ventas también deben probarse pagos, webhooks, correos y una
restauración real del backup de la base de datos.
