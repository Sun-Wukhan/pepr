export interface OrderItem {
  id: number;
  name: string;
  dose: string;
  price: number;
}

export interface OrderAddress {
  fullName: string;
  organization: string;
  phone: string;
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface OrderRecord {
  referenceNumber: string;
  createdAt: string;
  status: "pending";
  email: string;
  items: OrderItem[];
  address: OrderAddress;
  shippingId: string;
  shippingName: string;
  shippingEstimate: string;
  subtotal: number;
  shippingPrice: number;
  estimatedTax: number;
  estimatedTotal: number;
}

export interface CreateOrderInput {
  email: string;
  items: OrderItem[];
  address: OrderAddress;
  shippingId: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  estimate: string;
  price: number;
}

export interface OrderQuote {
  shippingId: string;
  shippingName: string;
  shippingEstimate: string;
  shippingPrice: number;
  estimatedTax: number;
  estimatedTotal: number;
}

export type OrderParseResult =
  { ok: true; value: CreateOrderInput } | { ok: false; error: string };

export const shippingOptions: ShippingOption[] = [
  {
    id: "regular",
    name: "Canada Post Regular Parcel",
    estimate: "Estimated 5–8 business days",
    price: 18,
  },
  {
    id: "expedited",
    name: "Canada Post Expedited Parcel",
    estimate: "Estimated 2–4 business days",
    price: 25,
  },
  {
    id: "xpresspost",
    name: "Canada Post Xpresspost",
    estimate: "Estimated 1–2 business days",
    price: 35,
  },
];

export const provinces = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Removes markup characters and limits user-entered text length. */
export function sanitizeInput(value: string, maxLength = 120): string {
  return value.replace(/[<>]/g, "").slice(0, maxLength);
}

/** Creates a human-readable reference for a local order request. */
export function createRequestNumber(
  now: number = Date.now(),
  randomValue: number = Math.random(),
): string {
  const timePart = now.toString(36).toUpperCase().slice(-6);
  const randomPart = randomValue.toString(36).toUpperCase().slice(2, 6);
  return `PEPR-${timePart}-${randomPart}`;
}

/** Formats a monetary amount in Canadian dollars. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

/** Prices a known Canada Post option, including complimentary regular parcel. */
export function priceShipping(
  subtotal: number,
  shippingId: string,
): OrderQuote {
  const selected =
    shippingOptions.find((option) => option.id === shippingId) ??
    shippingOptions[0];
  const shippingPrice =
    subtotal >= 250 && selected.id === "regular" ? 0 : selected.price;
  const estimatedTax = (subtotal + shippingPrice) * 0.05;
  return {
    shippingId: selected.id,
    shippingName: selected.name,
    shippingEstimate: selected.estimate,
    shippingPrice,
    estimatedTax,
    estimatedTotal: subtotal + shippingPrice + estimatedTax,
  };
}

/** Builds a pending order, including its reference number and price quote. */
export function buildOrderRecord(
  input: CreateOrderInput,
  now: Date = new Date(),
): OrderRecord {
  const subtotal = input.items.reduce((sum, item) => sum + item.price, 0);
  const quote = priceShipping(subtotal, input.shippingId);
  return {
    referenceNumber: createRequestNumber(now.getTime()),
    createdAt: now.toISOString(),
    status: "pending",
    email: input.email,
    items: input.items,
    address: input.address,
    shippingId: quote.shippingId,
    shippingName: quote.shippingName,
    shippingEstimate: quote.shippingEstimate,
    subtotal,
    shippingPrice: quote.shippingPrice,
    estimatedTax: quote.estimatedTax,
    estimatedTotal: quote.estimatedTotal,
  };
}

/** Checks whether a stored value has the order fields the admin page renders. */
export function isOrderRecord(value: unknown): value is OrderRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.referenceNumber === "string" &&
    typeof value.createdAt === "string" &&
    value.status === "pending" &&
    typeof value.email === "string" &&
    Array.isArray(value.items) &&
    value.items.every(isOrderItem) &&
    isOrderAddress(value.address) &&
    typeof value.shippingId === "string" &&
    typeof value.shippingName === "string" &&
    typeof value.shippingEstimate === "string" &&
    isMoney(value.subtotal) &&
    isMoney(value.shippingPrice) &&
    isMoney(value.estimatedTax) &&
    isMoney(value.estimatedTotal)
  );
}

