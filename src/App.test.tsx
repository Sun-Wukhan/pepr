import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("PEPR storefront", () => {
  it("renders the complete product catalog", () => {
    render(<App />);

    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(
      screen.getByRole("heading", { name: "Tesamorelin" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "KLOW" })).toBeInTheDocument();
  });

  it("filters the catalog by product category", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Blends" }));

    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "GLOW" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Tesamorelin" }),
    ).not.toBeInTheDocument();
  });

  it("adds a selected product to the shopping bag", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add Tesamorelin 10mg to cart" }),
    );

    const cart = screen.getByLabelText("Shopping bag");
    expect(cart).toHaveAttribute("aria-hidden", "false");
    expect(within(cart).getByText("Subtotal")).toBeInTheDocument();
    expect(within(cart).getAllByText("$100")).toHaveLength(2);
  });

  it("starts a verified research request checkout", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add Tesamorelin 10mg to cart" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to checkout" }),
    );

    const checkout = screen.getByRole("dialog");
    expect(checkout).toBeInTheDocument();
    fireEvent.change(within(checkout).getByLabelText("Email address"), {
      target: { value: "RESEARCHER@EXAMPLE.CA" },
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

    expect(
      screen.getByRole("heading", { name: "Shipping address" }),
    ).toBeInTheDocument();
  });

  it("exposes the mobile navigation state to assistive technology", () => {
    render(<App />);

    const menuButton = screen.getByRole("button", {
      name: "Toggle navigation",
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(menuButton).toHaveAttribute("aria-controls", "primary-navigation");
  });

  it("opens the admin order queue", () => {
    window.history.replaceState({}, "", "/?page=admin");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Order requests" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders research-only application guidance for every product group", () => {
    window.history.replaceState({}, "", "/?page=guide");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Understanding application" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(11);
    expect(
      screen.getByText("Do not inject, ingest, inhale, or apply", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "GHK-Cu 100mg" }),
    ).toBeInTheDocument();
  });
});
