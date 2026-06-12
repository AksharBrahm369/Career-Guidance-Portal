import { describe, expect, it } from "vitest";
import { adminUsernameToAuthEmail } from "@/lib/admin/admin-username";

describe("adminUsernameToAuthEmail", () => {
  it("maps short admin usernames to internal auth emails", () => {
    expect(adminUsernameToAuthEmail("sevak@hp")).toBe("sevak@hp.admin.local");
  });

  it("keeps normal email addresses unchanged", () => {
    expect(adminUsernameToAuthEmail("admin@example.com")).toBe("admin@example.com");
  });
});