/** Reads the order list returned by the admin endpoint. */
export function readOrderList(payload: unknown): OrderRecord[] {
  if (!isRecord(payload) || !Array.isArray(payload.orders)) {
    throw new Error("Admin endpoint returned an unexpected payload.");
  }
  if (!payload.orders.every(isOrderRecord)) {
    throw new Error("Admin endpoint returned an unexpected payload.");
  }
  return payload.orders;
}

/** Validates and sanitizes a checkout payload before it is stored. */
export function parseCreateOrderInput(value: unknown): OrderParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: "Order details are missing." };
  }

  const email = readString(value.email, 160)?.toLowerCase() ?? "";
  if (!emailPattern.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!Array.isArray(value.items) || value.items.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }
  if (value.items.length > 30) {
    return { ok: false, error: "Too many items were submitted." };
  }

  const items: OrderItem[] = [];
  for (const item of value.items) {
    const parsed = parseOrderItem(item);
    if (!parsed)
      return { ok: false, error: "An item in the order is invalid." };
    items.push(parsed);
  }

  const address = parseAddress(value.address);
  if (!address) {
    return { ok: false, error: "The shipping address is invalid." };
  }

  const shippingId = readString(value.shippingId, 40) ?? "";
  if (!shippingOptions.some((option) => option.id === shippingId)) {
    return { ok: false, error: "Choose a delivery option." };
  }

  return { ok: true, value: { email, items, address, shippingId } };
}

/** Narrows an unknown value to a string-keyed record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Accepts a finite, non-negative amount. */
function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Checks a stored line item. */
function isOrderItem(value: unknown): value is OrderItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    Number.isInteger(value.id) &&
    typeof value.name === "string" &&
    typeof value.dose === "string" &&
    isMoney(value.price)
  );
}

/** Checks a stored Canadian shipping address. */
function isOrderAddress(value: unknown): value is OrderAddress {
  if (!isRecord(value)) return false;
  return (
    typeof value.fullName === "string" &&
    typeof value.organization === "string" &&
    typeof value.phone === "string" &&
    typeof value.street === "string" &&
    typeof value.unit === "string" &&
    typeof value.city === "string" &&
    typeof value.province === "string" &&
    typeof value.postalCode === "string"
  );
}

/** Trims and sanitizes a required or optional string field. */
function readString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return sanitizeInput(value, maxLength).trim();
}

/** Parses one submitted catalog line. */
function parseOrderItem(value: unknown): OrderItem | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name, 80);
  const dose = readString(value.dose, 80);
  if (
    !name ||
    !dose ||
    typeof value.id !== "number" ||
    !Number.isInteger(value.id)
  ) {
    return null;
  }
  if (
    value.id < 1 ||
    value.id > 100000 ||
    !isMoney(value.price) ||
    value.price > 100000
  ) {
    return null;
  }
  return {
    id: value.id,
    name,
    dose,
    price: Math.round(value.price * 100) / 100,
  };
}

/** Parses and normalizes a Canadian delivery address. */
function parseAddress(value: unknown): OrderAddress | null {
  if (!isRecord(value)) return null;
  const fullName = readString(value.fullName, 120);
  const organization = readString(value.organization, 120);
  const street = readString(value.street, 120);
  const city = readString(value.city, 80);
  const province = readString(value.province, 80);
  const postalCode = normalizePostalCode(
    readString(value.postalCode, 12) ?? "",
  );
  if (
    !fullName ||
    !organization ||
    !street ||
    !city ||
    !province ||
    !postalCode
  ) {
    return null;
  }
  if (!provinces.includes(province)) return null;
  return {
    fullName,
    organization,
    phone: readString(value.phone, 40) ?? "",
    street,
    unit: readString(value.unit, 40) ?? "",
    city,
    province,
    postalCode,
  };
}

/** Formats a Canadian postal code as `A1A 1A1`, or rejects it. */
function normalizePostalCode(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return null;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}
