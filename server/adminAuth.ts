import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  AdminAuth,
  LoginResult,
  PasswordChangeResult,
} from "../src/orderApi.ts";

const hashLength = 64;
const minimumPasswordLength = 8;

interface StoredCredentials {
  username: string;
  salt: string;
  hash: string;
}

interface FileAdminAuthOptions {
  credentialsFile: string;
  username: string;
  initialPassword: string;
}

/** Stores the admin password as a hash and issues in-memory sessions. */
export function createFileAdminAuth(options: FileAdminAuthOptions): AdminAuth {
  const sessions = new Set<string>();
  let chain: Promise<void> = Promise.resolve();
  let cached: StoredCredentials | null | undefined;

  /** Runs credential reads and writes one at a time. */
  const withLock = <T>(task: () => Promise<T>): Promise<T> => {
    const run = chain.then(task, task);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  /** Loads the saved hash, or creates it from the initial password once. */
  const loadCredentials = (): Promise<StoredCredentials | null> =>
    withLock(async () => {
      if (cached !== undefined) return cached;
      cached = await readCredentials(options.credentialsFile);
      if (cached) return cached;
      if (!options.initialPassword) {
        cached = null;
        return null;
      }
      cached = await createStoredCredentials(
        options.username,
        options.initialPassword,
      );
      await writeCredentials(options.credentialsFile, cached);
      return cached;
    });

  return {
    async configured(): Promise<boolean> {
      return (await loadCredentials()) !== null;
    },
    async login(username: string, password: string): Promise<LoginResult> {
      const stored = await loadCredentials();
      if (!stored) return { status: "unconfigured" };
      const passwordMatches = await passwordMatchesHash(password, stored);
      const usernameMatches = stringsMatch(username, stored.username);
      if (!passwordMatches || !usernameMatches) return { status: "denied" };
      const token = randomBytes(32).toString("base64url");
      sessions.add(token);
      return { status: "ok", token };
    },
    hasSession(token: string | null): boolean {
      return token !== null && sessions.has(token);
    },
    async changePassword(
      currentPassword: string,
      newPassword: string,
    ): Promise<PasswordChangeResult> {
      const stored = await loadCredentials();
      if (!stored) {
        return {
          ok: false,
          status: 503,
          error: "Admin access is not configured.",
        };
      }
      if (!(await passwordMatchesHash(currentPassword, stored))) {
        return {
          ok: false,
          status: 401,
          error: "The current password was not accepted.",
        };
      }
      if (newPassword.length < minimumPasswordLength) {
        return { ok: false, status: 400, error: "Use at least 8 characters." };
      }
      if (stringsMatch(currentPassword, newPassword)) {
        return {
          ok: false,
          status: 400,
          error: "Choose a different password.",
        };
      }
      const replacement = await createStoredCredentials(
        stored.username,
        newPassword,
      );
      await withLock(async () => {
        cached = replacement;
        await writeCredentials(options.credentialsFile, replacement);
      });
      return { ok: true };
    },
  };
}

/** Hashes a password with a fresh salt. */
async function createStoredCredentials(
  username: string,
  password: string,
): Promise<StoredCredentials> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);
  return {
    username,
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  };
}

/** Derives a scrypt key from a password and salt. */
function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, hashLength, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

/** Checks a password against a stored scrypt hash. */
async function passwordMatchesHash(
  password: string,
  stored: StoredCredentials,
): Promise<boolean> {
  const actual = await deriveKey(password, Buffer.from(stored.salt, "base64"));
  const expected = Buffer.from(stored.hash, "base64");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Reads credentials when the file exists and has the expected shape. */
async function readCredentials(
  credentialsFile: string,
): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(credentialsFile, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredCredentials(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Writes the password hash without storing the password itself. */
async function writeCredentials(
  credentialsFile: string,
  stored: StoredCredentials,
): Promise<void> {
  await mkdir(dirname(credentialsFile), { recursive: true });
  await writeFile(credentialsFile, JSON.stringify(stored), {
    encoding: "utf8",
    mode: 0o600,
  });
}

/** Checks a parsed credentials file. */
function isStoredCredentials(value: unknown): value is StoredCredentials {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.username === "string" &&
    typeof record.salt === "string" &&
    typeof record.hash === "string"
  );
}

/** Compares two strings without returning at the first mismatch. */
function stringsMatch(provided: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(provided);
  const right = encoder.encode(expected);
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}
