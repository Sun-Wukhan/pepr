import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  FlaskConical,
  Mail,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import ThemeToggle from "./ThemeToggle.tsx";
import type { FormEvent } from "react";
import { createOrderRequest } from "./orderClient.ts";
import {
  createRequestNumber,
  formatCurrency,
  priceShipping,
  provinces,
  sanitizeInput,
  shippingOptions,
  type OrderItem,
} from "./orders.ts";

export type CheckoutItem = OrderItem;

interface CheckoutFlowProps {
  items: CheckoutItem[];
  onClose: () => void;
}

interface Address {
  fullName: string;
  organization: string;
  phone: string;
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
}

type CheckoutStep =
  "contact" | "address" | "shipping" | "review" | "confirmation";

/** Renders the research-order request and shipping workflow. */
export default function CheckoutFlow({ items, onClose }: CheckoutFlowProps) {
  const [step, setStep] = useState<CheckoutStep>("contact");
  const [email, setEmail] = useState("");
  const [researchConfirmed, setResearchConfirmed] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [shippingId, setShippingId] = useState("expedited");
  const [requestNumber, setRequestNumber] = useState("");
  const [recorded, setRecorded] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState<Address>({
    fullName: "",
    organization: "",
    phone: "",
    street: "",
    unit: "",
    city: "",
    province: "Ontario",
    postalCode: "",
  });

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items],
  );
  const priced = priceShipping(subtotal, shippingId);

  /** Updates one sanitized shipping-address field. */
  const updateAddress = (field: keyof Address, value: string): void => {
    setAddress((current) => ({
      ...current,
      [field]: sanitizeInput(value),
    }));
  };

  /** Advances from the contact verification step. */
  const submitContact = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setEmail(sanitizeInput(email, 160).trim().toLowerCase());
    setStep("address");
  };

  /** Validates and advances from the Canadian address step. */
  const submitAddress = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedPostalCode = address.postalCode
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    setAddress((current) => ({
      ...current,
      postalCode: normalizedPostalCode,
    }));
    setStep("shipping");
  };

  /** Finalizes the delivery selection for review. */
  const submitShipping = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setStep("review");
  };

  /** Saves the checkout request and shows the reference number returned for it. */
  const submitRequest = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const referenceNumber = await createOrderRequest({
        email: sanitizeInput(email, 160).trim().toLowerCase(),
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          dose: item.dose,
          price: item.price,
        })),
        address,
        shippingId,
      });
      setRequestNumber(referenceNumber);
      setRecorded(true);
    } catch {
      setRequestNumber(createRequestNumber());
      setRecorded(false);
    } finally {
      setSubmitting(false);
      setStep("confirmation");
    }
  };

  /** Copies the request reference when the browser permits clipboard access. */
  const copyRequestNumber = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(requestNumber);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="checkout-overlay" role="dialog" aria-modal="true">
      <header className="checkout-header">
        <button
          type="button"
          className="checkout-logo"
          onClick={onClose}
          aria-label="Return to PEPR"
        >
          PEPR<span>.</span>
        </button>
        <div className="checkout-secure">
          <ShieldCheck size={17} />
          Research request
        </div>
        <div className="checkout-header-actions">
          <ThemeToggle />
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close checkout"
          >
            <X size={21} />
          </button>
        </div>
      </header>

      <div className="checkout-layout">
        <aside className="checkout-summary">
          <p className="eyebrow">Your selection</p>
          <h2>Request summary</h2>
          <div className="checkout-summary-items">
            {items.map((item, index) => (
              <div key={`${item.id}-${index}`}>
                <span>
                  <FlaskConical size={17} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.dose}</small>
                  </span>
                </span>
                <b>{formatCurrency(item.price)}</b>
              </div>
            ))}
          </div>
          <div className="checkout-totals">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            {step !== "contact" && step !== "address" && (
              <>
                <div>
                  <span>Estimated shipping</span>
                  <strong>
                    {priced.shippingPrice === 0
                      ? "Free"
                      : formatCurrency(priced.shippingPrice)}
                  </strong>
                </div>
                <div>
                  <span>Estimated GST</span>
                  <strong>{formatCurrency(priced.estimatedTax)}</strong>
                </div>
                <div className="checkout-total">
                  <span>Estimated total</span>
                  <strong>{formatCurrency(priced.estimatedTotal)}</strong>
                </div>
              </>
            )}
          </div>
          <p className="checkout-estimate-note">
            Estimates only. Shipping, tax, and product eligibility are confirmed
            after review.
          </p>
        </aside>

        <main className="checkout-main">
          {step !== "confirmation" && (
            <ol className="checkout-progress" aria-label="Checkout progress">
              {["Contact", "Address", "Delivery", "Review"].map(
                (label, index) => {
                  const stepOrder: CheckoutStep[] = [
                    "contact",
                    "address",
                    "shipping",
                    "review",
                  ];
                  const currentIndex = stepOrder.indexOf(step);
                  return (
                    <li
                      className={
                        index <= currentIndex
                          ? "checkout-progress-active"
                          : undefined
                      }
                      key={label}
                    >
                      <span>
                        {index < currentIndex ? <Check size={12} /> : index + 1}
                      </span>
                      {label}
                    </li>
                  );
                },
              )}
            </ol>
          )}

          {step === "contact" && (
            <section className="checkout-step">
              <div className="checkout-step-heading">
                <Mail size={24} />
                <div>
                  <p className="eyebrow">Step 1 of 4</p>
                  <h1>Contact information</h1>
                  <p>
                    Enter the email that should receive status updates after
                    your request is reviewed.
                  </p>
                </div>
              </div>
              <form onSubmit={submitContact}>
                <label htmlFor="checkout-email">Email address</label>
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(sanitizeInput(event.target.value, 160))
                  }
                  placeholder="you@organization.ca"
                  required
                />
                <label className="checkout-checkbox">
                  <input
                    type="checkbox"
                    checked={researchConfirmed}
                    onChange={(event) =>
                      setResearchConfirmed(event.target.checked)
                    }
                    required
                  />
                  <span>
                    I confirm this request is for qualified research purposes
                    and not personal use or human consumption.
                  </span>
                </label>
                <button
                  className="checkout-primary"
                  type="submit"
                  disabled={!researchConfirmed}
                >
                  Continue to shipping address <ArrowRight size={17} />
                </button>
              </form>
            </section>
          )}

          {step === "address" && (
            <section className="checkout-step">
              <button
                className="checkout-back"
                type="button"
                onClick={() => setStep("contact")}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <div className="checkout-step-heading">
                <MapPin size={24} />
                <div>
                  <p className="eyebrow">Step 2 of 4</p>
                  <h1>Shipping address</h1>
                  <p>
                    Canadian delivery addresses only. All fields are required
                    unless marked optional.
                  </p>
                </div>
              </div>
              <form className="address-form" onSubmit={submitAddress}>
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    value={address.fullName}
                    onChange={(event) =>
                      updateAddress("fullName", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Organization
                  <input
                    autoComplete="organization"
                    value={address.organization}
                    onChange={(event) =>
                      updateAddress("organization", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Phone <small>Optional</small>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={address.phone}
                    onChange={(event) =>
                      updateAddress("phone", event.target.value)
                    }
                  />
                </label>
                <label className="address-wide">
                  Street address
                  <input
                    autoComplete="street-address"
                    value={address.street}
                    onChange={(event) =>
                      updateAddress("street", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Unit <small>Optional</small>
                  <input
                    value={address.unit}
                    onChange={(event) =>
                      updateAddress("unit", event.target.value)
                    }
                  />
                </label>
                <label>
                  City
                  <input
                    autoComplete="address-level2"
                    value={address.city}
                    onChange={(event) =>
                      updateAddress("city", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Province
                  <select
                    autoComplete="address-level1"
                    value={address.province}
                    onChange={(event) =>
                      updateAddress("province", event.target.value)
                    }
                    required
                  >
                    {provinces.map((province) => (
                      <option key={province}>{province}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Postal code
                  <input
                    autoComplete="postal-code"
                    value={address.postalCode}
                    onChange={(event) =>
                      updateAddress("postalCode", event.target.value)
                    }
                    pattern="[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d"
                    placeholder="A1A 1A1"
                    required
                  />
                </label>
                <button className="checkout-primary address-wide" type="submit">
                  View delivery options <ArrowRight size={17} />
                </button>
              </form>
            </section>
          )}

          {step === "shipping" && (
            <section className="checkout-step">
              <button
                className="checkout-back"
                type="button"
                onClick={() => setStep("address")}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <div className="checkout-step-heading">
                <Truck size={24} />
                <div>
                  <p className="eyebrow">Step 3 of 4</p>
                  <h1>Choose delivery speed</h1>
                  <p>
                    Select a Canada Post service. Dates and rates are estimates
                    until the request is reviewed.
                  </p>
                </div>
              </div>
              <form onSubmit={submitShipping}>
                <fieldset className="shipping-options">
                  <legend className="sr-only">Canada Post service</legend>
                  {shippingOptions.map((option) => {
                    const price = priceShipping(
                      subtotal,
                      option.id,
                    ).shippingPrice;
                    return (
                      <label
                        className={
                          shippingId === option.id
                            ? "shipping-option shipping-option-active"
                            : "shipping-option"
                        }
                        key={option.id}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={option.id}
                          checked={shippingId === option.id}
                          onChange={(event) =>
                            setShippingId(event.target.value)
                          }
                        />
                        <span>
                          <strong>{option.name}</strong>
                          <small>{option.estimate}</small>
                        </span>
                        <b>{price === 0 ? "Free" : formatCurrency(price)}</b>
                      </label>
                    );
                  })}
                </fieldset>
                <button className="checkout-primary" type="submit">
                  Review request <ArrowRight size={17} />
                </button>
              </form>
            </section>
          )}

          {step === "review" && (
            <section className="checkout-step">
              <button
                className="checkout-back"
                type="button"
                onClick={() => setStep("shipping")}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <div className="checkout-step-heading">
                <ShoppingBag size={24} />
                <div>
                  <p className="eyebrow">Step 4 of 4</p>
                  <h1>Review your request</h1>
                  <p>
                    Confirm your contact and shipping details before creating
                    the request reference.
                  </p>
                </div>
              </div>
              <div className="review-grid">
                <div>
                  <span>Email</span>
                  <strong>{email}</strong>
                  <button type="button" onClick={() => setStep("contact")}>
                    Change
                  </button>
                </div>
                <div>
                  <span>Ship to</span>
                  <strong>{address.fullName}</strong>
                  <p>
                    {address.organization}
                    <br />
                    {address.street}
                    {address.unit ? `, ${address.unit}` : ""}
                    <br />
                    {address.city}, {address.province} {address.postalCode}
                  </p>
                  <button type="button" onClick={() => setStep("address")}>
                    Change
                  </button>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>{priced.shippingName}</strong>
                  <p>{priced.shippingEstimate}</p>
                  <button type="button" onClick={() => setStep("shipping")}>
                    Change
                  </button>
                </div>
              </div>
              <form onSubmit={submitRequest}>
                <label className="checkout-checkbox checkout-checkbox-review">
                  <input
                    type="checkbox"
                    checked={reviewConfirmed}
                    onChange={(event) =>
                      setReviewConfirmed(event.target.checked)
                    }
                    required
                  />
                  <span>
                    I certify that these details are accurate and understand
                    this creates a pending request—not a completed purchase.
                  </span>
                </label>
                <button
                  className="checkout-primary"
                  type="submit"
                  disabled={!reviewConfirmed || submitting}
                >
                  {submitting ? (
                    "Creating order request…"
                  ) : (
                    <>
                      Create order request <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            </section>
          )}

          {step === "confirmation" && (
            <section className="checkout-confirmation">
              <div className="confirmation-check">
                <Check size={34} />
              </div>
              <p className="eyebrow">Request created</p>
              <h2>Your reference is ready.</h2>
              <p>
                Keep this number for all future correspondence. If the request
                is approved after eligibility review, any next steps will
                reference this number.
              </p>
              <div className="request-number">
                <span>Request number</span>
                <strong>{requestNumber}</strong>
                <button type="button" onClick={copyRequestNumber}>
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {!recorded && (
                <div className="confirmation-notice">
                  <ShieldCheck size={21} />
                  <span>
                    This reference was created in the browser because the order
                    endpoint was unavailable. It will not appear on the admin
                    page.
                  </span>
                </div>
              )}
              <h1 className="payment-heading">
                No payment is due. Please make your e-transfer to the following
                email address: blueglobal2@gmail.com with your confirmation
                number as the reference. Thank you.
              </h1>
              <button
                className="checkout-primary"
                type="button"
                onClick={onClose}
              >
                Return to storefront
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
