import { mkdtemp, rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminUsername } from "../src/adminAccount.ts";
import { createFileAdminAuth } from "./adminAuth.ts";
import { routeOrderRequest } from "./adminOrdersPlugin.ts";
import { createFileOrderRepository } from "./fileOrderRepository.ts";

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

let directory = "";

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

/** Builds a minimal request stream for the order route. */
function createRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  rawBody = "",
): IncomingMessage {
  const stream = Readable.from(rawBody ? [Buffer.from(rawBody)] : []);
  return Object.assign(stream, { method, url, headers }) as IncomingMessage;
}

/** Captures the JSON status and payload written by the route. */
function createResponse(): ServerResponse & { payload: string } {
  const response = {
    statusCode: 200,
    payload: "",
    setHeader() {
      return response;
    },
    end(chunk?: string) {
      response.payload = chunk ?? "";
      return response;
    },
  };
  return response as unknown as ServerResponse & { payload: string };
}

describe("admin orders endpoint", () => {
  it("records an order and returns it with its reference number", async () => {
    directory = await mkdtemp(resolve(tmpdir(), "pepr-orders-"));
    const repository = createFileOrderRepository(
      resolve(directory, "orders.json"),
    );
    const auth = createFileAdminAuth({
      credentialsFile: resolve(directory, "admin.json"),
      username: adminUsername,
      initialPassword: "test-password-1",
    });
    const created = createResponse();
    await routeOrderRequest(
      createRequest(
        "POST",
        "/pepr/api/orders",
        { "content-type": "application/json" },
        JSON.stringify(validOrder),
      ),
      created,
      vi.fn(),
      repository,
      auth,
      "/pepr/",
    );

    const createdBody = JSON.parse(created.payload) as {
      referenceNumber: string;
    };
    expect(created.statusCode).toBe(201);
    expect(createdBody.referenceNumber).toMatch(/^PEPR-/);

    const signedIn = createResponse();
    await routeOrderRequest(
      createRequest(
        "POST",
        "/pepr/api/admin/login",
        { "content-type": "application/json" },
        JSON.stringify({
          username: adminUsername,
          password: "test-password-1",
        }),
      ),
      signedIn,
      vi.fn(),
      repository,
      auth,
      "/pepr/",
    );
    const session = JSON.parse(signedIn.payload) as { token: string };
    expect(signedIn.statusCode).toBe(200);

    const listed = createResponse();
    await routeOrderRequest(
      createRequest("GET", "/pepr/api/admin/orders", {
        authorization: `Bearer ${session.token}`,
      }),
      listed,
      vi.fn(),
      repository,
      auth,
      "/pepr/",
    );

    expect(listed.statusCode).toBe(200);
    expect(JSON.parse(listed.payload)).toMatchObject({
      orders: [
        {
          referenceNumber: createdBody.referenceNumber,
          email: validOrder.email,
        },
      ],
    });
  });

  it("leaves unrelated requests to the next middleware", async () => {
    const next = vi.fn();
    const response = createResponse();
    await routeOrderRequest(
      createRequest("GET", "/pepr/", {}),
      response,
      next,
      createFileOrderRepository("/tmp/unused-pepr-orders.json"),
      createFileAdminAuth({
        credentialsFile: "/tmp/unused-pepr-admin.json",
        username: adminUsername,
        initialPassword: "test-password-1",
      }),
      "/pepr/",
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
