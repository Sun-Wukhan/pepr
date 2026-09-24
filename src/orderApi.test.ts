import { describe, expect, it } from "vitest";
import {
  handleOrderApi,
  normalizeOrderPath,
  type AdminAuth,
  type LoginResult,
  type OrderRepository,
  type PasswordChangeResult,
} from "./orderApi.ts";
import {
  buildOrderRecord,
  parseCreateOrderInput,
  type OrderRecord,
} from "./orders.ts";

const validOrder = {
  email: "researcher@example.ca",
  items: [{ id: 1, name: "Tesamorelin", dose: "10mg", price: 100 }],
  address: {
    fullName: "Ava Lang",
    organization: "North Lab",
    phone: "",
    street: "1 Research Road",
    unit: "",
    city: "Toronto",
    province: "Ontario",
    postalCode: "M5V 2T6",
  },
  shippingId: "expedited",
};

/** Accepts one username and password, and remembers sessions opened by login. */
function memoryAuth(configured = true): AdminAuth {
  const sessions = new Set<string>();
  let password = "current-password";
  return {
    async configured(): Promise<boolean> {
      return configured;
    },
    async login(
      username: string,
      passwordAttempt: string,
    ): Promise<LoginResult> {
      if (!configured) return { status: "unconfigured" };
      if (username !== "Vijay-The-Best" || passwordAttempt !== password) {
        return { status: "denied" };
      }
      sessions.add("session-token");
      return { status: "ok", token: "session-token" };
    },
    hasSession(token: string | null): boolean {
      return token !== null && sessions.has(token);
    },
    async changePassword(
      currentPassword: string,
      newPassword: string,
    ): Promise<PasswordChangeResult> {
      if (currentPassword !== password) {
        return {
          ok: false,
          status: 401,
          error: "The current password was not accepted.",
        };
      }
      if (newPassword.length < 8) {
        return { ok: false, status: 400, error: "Use at least 8 characters." };
      }
      password = newPassword;
      return { ok: true };
    },
  };
}

/** Stores orders in memory with the newest request returned first. */
function memoryRepository(): OrderRepository & { saved: OrderRecord[] } {
  const saved: OrderRecord[] = [];
  return {
    saved,
    async listOrders(): Promise<OrderRecord[]> {
      return saved.slice().reverse();
    },
    async saveOrder(order: OrderRecord): Promise<void> {
      saved.push(order);
    },
  };
}

describe("order API", () => {
  it("normalizes dev-server paths that include the site base", () => {
    expect(normalizeOrderPath("/pepr/api/admin/orders?x=1", "/pepr")).toBe(
      "/api/admin/orders",
    );
  });

  it("stores an order and lists it only for an admin session", async () => {
    const repository = memoryRepository();
    const auth = memoryAuth();
    const created = await handleOrderApi(
      {
        method: "POST",
        pathname: "/api/orders",
        authorization: null,
        contentType: "application/json",
        body: validOrder,
      },
      repository,
      auth,
    );

    if (!created) throw new Error("Order was not created.");
    expect(created.status).toBe(201);
    const referenceNumber = (created.body as { referenceNumber: string })
      .referenceNumber;
    expect(referenceNumber).toMatch(/^PEPR-/);

    const signedIn = await handleOrderApi(
      {
        method: "POST",
        pathname: "/api/admin/login",
        authorization: null,
        contentType: "application/json",
        body: { username: "Vijay-The-Best", password: "current-password" },
      },
      repository,
      auth,
    );
    expect(signedIn).toMatchObject({
      status: 200,
      body: { token: "session-token" },
    });

    const denied = await handleOrderApi(
      {
        method: "GET",
        pathname: "/api/admin/orders",
        authorization: "Bearer wrong-token",
        contentType: null,
        body: undefined,
      },
      repository,
      auth,
    );
    expect(denied).toMatchObject({ status: 401 });

    const listed = await handleOrderApi(
      {
        method: "GET",
        pathname: "/api/admin/orders",
        authorization: "Bearer session-token",
        contentType: null,
        body: undefined,
      },
      repository,
      auth,
    );
    expect(listed?.status).toBe(200);
    expect(listed?.body).toMatchObject({
      orders: [{ referenceNumber }],
    });
  });

  it("refuses the admin queue when no password is configured", async () => {
    const parsed = parseCreateOrderInput(validOrder);
    if (!parsed.ok) throw new Error(parsed.error);
    const repository = memoryRepository();
    await repository.saveOrder(buildOrderRecord(parsed.value));

    const result = await handleOrderApi(
      {
        method: "GET",
        pathname: "/api/admin/orders",
        authorization: "Bearer anything",
        contentType: null,
        body: undefined,
      },
      repository,
      memoryAuth(false),
    );

    expect(result).toMatchObject({ status: 503 });
  });
});
