import { describe, expect, it } from "vitest";
import {
  buildOrderRecord,
  parseCreateOrderInput,
  priceShipping,
  readOrderList,
} from "./orders.ts";

const validOrder = {
  email: "Researcher@Example.ca",
  items: [{ id: 1, name: "Tesamorelin<script>", dose: "10mg", price: 100 }],
  address: {
    fullName: "Ava Lang",
    organization: "North Lab",
    phone: "",
    street: "1 Research Road",
    unit: "",
    city: "Toronto",
    province: "Ontario",
    postalCode: "m5v2t6",
  },
  shippingId: "regular",
};

describe("order records", () => {
  it("sanitizes a checkout payload and prices complimentary shipping", () => {
    const parsed = parseCreateOrderInput(validOrder);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.email).toBe("researcher@example.ca");
    expect(parsed.value.items[0]?.name).toBe("Tesamorelinscript");
    expect(parsed.value.address.postalCode).toBe("M5V 2T6");
    expect(priceShipping(250, "regular").shippingPrice).toBe(0);

    const order = buildOrderRecord(
      parsed.value,
      new Date("2026-09-23T12:00:00Z"),
    );
    expect(order.referenceNumber).toMatch(/^PEPR-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(order.estimatedTotal).toBeCloseTo(123.9);
    expect(readOrderList({ orders: [order] })).toEqual([order]);
  });

  it("rejects an incomplete order", () => {
    const parsed = parseCreateOrderInput({
      ...validOrder,
      email: "not-an-email",
    });

    expect(parsed).toEqual({
      ok: false,
      error: "Enter a valid email address.",
    });
  });
});
