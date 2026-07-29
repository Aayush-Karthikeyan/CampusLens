import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signToken,
  readToken,
  cookieOptions,
} from "./auth.js";

describe("password hashing", () => {
  it("never stores the password itself", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt marker
  });

  it("accepts the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("hunter2hunter2");
    expect(await verifyPassword("hunter2hunter2", hash)).toBe(true);
    expect(await verifyPassword("hunter2hunter3", hash)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    // without a per-hash salt, identical passwords produce identical hashes and
    // one leaked table reveals every account that shares a password
    const [a, b] = await Promise.all([
      hashPassword("samepassword"),
      hashPassword("samepassword"),
    ]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("samepassword", a)).toBe(true);
    expect(await verifyPassword("samepassword", b)).toBe(true);
  });
});

describe("session tokens", () => {
  it("round-trips the user id", () => {
    expect(readToken(signToken("6a5c3065086f756abf67bcce"))).toBe(
      "6a5c3065086f756abf67bcce"
    );
  });

  it("rejects a tampered token instead of trusting its payload", () => {
    const token = signToken("aaaaaaaaaaaaaaaaaaaaaaaa");
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "bbbbbbbbbbbbbbbbbbbbbbbb" })
    ).toString("base64url");

    expect(readToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it("returns null for junk rather than throwing", () => {
    expect(readToken("not-a-token")).toBeNull();
    expect(readToken("")).toBeNull();
    expect(readToken(undefined)).toBeNull();
  });
});

describe("cookie options", () => {
  it("is always httpOnly so page scripts can never read the session", () => {
    expect(cookieOptions().httpOnly).toBe(true);
  });

  it("sets a finite lifetime", () => {
    expect(cookieOptions().maxAge).toBeGreaterThan(0);
  });
});
