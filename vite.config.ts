import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { adminUsername } from "./src/adminAccount.ts";
import { adminOrdersPlugin } from "./server/adminOrdersPlugin.ts";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const initialPassword =
    process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || "";

  return {
    base: "/pepr/",
    plugins: [
      react(),
      adminOrdersPlugin({
        username: adminUsername,
        initialPassword,
        credentialsFile: resolve(process.cwd(), "data/admin.json"),
        ordersFile: resolve(process.cwd(), "data/orders.json"),
      }),
    ],
    test: {
      environment: "jsdom",
    },
  };
});
