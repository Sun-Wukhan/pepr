import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminUsername } from "./adminAccount.ts";
import AdminPage from "./AdminPage.tsx";
import { buildOrderRecord, parseCreateOrderInput } from "./orders.ts";

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

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("admin order page", () => {
  it("shows reference numbers returned by the admin endpoint", async () => {
    const parsed = parseCreateOrderInput(validOrder);
    if (!parsed.ok) throw new Error(parsed.error);
    const order = buildOrderRecord(
      parsed.value,
      new Date("2026-09-23T12:00:00Z"),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: "session-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ orders: [order] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);
    expect(screen.getByLabelText("Username")).toHaveValue(adminUsername);
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "current-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(order.referenceNumber)).toBeInTheDocument();
    expect(screen.getByText("Tesamorelin 10mg")).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: /researcher@example.ca/ }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.BASE_URL}api/admin/orders`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });

  it("shows an error when the admin password is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized." }),
      }),
    );

    render(<AdminPage />);
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("That username or password was not accepted."),
    ).toBeInTheDocument();
  });

  it("updates the password from the dashboard", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: "session-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ orders: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "current-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "next-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "next-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Password updated.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.BASE_URL}api/admin/password`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          currentPassword: "current-password",
          newPassword: "next-password",
        }),
      }),
    );
  });
});
