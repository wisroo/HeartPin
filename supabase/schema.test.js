// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const compactSql = (value) => value.replace(/\s+/g, " ").trim();

function policySql(name) {
  const match = schema.match(new RegExp(`create policy "${name}"[\\s\\S]*?;`));
  expect(match, `missing policy: ${name}`).not.toBeNull();
  return compactSql(match[0]);
}

describe("Phase 3 original relay schema", () => {
  it("defines explicit transfer owners and original metadata", () => {
    expect(schema).toContain("source_owner text not null");
    expect(schema).toContain("dest_owner text not null");
    expect(schema).toContain("original_name text not null");
    expect(schema).not.toContain("dest text not null");
  });

  it("enforces a server-derived seven-day expiry", () => {
    expect(schema).toContain("expires_at timestamptz not null default (now() + interval '7 days')");
    expect(schema).toContain("new.expires_at = new.created_at + interval '7 days';");
    expect(schema).toContain(
      "create trigger set_transfer_queue_expiry before insert or update on public.transfer_queue",
    );
  });

  it("scopes every original Storage policy to the authenticated user and relay depth", () => {
    const scopedOriginalsRule = compactSql(`
      (storage.foldername(name))[2] = (select auth.uid()::text)
      and (
        (storage.foldername(name))[1] = 'test-originals'
        or (
          (storage.foldername(name))[1] = 'relay-originals'
          and array_length(storage.foldername(name), 1) = 3
        )
      )
    `);
    const policies = [
      ["authenticated read photos", 1],
      ["authenticated write photos", 1],
      ["authenticated update photos", 2],
      ["authenticated delete photos", 1],
    ];

    for (const [name, expectedOccurrences] of policies) {
      expect(policySql(name).split(scopedOriginalsRule)).toHaveLength(expectedOccurrences + 1);
    }
  });
});
