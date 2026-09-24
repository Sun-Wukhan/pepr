import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CheckoutFlow from "./CheckoutFlow.tsx";

const item = { id: 1, name: "Tesamorelin", dose: "10mg", price: 100 };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Walks the checkout form up to the review step. */
function reachReview(): void {
  render(<CheckoutFlow items={[item]} onClose={() => undefined} />);
  const checkout = screen.getByRole("dialog");
  fireEvent.change(within(checkout).getByLabelText("Email address"), {
    target: { value: "researcher@example.ca" },
  });
  fireEvent.click(
    within(checkout).getByRole("checkbox", {
      name: /qualified research purposes/i,
    }),
  );
  fireEvent.click(
    within(checkout).getByRole("button", {
      name: "Continue to shipping address",
    }),
  );
  fireEvent.change(within(checkout).getByLabelText("Full name"), {
    target: { value: "Ava Lang" },
  });
  fireEvent.change(within(checkout).getByLabelText("Organization"), {
    target: { value: "North Lab" },
  });
  fireEvent.change(within(checkout).getByLabelText("Street address"), {
    target: { value: "1 Research Road" },
  });
  fireEvent.change(within(checkout).getByLabelText("City"), {
    target: { value: "Toronto" },
  });
  fireEvent.change(within(checkout).getByLabelText("Postal code"), {
    target: { value: "M5V 2T6" },
  });
  fireEvent.click(
    within(checkout).getByRole("button", { name: "View delivery options" }),
  );
  fireEvent.click(
    within(checkout).getByRole("button", { name: "Review request" }),
  );
  fireEvent.click(
    within(checkout).getByRole("checkbox", {
      name: /pending request/i,
    }),
  );
}

describe("checkout order recording", () => {
  it("shows the reference number returned by the order endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ referenceNumber: "PEPR-TEST01-AB12" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    reachReview();

    fireEvent.click(
      screen.getByRole("button", { name: "Create order request" }),
    );

    expect(await screen.findByText("PEPR-TEST01-AB12")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.BASE_URL}api/orders`,
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));
    expect(body.email).toBe("researcher@example.ca");
    expect(body.items).toEqual([item]);
  });

  it("keeps a local reference when the order endpoint is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    reachReview();

    fireEvent.click(
      screen.getByRole("button", { name: "Create order request" }),
    );

    expect(await screen.findByText(/^PEPR-/)).toBeInTheDocument();
    expect(
      screen.getByText(/will not appear on the admin page/i),
    ).toBeInTheDocument();
  });
});
