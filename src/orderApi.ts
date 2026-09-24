import {
  buildOrderRecord,
  parseCreateOrderInput,
  type OrderRecord,
} from "./orders.ts";

export interface OrderRepository {
  /** Returns stored orders with the newest request first. */
  listOrders(): Promise<OrderRecord[]>;
  /** Persists one validated order. */
  saveOrder(order: OrderRecord): Promise<void>;
}

export interface OrderApiRequest {
  method: string;
  pathname: string;
  authorization: string | null;
  contentType: string | null;
  body: unknown;
}

export interface OrderApiResult {
  status: number;
  body: unknown;
  allow?: string;
}

export type LoginResult =
  | { status: "ok"; token: string }
  | { status: "denied" }
  | { status: "unconfigured" };

export type PasswordChangeResult =
  { ok: true } | { ok: false; status: number; error: string };

export interface AdminAuth {
  /** True when an admin password has been configured. */
  configured(): Promise<boolean>;
  /** Opens a session when the username and password match. */
  login(username: string, password: string): Promise<LoginResult>;
  /** Checks an active admin session token. */
  hasSession(token: string | null): boolean;
  /** Replaces the stored password after the current password is confirmed. */
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<PasswordChangeResult>;
}

/** Strips the site base and query string from an order API path. */
export function normalizeOrderPath(urlPath: string, base = "/pepr"): string {
  const withoutQuery = urlPath.split("?")[0] ?? "/";
  const stripped =
    base && withoutQuery.startsWith(base)
      ? withoutQuery.slice(base.length) || "/"
      : withoutQuery;
  const withSlash = stripped.startsWith("/") ? stripped : `/${stripped}`;
  return withSlash.length > 1 && withSlash.endsWith("/")
    ? withSlash.slice(0, -1)
    : withSlash;
}

/** Handles order creation, admin login, password changes, and the order list. */
export async function handleOrderApi(
  request: OrderApiRequest,
  repository: OrderRepository,
  auth: AdminAuth,
): Promise<OrderApiResult | null> {
  if (request.pathname === "/api/orders") {
    return handleCreateOrder(request, repository);
  }
  if (request.pathname === "/api/admin/login") {
    return handleAdminLogin(request, auth);
  }
  if (request.pathname === "/api/admin/password") {
    return handleAdminPassword(request, auth);
  }
  if (request.pathname === "/api/admin/orders") {
    return handleAdminOrders(request, repository, auth);
  }
  return null;
}

/** Stores a checkout request and returns its reference number. */
async function handleCreateOrder(
  request: OrderApiRequest,
  repository: OrderRepository,
): Promise<OrderApiResult> {
  if (request.method !== "POST") {
    return {
      status: 405,
      allow: "POST",
      body: { error: "Method not allowed." },
    };
  }
  if (!isJsonContentType(request.contentType)) {
    return {
      status: 415,
      body: { error: "Submit the order as JSON." },
    };
  }

  const parsed = parseCreateOrderInput(request.body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };

  const order = buildOrderRecord(parsed.value);
  await repository.saveOrder(order);
  return { status: 201, body: { referenceNumber: order.referenceNumber } };
}

/** Opens an admin session from a username and password. */
async function handleAdminLogin(
  request: OrderApiRequest,
  auth: AdminAuth,
): Promise<OrderApiResult> {
  if (request.method !== "POST") {
    return {
      status: 405,
      allow: "POST",
      body: { error: "Method not allowed." },
    };
  }
  if (!isJsonContentType(request.contentType)) {
    return { status: 415, body: { error: "Submit the login as JSON." } };
  }

  const credentials = readLogin(request.body);
  if (!credentials) {
    return { status: 400, body: { error: "Enter a username and password." } };
  }

  const result = await auth.login(credentials.username, credentials.password);
  if (result.status === "unconfigured") {
    return {
      status: 503,
      body: { error: "Admin access is not configured." },
    };
  }
  if (result.status === "denied") {
    return { status: 401, body: { error: "Unauthorized." } };
  }
  return { status: 200, body: { token: result.token } };
}

/** Replaces the admin password for an active session. */
async function handleAdminPassword(
  request: OrderApiRequest,
  auth: AdminAuth,
): Promise<OrderApiResult> {
  if (request.method !== "POST") {
    return {
      status: 405,
      allow: "POST",
      body: { error: "Method not allowed." },
    };
  }
  if (!auth.hasSession(bearerToken(request.authorization))) {
    return { status: 401, body: { error: "Unauthorized." } };
  }
  if (!isJsonContentType(request.contentType)) {
    return { status: 415, body: { error: "Submit the password as JSON." } };
  }

  const passwords = readPasswordChange(request.body);
  if (!passwords) {
    return {
      status: 400,
      body: { error: "Enter the current password and a new password." },
    };
  }

  const result = await auth.changePassword(
    passwords.currentPassword,
    passwords.newPassword,
  );
  if (!result.ok)
    return { status: result.status, body: { error: result.error } };
  return { status: 200, body: { ok: true } };
}

/** Returns every stored order when the admin session is active. */
async function handleAdminOrders(
  request: OrderApiRequest,
  repository: OrderRepository,
  auth: AdminAuth,
): Promise<OrderApiResult> {
  if (request.method !== "GET") {
    return {
      status: 405,
      allow: "GET",
      body: { error: "Method not allowed." },
    };
  }

  if (!(await auth.configured())) {
    return {
      status: 503,
      body: { error: "Admin access is not configured." },
    };
  }

  const session = bearerToken(request.authorization);
  if (!session || !auth.hasSession(session)) {
    return { status: 401, body: { error: "Unauthorized." } };
  }

  const orders = await repository.listOrders();
  return { status: 200, body: { orders } };
}

/** Reads a login body without treating the password as display text. */
function readLogin(
  value: unknown,
): { username: string; password: string } | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.username !== "string" ||
    typeof value.password !== "string"
  ) {
    return null;
  }
  const username = value.username.trim();
  if (!username || username.length > 80 || value.password.length > 200)
    return null;
  return { username, password: value.password };
}

/** Reads the current and replacement passwords from a change request. */
function readPasswordChange(
  value: unknown,
): { currentPassword: string; newPassword: string } | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.currentPassword !== "string" ||
    typeof value.newPassword !== "string"
  ) {
    return null;
  }
  if (!value.currentPassword || value.currentPassword.length > 200) return null;
  if (!value.newPassword || value.newPassword.length > 200) return null;
  return {
    currentPassword: value.currentPassword,
    newPassword: value.newPassword,
  };
}

/** Narrows an unknown value to a string-keyed record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Accepts a JSON content type with optional parameters. */
function isJsonContentType(value: string | null): boolean {
  return (value ?? "").toLowerCase().startsWith("application/json");
}

/** Reads the credential from an Authorization header. */
function bearerToken(authorization: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/.exec(authorization ?? "");
  return match?.[1] ?? null;
}
