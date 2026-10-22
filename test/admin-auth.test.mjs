import assert from "node:assert/strict";
import test from "node:test";
import { requireAdminPassword } from "../api/server/lib/http.mjs";

test("matching administrator password is accepted", () => {
  process.env.ADMIN_PASSWORD = "test-only-password";
  assert.doesNotThrow(() => requireAdminPassword({
    headers: { "x-admin-password": "test-only-password" },
  }));
});

test("missing and incorrect administrator passwords are rejected", () => {
  process.env.ADMIN_PASSWORD = "test-only-password";

  for (const event of [{}, { headers: { "x-admin-password": "incorrect-password" } }]) {
    assert.throws(
      () => requireAdminPassword(event),
      (error) => error?.code === "FORBIDDEN" && error?.statusCode === 403,
    );
  }
});
