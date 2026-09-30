-- La entrega se realiza por Blue Express o mediante reparto local en
-- Castro/Chonchi; se deshabilita el retiro directo en TG LAB.
UPDATE "setting"
SET
  "value" = jsonb_set("value", '{pickupEnabled}', 'false'::jsonb, true),
  "updatedAt" = NOW()
WHERE "key" = 'commerce';
