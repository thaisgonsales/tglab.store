-- CreateEnum
CREATE TYPE "ShippingDeliveryType" AS ENUM ('HOME', 'PICKUP_POINT', 'LOCAL_DELIVERY');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "pickupPointAddress" TEXT,
ADD COLUMN     "pickupPointName" TEXT,
ADD COLUMN     "shippingDeliveryType" "ShippingDeliveryType";

-- AlterTable
ALTER TABLE "shipping_rate" ADD COLUMN     "deliveryType" "ShippingDeliveryType" NOT NULL DEFAULT 'HOME';

-- Entrega personal de TG LAB disponible únicamente en Castro y Chonchi.
INSERT INTO "shipping_zone" ("id", "name", "isActive", "position", "createdAt", "updatedAt")
VALUES ('cm0tglablocalzone000000000', 'Entrega local Chiloé', true, 0, NOW(), NOW());

INSERT INTO "shipping_zone_location" ("id", "zoneId", "region", "comuna")
VALUES
  ('cm0tglabcastrolocation0000', 'cm0tglablocalzone000000000', 'Región de Los Lagos', 'Castro'),
  ('cm0tglabchonchilocation000', 'cm0tglablocalzone000000000', 'Región de Los Lagos', 'Chonchi');

INSERT INTO "shipping_rate" (
  "id", "zoneId", "name", "deliveryType", "price", "isActive", "position"
)
VALUES (
  'cm0tglablocalrate000000000',
  'cm0tglablocalzone000000000',
  'Entrega personal TG LAB',
  'LOCAL_DELIVERY',
  2000,
  true,
  0
);
