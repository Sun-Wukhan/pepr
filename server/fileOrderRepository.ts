import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { OrderRepository } from "../src/orderApi.ts";
import { isOrderRecord, type OrderRecord } from "../src/orders.ts";

const maxStoredOrders = 1000;

/** Persists the order queue in a local JSON file. */
export function createFileOrderRepository(dataFile: string): OrderRepository {
  let chain: Promise<void> = Promise.resolve();

  /** Runs repository writes one at a time so the file is not overwritten. */
  const withLock = <T>(task: () => Promise<T>): Promise<T> => {
    const run = chain.then(task, task);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  /** Reads previously saved orders, skipping a missing or corrupt file. */
  const readAll = async (): Promise<OrderRecord[]> => {
    try {
      const raw = await readFile(dataFile, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || !Array.isArray(parsed.orders)) return [];
      return parsed.orders.filter(isOrderRecord);
    } catch {
      return [];
    }
  };

  return {
    async listOrders(): Promise<OrderRecord[]> {
      const orders = await withLock(readAll);
      return orders.slice().reverse();
    },
    async saveOrder(order: OrderRecord): Promise<void> {
      await withLock(async () => {
        const orders = await readAll();
        orders.push(order);
        await mkdir(dirname(dataFile), { recursive: true });
        await writeFile(
          dataFile,
          JSON.stringify({ orders: orders.slice(-maxStoredOrders) }, null, 2),
          "utf8",
        );
      });
    },
  };
}

/** Narrows an unknown JSON value to a string-keyed record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
