import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { adminUsername } from "../src/adminAccount.ts";
import { createFileAdminAuth } from "./adminAuth.ts";

let directory = "";

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("admin credentials", () => {
  it("stores a password hash and accepts a replacement password", async () => {
    directory = await mkdtemp(resolve(tmpdir(), "pepr-admin-"));
    const credentialsFile = resolve(directory, "admin.json");
    const auth = createFileAdminAuth({
      credentialsFile,
      username: adminUsername,
      initialPassword: "test-password-1",
    });

    const firstLogin = await auth.login(adminUsername, "test-password-1");
    expect(firstLogin.status).toBe("ok");
    const saved = await readFile(credentialsFile, "utf8");
    expect(saved).not.toContain("test-password-1");

    const changed = await auth.changePassword(
      "test-password-1",
      "next-password",
    );
    expect(changed).toEqual({ ok: true });
    expect(await auth.login(adminUsername, "test-password-1")).toEqual({
      status: "denied",
    });

    const replacement = createFileAdminAuth({
      credentialsFile,
      username: adminUsername,
      initialPassword: "ignored-password",
    });
    expect(
      await replacement.login(adminUsername, "next-password"),
    ).toMatchObject({
      status: "ok",
    });
  });
});
