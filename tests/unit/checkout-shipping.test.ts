import { describe, expect, it } from "vitest";

import { checkoutFormSchema } from "@/lib/schemas/checkout";

const base = {
  firstName: "Camila",
  lastName: "Soto",
  rut: "11.111.111-1",
  email: "camila@example.com",
  phone: "+56 9 1234 5678",
  fulfillmentMethod: "SHIPPING" as const,
  region: "Región de Los Lagos",
  comuna: "Castro",
  shippingRateId: "cm0tglablocalrate000000000",
  createAccount: false,
  acceptedTerms: true,
};

describe("modalidades de envío del checkout", () => {
  it("acepta entrega local únicamente con dirección", () => {
    const result = checkoutFormSchema.safeParse({
      ...base,
      shippingDeliveryType: "LOCAL_DELIVERY",
      street: "O'Higgins",
      number: "123",
    });

    expect(result.success).toBe(true);
  });

  it("exige dirección para entrega local", () => {
    const result = checkoutFormSchema.safeParse({
      ...base,
      shippingDeliveryType: "LOCAL_DELIVERY",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.street).toBeDefined();
      expect(result.error.flatten().fieldErrors.number).toBeDefined();
    }
  });

  it("acepta retiro en Punto Blue sin calle cuando identifica el punto", () => {
    const result = checkoutFormSchema.safeParse({
      ...base,
      shippingDeliveryType: "PICKUP_POINT",
      pickupPointName: "Punto Blue Castro Centro",
      pickupPointAddress: "San Martín 456, Castro",
    });

    expect(result.success).toBe(true);
  });

  it("exige nombre y dirección del Punto Blue", () => {
    const result = checkoutFormSchema.safeParse({
      ...base,
      shippingDeliveryType: "PICKUP_POINT",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.pickupPointName).toBeDefined();
      expect(
        result.error.flatten().fieldErrors.pickupPointAddress,
      ).toBeDefined();
    }
  });
});
