import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  base: "/pepr/",
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
