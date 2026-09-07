"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  rateInputSchema,
  zoneInputSchema,
  zoneLocationsSchema,
  type ZoneInput,
} from "@/lib/schemas/shipping";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";

function revalidate() {
  revalidatePath("/admin/despachos");
  revalidatePath("/checkout");
}

export async function createZone(input: ZoneInput) {
  return staffAction(async () => {
    const data = zoneInputSchema.parse(input);
    const max = await db.shippingZone.aggregate({ _max: { position: true } });
    const zone = await db.shippingZone.create({
      data: {
        name: data.name,
        isActive: data.isActive,
        position: (max._max.position ?? -1) + 1,
      },
    });
    revalidate();
    return { id: zone.id };
  });
}

export async function updateZone(id: string, input: ZoneInput) {
  return staffAction(async () => {
    const data = zoneInputSchema.parse(input);
    await db.shippingZone.update({
      where: { id },
      data: { name: data.name, isActive: data.isActive },
    });
    revalidate();
    return null;
  });
}

export async function deleteZone(id: string) {
  return staffAction(async () => {
    await db.shippingZone.delete({ where: { id } });
    revalidate();
    return null;
  });
}

export async function setZoneLocations(
  input: z.infer<typeof zoneLocationsSchema>,
) {
  return staffAction(async () => {
    const { zoneId, locations } = zoneLocationsSchema.parse(input);
    await db.$transaction(async (tx) => {
      await tx.shippingZoneLocation.deleteMany({ where: { zoneId } });
      if (locations.length > 0) {
        await tx.shippingZoneLocation.createMany({
          data: locations.map((l) => ({
            zoneId,
            region: l.region,
            comuna: l.comuna,
          })),
          skipDuplicates: true,
        });
      }
    });
    revalidate();
    return null;
  });
}

export async function saveRate(input: z.input<typeof rateInputSchema>) {
  return staffAction(async () => {
    const data = rateInputSchema.parse(input);
    if (
      data.minWeightGrams !== null &&
      data.maxWeightGrams !== null &&
      data.minWeightGrams > data.maxWeightGrams
    ) {
      throw new ActionError("El peso mínimo no puede ser mayor que el máximo.");
    }
    if (data.id) {
      await db.shippingRate.update({
        where: { id: data.id },
        data: {
          name: data.name,
          price: data.price,
          freeOverSubtotal: data.freeOverSubtotal,
          minWeightGrams: data.minWeightGrams,
          maxWeightGrams: data.maxWeightGrams,
          isActive: data.isActive,
        },
      });
    } else {
      const max = await db.shippingRate.aggregate({
        where: { zoneId: data.zoneId },
        _max: { position: true },
      });
      await db.shippingRate.create({
        data: {
          zoneId: data.zoneId,
          name: data.name,
          price: data.price,
          freeOverSubtotal: data.freeOverSubtotal,
          minWeightGrams: data.minWeightGrams,
          maxWeightGrams: data.maxWeightGrams,
          isActive: data.isActive,
          position: (max._max.position ?? -1) + 1,
        },
      });
    }
    revalidate();
    return null;
  });
}

export async function deleteRate(id: string) {
  return staffAction(async () => {
    await db.shippingRate.delete({ where: { id } });
    revalidate();
    return null;
  });
}
