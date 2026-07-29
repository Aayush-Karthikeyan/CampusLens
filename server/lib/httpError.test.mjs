import { describe, it, expect } from "vitest";
import { normalizeDbError } from "./httpError.js";

// Route handlers used to return raw 500s with the internal error text, so a
// malformed id read as a server fault and leaked Mongoose internals to the
// client. These map database failures to honest status codes instead.
describe("normalizeDbError", () => {
  it("treats a malformed id as a client error, not a server fault", () => {
    const result = normalizeDbError({ name: "CastError" });
    expect(result.statusCode).toBe(400);
    expect(result.message).toMatch(/id/i);
  });

  it("surfaces the first validation message on a 400", () => {
    const result = normalizeDbError({
      name: "ValidationError",
      errors: { name: { message: "Course name is required." } },
    });
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Course name is required.");
  });

  it("falls back to a generic 500 without leaking internals", () => {
    const leaky = new Error("connect ECONNREFUSED 10.0.0.5:27017");
    const result = normalizeDbError(leaky, "Could not load courses.");

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Could not load courses.");
    expect(result.message).not.toContain("ECONNREFUSED");
  });

  it("still returns a usable shape when given nothing", () => {
    const result = normalizeDbError(undefined);
    expect(result.statusCode).toBe(500);
    expect(typeof result.message).toBe("string");
  });
});
