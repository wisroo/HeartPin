// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

describe("Phase 3 original relay schema", () => {
  it("defines explicit transfer owners and original metadata", () => {
    expect(schema).toContain("source_owner text not null");
    expect(schema).toContain("dest_owner text not null");
    expect(schema).toContain("original_name text not null");
    expect(schema).not.toContain("dest text not null");
  });

  it("scopes relay originals to the authenticated user", () => {
    expect(schema).toContain("(storage.foldername(name))[1] in ('test-originals', 'relay-originals')");
    expect(schema).toContain("(storage.foldername(name))[2] = (select auth.uid()::text)");
  });
});
