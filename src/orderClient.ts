import {
  readOrderList,
  type CreateOrderInput,
  type OrderRecord,
} from "./orders.ts";

/** Error raised when the admin order endpoint cannot return the queue. */
export class AdminRequestError extends Error {
  readonly status: number;

  /** Stores the HTTP status and a message that can be shown to an admin. */
  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
  }
}

/** Saves a checkout request and returns the reference number from the server. */
export async function createOrderRequest(
  input: CreateOrderInput,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(apiUrl("api/orders"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("The order endpoint could not be reached.");
  }

  if (!response.ok) {
    throw new Error("The order endpoint did not record the request.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The order endpoint returned an unreadable response.");
  }

  if (!isRecord(payload) || typeof payload.referenceNumber !== "string") {
    throw new Error("The order endpoint did not return a reference number.");
  }
  if (!/^PEPR-[A-Z0-9]+-[A-Z0-9]+$/.test(payload.referenceNumber)) {
    throw new Error("The order endpoint returned an invalid reference number.");
  }
  return payload.referenceNumber;
}

/** Signs in and returns the session token for later admin requests. */
export async function loginAdmin(
  username: string,
  password: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(apiUrl("api/admin/login"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new AdminRequestError(0, "The admin endpoint could not be reached.");
  }

  if (response.status === 401) {
    throw new AdminRequestError(
      401,
      "That username or password was not accepted.",
    );
  }
  if (response.status === 503) {
    throw new AdminRequestError(
      503,
      "Admin access is not configured on the server.",
    );
  }
  if (!response.ok) {
    throw new AdminRequestError(
      response.status,
      "The admin endpoint could not be reached.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AdminRequestError(
      response.status,
      "The admin endpoint returned an unreadable response.",
    );
  }
  if (
    !isRecord(payload) ||
    typeof payload.token !== "string" ||
    !payload.token
  ) {
    throw new AdminRequestError(
      response.status,
      "The admin endpoint returned an unexpected response.",
    );
  }
  return payload.token;
}

/** Replaces the admin password for the signed-in session. */
export async function changeAdminPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(apiUrl("api/admin/password"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new AdminRequestError(0, "The admin endpoint could not be reached.");
  }

  if (response.status === 401) {
    throw new AdminRequestError(401, "The current password was not accepted.");
  }
  if (!response.ok) {
    throw new AdminRequestError(
      response.status,
      await readErrorMessage(response, "The new password was not accepted."),
    );
  }
}

/** Loads the order queue from the admin endpoint. */
export async function fetchAdminOrders(token: string): Promise<OrderRecord[]> {
  let response: Response;
  try {
    response = await fetch(apiUrl("api/admin/orders"), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new AdminRequestError(0, "The admin endpoint could not be reached.");
  }

  if (response.status === 401) {
    throw new AdminRequestError(401, "Your session has ended. Sign in again.");
  }
  if (response.status === 503) {
    throw new AdminRequestError(
      503,
      "Admin access is not configured on the server.",
    );
  }
  if (!response.ok) {
    throw new AdminRequestError(
      response.status,
      "The admin endpoint could not be reached.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AdminRequestError(
      response.status,
      "The admin endpoint returned an unreadable response.",
    );
  }

  try {
    return readOrderList(payload);
  } catch {
    throw new AdminRequestError(
      response.status,
      "The admin endpoint returned an unexpected response.",
    );
  }
}

/** Reads a safe error message from a JSON response. */
async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      isRecord(payload) &&
      typeof payload.error === "string" &&
      payload.error
    ) {
      return payload.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

/** Builds an API path that respects the Vite base URL. */
function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${path}`.replace(/([^:])\/{2,}/g, "$1/");
}

/** Narrows an unknown JSON value to a string-keyed record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
