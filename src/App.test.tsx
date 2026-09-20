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

afterEach(cleanup);

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
});
