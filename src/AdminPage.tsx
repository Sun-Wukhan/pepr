import { useEffect, useState, type FormEvent } from "react";
import { adminUsername } from "./adminAccount.ts";
import {
  changeAdminPassword,
  fetchAdminOrders,
  loginAdmin,
} from "./orderClient.ts";
import { formatCurrency, type OrderRecord } from "./orders.ts";
import ThemeToggle from "./ThemeToggle.tsx";

const adminSessionKey = "pepr.adminSession";

type LoadState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "ready"; orders: OrderRecord[] }
  | { status: "error"; message: string };

/** Reads the admin session saved for this browser tab. */
function readSavedSession(): string {
  return sessionStorage.getItem(adminSessionKey) ?? "";
}

/** Shows stored checkout requests and lets the admin replace the password. */
export default function AdminPage() {
  const [username, setUsername] = useState(adminUsername);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(readSavedSession);
  const [requestId, setRequestId] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>(() =>
    readSavedSession() ? { status: "loading" } : { status: "signed-out" },
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAdminOrders(token).then(
      (orders) => {
        if (!cancelled) setLoadState({ status: "ready", orders });
      },
      (error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "The admin endpoint could not be reached.";
        setLoadState({ status: "error", message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requestId, token]);

  /** Signs in with the admin username and password, then loads the queue. */
  const submitLogin = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setLoadState({ status: "loading" });
    try {
      const session = await loginAdmin(username.trim(), password);
      sessionStorage.setItem(adminSessionKey, session);
      setPassword("");
      setToken(session);
      setRequestId((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The admin endpoint could not be reached.";
      setLoadState({ status: "error", message });
    }
  };

  /** Forgets the admin session and returns to the sign-in form. */
  const signOut = (): void => {
    sessionStorage.removeItem(adminSessionKey);
    setToken("");
    setPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordError("");
    setLoadState({ status: "signed-out" });
  };

  /** Reloads the queue with the session already stored for this tab. */
  const refresh = (): void => {
    if (!token) {
      setLoadState({ status: "signed-out" });
      return;
    }
    setLoadState({ status: "loading" });
    setRequestId((current) => current + 1);
  };

  /** Replaces the admin password after confirming the current one. */
  const submitPasswordChange = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setPasswordError("");
    try {
      await changeAdminPassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The new password was not accepted.";
      setPasswordError(message);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a className="logo" href=".">
          PEPR<span>.</span>
        </a>
        <span className="admin-header-actions">
          <ThemeToggle />
          <a href=".">Storefront</a>
        </span>
      </header>
      <main className="admin-main">
        <p className="eyebrow">Admin</p>
        <h1>Order requests</h1>
        <p className="admin-lede">
          Each checkout request is listed with the reference number the customer
          was given.
        </p>

        {loadState.status === "signed-out" && (
          <form className="admin-form" onSubmit={submitLogin}>
            <label htmlFor="admin-username">
              Username
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label htmlFor="admin-password">
              Password
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" type="submit">
              Sign in
            </button>
          </form>
        )}

        {loadState.status === "loading" && <p>Loading order requests…</p>}

        {loadState.status === "error" && (
          <div className="admin-error" role="alert">
            <p>{loadState.message}</p>
            <button className="admin-secondary" type="button" onClick={signOut}>
              Sign in again
            </button>
          </div>
        )}

        {loadState.status === "ready" && (
          <>
            <div className="admin-toolbar">
              <p>
                Signed in as {adminUsername}.{" "}
                {requestCountLabel(loadState.orders.length)}
              </p>
              <button
                className="admin-secondary"
                type="button"
                onClick={refresh}
              >
                Refresh
              </button>
              <button
                className="admin-secondary"
                type="button"
                onClick={signOut}
              >
                Sign out
              </button>
            </div>
            <div className="admin-table-wrap">
              {loadState.orders.length === 0 ? (
                <p className="admin-empty">No order requests yet.</p>
              ) : (
                <table className="admin-table">
                  <caption className="sr-only">
                    Order requests and reference numbers
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Created</th>
                      <th scope="col">Contact</th>
                      <th scope="col">Items</th>
                      <th scope="col">Delivery</th>
                      <th scope="col">Estimated total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadState.orders.map((order) => (
                      <tr key={order.referenceNumber}>
                        <td className="admin-reference">
                          {order.referenceNumber}
                        </td>
                        <td>{formatTimestamp(order.createdAt)}</td>
                        <td>
                          {order.email}
                          <br />
                          {order.address.fullName}
                          <br />
                          {order.address.city}, {order.address.province}
                        </td>
                        <td>{formatItems(order.items)}</td>
                        <td>
                          {order.shippingName}
                          <br />
                          {order.status}
                        </td>
                        <td>{formatCurrency(order.estimatedTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <section className="admin-password-panel">
              <h2>Change password</h2>
              <p>This updates the password for {adminUsername}.</p>
              <form
                className="admin-form-stack"
                onSubmit={submitPasswordChange}
              >
                <label htmlFor="current-password">
                  Current password
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </label>
                <label htmlFor="new-password">
                  New password
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                <label htmlFor="confirm-password">
                  Confirm new password
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                {passwordError && (
                  <p className="admin-error" role="alert">
                    {passwordError}
                  </p>
                )}
                {passwordMessage && (
                  <p className="admin-success" role="status">
                    {passwordMessage}
                  </p>
                )}
                <button className="primary-button" type="submit">
                  Update password
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/** Describes how many requests are in the queue. */
function requestCountLabel(count: number): string {
  return count === 1 ? "1 request" : `${count} requests`;
}

/** Joins line items into a single readable cell. */
function formatItems(items: OrderRecord["items"]): string {
  return items.map((item) => `${item.name} ${item.dose}`).join(", ");
}

/** Formats an ISO timestamp for the order table. */
function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
