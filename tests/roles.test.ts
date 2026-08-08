import { describe, expect, it } from "vitest";
import { hasMinimumRole, highestRole } from "../app/shared/auth/roles";

describe("server-side roles", () => {
  it("does not let members edit", () => {
    expect(hasMinimumRole(["member"], "editor")).toBe(false);
  });

  it("does not let editors publish", () => {
    expect(hasMinimumRole(["editor"], "admin")).toBe(false);
  });

  it("lets admins perform every lower role", () => {
    expect(hasMinimumRole(["admin"], "editor")).toBe(true);
    expect(highestRole(["member", "admin"])).toBe("admin");
  });
});
