import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import {
  handleOrderApi,
  normalizeOrderPath,
  type AdminAuth,
  type OrderRepository,
} from "../src/orderApi.ts";
import { createFileAdminAuth } from "./adminAuth.ts";
import { createFileOrderRepository } from "./fileOrderRepository.ts";

const orderApiPaths = new Set([
  "/api/orders",
  "/api/admin/login",
  "/api/admin/orders",
  "/api/admin/password",
]);

interface AdminOrdersPluginOptions {
  username: string;
  initialPassword: string;
  credentialsFile: string;
  ordersFile: string;
}

/** Serves the order and admin order endpoints from the Vite dev and preview servers. */
export function adminOrdersPlugin(options: AdminOrdersPluginOptions): Plugin {
  const repository = createFileOrderRepository(options.ordersFile);
  const auth = createFileAdminAuth({
    credentialsFile: options.credentialsFile,
    username: options.username,
    initialPassword: options.initialPassword,
  });

  /** Attaches the order routes ahead of Vite's static file handling. */
  const attach = (middlewares: Connect.Server, base: string): void => {
    middlewares.use((request, response, next) => {
      void routeOrderRequest(request, response, next, repository, auth, base);
    });
  };

  return {
    name: "pepr-admin-orders",
    configureServer(server) {
      attach(server.middlewares, server.config.base);
    },
    configurePreviewServer(server) {
      attach(server.middlewares, server.config.base);
    },
  };
}

/** Routes one HTTP request to the order API when the path matches. */
export async function routeOrderRequest(
  request: IncomingMessage,
  response: ServerResponse,
  next: Connect.NextFunction,
  repository: OrderRepository,
  auth: AdminAuth,
  base: string,
): Promise<void> {
  const pathname = normalizeOrderPath(
    request.url ?? "/",
    base.replace(/\/$/, ""),
  );
  if (!orderApiPaths.has(pathname)) {
    next();
    return;
  }

  try {
    const method = request.method ?? "GET";
    let body: unknown;
    if (method === "POST") {
      const raw = await readBody(request);
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        sendJson(response, 400, { error: "Invalid JSON." });
        return;
      }
    }

    const result = await handleOrderApi(
      {
        method,
        pathname,
        authorization: headerValue(request.headers.authorization),
        contentType: headerValue(request.headers["content-type"]),
        body,
      },
      repository,
      auth,
    );
    if (!result) {
      next();
      return;
    }
    if (result.allow) response.setHeader("Allow", result.allow);
    sendJson(response, result.status, result.body);
  } catch (error) {
    const tooLarge =
      error instanceof Error && error.message.includes("too large");
    sendJson(response, tooLarge ? 413 : 400, {
      error: tooLarge ? "Request body is too large." : "Invalid request.",
    });
  }
}

/** Writes a JSON response that should not be cached. */
function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

/** Collects a request body up to a small limit. */
function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 20_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

/** Returns the first value of a Node request header. */
function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
