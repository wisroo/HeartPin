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

function tableSql(name) {
  const match = schema.match(new RegExp(`create table if not exists public\\.${name} \\([\\s\\S]*?\\n\\);`));
  expect(match, `missing table: ${name}`).not.toBeNull();
  return compactSql(match[0]);
}

describe("Phase 3 original relay schema", () => {
  it("defines explicit transfer owners and original metadata", () => {
    const transferTable = tableSql("transfer_queue");

    expect(transferTable).toContain("user_id uuid not null references auth.users(id) on delete cascade");
    expect(transferTable).toContain("source_owner text not null");
    expect(transferTable).toContain("dest_owner text not null");
    expect(transferTable).toContain("original_name text not null");
    expect(transferTable).not.toContain("dest text not null");
  });

  it("owns transfer creation and expiry timestamps on insert and update", () => {
    expect(schema).toContain("expires_at timestamptz not null default (now() + interval '7 days')");
    expect(compactSql(schema)).toContain(compactSql(`
      if tg_op = 'INSERT' then
        new.created_at = now();
        new.expires_at = new.created_at + interval '7 days';
      else
        new.created_at = old.created_at;
        new.expires_at = old.expires_at;
      end if;
    `));
    expect(schema).toContain(
      "create trigger set_transfer_queue_expiry before insert or update on public.transfer_queue",
    );
  });

  it("preflights unsupported legacy destinations before migrating them", () => {
    const compact = compactSql(schema);
    const preflight = "unsupported legacy transfer_queue destinations must be cleaned or archived before rerunning";
    const firstMutation = "alter table public.transfer_queue add column if not exists user_id uuid;";

    expect(compact).toContain("column_name = 'dest'");
    expect(compact).toContain("dest is null or dest not in ('bara', 'nyong')");
    expect(compact).toContain(preflight);
    expect(compact.indexOf(preflight)).toBeLessThan(compact.indexOf(firstMutation));
  });

  it("migrates only usable queued paths to uploaded and rejects pathless uploads", () => {
    const compact = compactSql(schema);

    expect(compact).toContain(compactSql(`
      update public.transfer_queue
      set status = 'failed'
      where status in ('queued', 'uploaded')
        and nullif(btrim(tmp_path), '') is null;
    `));
    expect(compact).toContain(compactSql(`
      update public.transfer_queue
      set status = 'uploaded'
      where status = 'queued'
        and nullif(btrim(tmp_path), '') is not null;
    `));
    expect(compact).toContain(compactSql(`
      constraint transfer_queue_uploaded_path_check
      check (status <> 'uploaded' or nullif(btrim(tmp_path), '') is not null)
    `));
    expect(compact).toContain(
      "drop constraint if exists transfer_queue_uploaded_path_check;",
    );
  });

  it("preflights and backfills legacy rows to the sole shared account", () => {
    const compact = compactSql(schema);

    expect(compact).toContain("alter table public.transfer_queue add column if not exists user_id uuid;");
    expect(compact).toContain("select count(*) into auth_user_count from auth.users");
    expect(compact).toContain("legacy transfer_queue rows require exactly one shared auth.users account before rerunning");
    expect(compact.indexOf("legacy transfer_queue rows require exactly one shared auth.users account before rerunning"))
      .toBeLessThan(compact.indexOf("alter table public.transfer_queue add column if not exists user_id uuid;"));
    expect(compact).toContain(compactSql(`
      update public.transfer_queue
      set user_id = (select id from auth.users limit 1)
      where user_id is null;
    `));
    expect(compact).toContain(compactSql(`
      constraint transfer_queue_user_id_not_null
      check (user_id is not null) not valid
    `));
    expect(compact).toContain(compactSql(`
      foreign key (user_id) references auth.users(id) on delete cascade not valid
    `));
  });

  it("scopes transfer rows to the authenticated account", () => {
    expect(policySql("authenticated transfer_queue")).toContain(compactSql(`
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()))
    `));
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
