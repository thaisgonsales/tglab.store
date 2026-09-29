import { readdir } from "node:fs/promises";
import path from "node:path";

import { commerceSettingsSchema } from "../src/config/settings-schema";
import { db } from "../src/server/db";

type MigrationRow = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

async function main(): Promise<void> {
  const migrationDirs = (
    await readdir(path.join(process.cwd(), "prisma", "migrations"), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const [migrationRows, files, staff, shipping, products, orders, setting] =
    await Promise.all([
      db.$queryRaw<MigrationRow[]>`
        SELECT migration_name, finished_at, rolled_back_at
        FROM "_prisma_migrations"
      `,
      db.customRequestFile.findMany({
        select: { url: true, storageKey: true },
      }),
      db.user.findMany({
        where: { isActive: true },
        select: { role: true, twoFactorEnabled: true },
      }),
      Promise.all([
        db.shippingZone.count({ where: { isActive: true } }),
        db.shippingRate.count({ where: { isActive: true } }),
      ]),
      db.product.count({ where: { status: "PUBLISHED" } }),
      db.order.count(),
      db.setting.findUnique({ where: { key: "commerce" } }),
    ]);

  const applied = new Set(
    migrationRows
      .filter((row) => row.finished_at && !row.rolled_back_at)
      .map((row) => row.migration_name),
  );
  const pendingMigrations = migrationDirs.filter((name) => !applied.has(name));
  const legacyPublicFiles = files.filter(
    (file) =>
      !file.storageKey ||
      !file.url.startsWith("/api/admin/custom-request-files/"),
  ).length;
  const protectedFiles = files.length - legacyPublicFiles;
  const owners = staff.filter((user) => user.role === "owner");
  const staffWithout2fa = staff.filter(
    (user) => !user.twoFactorEnabled,
  ).length;
  const commerce = commerceSettingsSchema.parse(setting?.value ?? {});
  const bank = commerce.bankTransferDetails;
  const bankTransferComplete = [
    bank.accountHolder,
    bank.rut,
    bank.bank,
    bank.accountType,
    bank.accountNumber,
    bank.email,
  ].every((value) => value.trim().length > 0);

  console.log(
    JSON.stringify(
      {
        migrations: {
          expected: migrationDirs.length,
          applied: applied.size,
          pending: pendingMigrations,
        },
        customRequestFiles: {
          total: files.length,
          protected: protectedFiles,
          legacyOrPublic: legacyPublicFiles,
        },
        administrators: {
          active: staff.length,
          owners: owners.length,
          without2fa: staffWithout2fa,
        },
        catalog: { activeProducts: products },
        shipping: {
          activeZones: shipping[0],
          activeRates: shipping[1],
          pickupEnabled: commerce.pickupEnabled,
        },
        payments: { bankTransferDetailsComplete: bankTransferComplete },
        orders: { total: orders },
      },
      null,
      2,
    ),
  );

  if (pendingMigrations.length > 0 || legacyPublicFiles > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("No se pudo completar la auditoría de producción.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
