import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTestOriginalPath, createSupabaseAdapter } from "./supabaseAdapter.js";

function makeUploadClient({
  user = { id: "user-123" },
  uploadError = null,
  uploadErrors = {},
  insertError = null,
  insertErrors = {},
  signedUrlErrors = {},
  removeError = null,
  removeReject = null,
  deleteError = null,
  deleteReject = null,
} = {}) {
  const operations = [];
  const uploads = [];
  const inserts = [];
  const deletes = [];
  const upload = vi.fn((path, body, options) => {
    uploads.push({ path, body, options });
    operations.push({ type: "upload", path });
    return Promise.resolve({ data: { path: "uploaded" }, error: uploadErrors[path] || uploadError });
  });
  const remove = vi.fn((paths) => {
    operations.push({ type: "remove", paths });
    if (removeReject) return Promise.reject(removeReject);
    return Promise.resolve({ data: null, error: removeError });
  });
  const createSignedUrl = vi.fn((path) => Promise.resolve({
    data: { signedUrl: "https://signed.example/photo.jpg" },
    error: signedUrlErrors[path] || null,
  }));
  const insert = vi.fn();
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: user ? { user } : null }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({ upload, remove, createSignedUrl }),
    },
    from: vi.fn((table) => ({
      insert: vi.fn((payload) => {
        insert(payload);
        inserts.push({ table, payload });
        operations.push({ type: "insert", table });
        return Promise.resolve({ data: null, error: insertErrors[table] || insertError });
      }),
      delete: vi.fn(() => ({
        eq: vi.fn((column, value) => {
          deletes.push({ table, column, value });
          operations.push({ type: "delete", table, column, value });
          if (deleteReject) return Promise.reject(deleteReject);
          return Promise.resolve({ data: null, error: deleteError });
        }),
      })),
    })),
    spies: { upload, remove, createSignedUrl, insert, uploads, inserts, deletes, operations },
  };
}

function preparedUpload(overrides = {}) {
  return {
    contentHash: "hash-123",
    display: {
      body: new Blob(["display"], { type: "image/webp" }),
      contentType: "image/webp",
    },
    thumb: {
      body: new Blob(["thumb"], { type: "image/webp" }),
      contentType: "image/webp",
    },
    ratio: "4/3",
    takenAt: "2026-06-25T10:11:12Z",
    date: "2026-06-25",
    time: "10:11",
    lat: 37.5,
    lng: 127.0,
    label: "gps",
    tint: "cool",
    originalName: "gps.jpg",
    originalSize: 3,
    ...overrides,
  };
}

function makeFetchClient({ user = { id: "user-123" }, rows = {}, signedUrlErrors = {} } = {}) {
  const createSignedUrl = vi.fn((path) => Promise.resolve({
    data: { signedUrl: `https://signed.example/${path}` },
    error: signedUrlErrors[path] || null,
  }));
  const queries = [];
  const updates = [];
  const deletes = [];
  const inserts = [];

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: user ? { user } : null }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({ createSignedUrl }),
    },
    from: vi.fn((table) => {
      const filters = [];
      const inFilters = [];
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((column, value) => {
          filters.push({ column, value });
          return query;
        }),
        in: vi.fn((column, value) => {
          inFilters.push({ column, value });
          return query;
        }),
        single: vi.fn(() => {
          const row = (rows[table] || []).find((candidate) => (
            filters.every((filter) => candidate[filter.column] === filter.value)
          ));
          return Promise.resolve({ data: row || null, error: null });
        }),
        maybeSingle: vi.fn(() => {
          const row = (rows[table] || []).find((candidate) => (
            filters.every((filter) => candidate[filter.column] === filter.value)
          ));
          return Promise.resolve({ data: row || null, error: null });
        }),
        order: vi.fn(() => query),
        insert: vi.fn((payload) => {
          inserts.push({ table, payload });
          return Promise.resolve({ data: null, error: null });
        }),
        update: vi.fn((payload) => ({
          eq: vi.fn((column, value) => {
            updates.push({ table, payload, column, value });
            return Promise.resolve({ data: null, error: null });
          }),
          in: vi.fn((column, value) => {
            updates.push({ table, payload, column, value });
            return Promise.resolve({ data: null, error: null });
          }),
        })),
        delete: vi.fn(() => ({
          in: vi.fn((column, value) => {
            deletes.push({ table, column, value });
            return Promise.resolve({ data: null, error: null });
          }),
        })),
        then(resolve, reject) {
          let data = rows[table] || [];
          filters.forEach((filter) => {
            data = data.filter((row) => row[filter.column] === filter.value);
          });
          inFilters.forEach((filter) => {
            data = data.filter((row) => filter.value.includes(row[filter.column]));
          });
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      queries.push({ table, query });
      return query;
    }),
    spies: { createSignedUrl, queries, updates, deletes, inserts },
  };
}

function transferRow(overrides = {}) {
  return {
    id: "tr_hash-123",
    user_id: "user-123",
    content_hash: "hash-123",
    source_owner: "bara",
    dest_owner: "nyong",
    tmp_path: "relay-originals/user-123/tr_hash-123/gps.jpg",
    original_name: "gps.jpg",
    original_size: 3,
    mime_type: "image/jpeg",
    status: "uploaded",
    expires_at: "2026-07-28T01:02:03.000Z",
    created_at: "2026-07-21T01:02:03.000Z",
    updated_at: "2026-07-21T01:02:03.000Z",
    ...overrides,
  };
}

describe("buildTestOriginalPath", () => {
  it("scopes temporary originals by user and session", () => {
    expect(buildTestOriginalPath("user-123", "session-abc", { name: "서울 여행 1.JPG" }, 0))
      .toBe("test-originals/user-123/session-abc/001-1.jpg");
  });

  it("keeps duplicate original names unique within one session", () => {
    const first = buildTestOriginalPath("user-123", "session-abc", { name: "gps.jpg" }, 0);
    const second = buildTestOriginalPath("user-123", "session-abc", { name: "gps.jpg" }, 1);

    expect(first).toBe("test-originals/user-123/session-abc/001-gps.jpg");
    expect(second).toBe("test-originals/user-123/session-abc/002-gps.jpg");
  });
});

describe("supabaseAdapter.fetchState", () => {
  it("assembles persisted trip, moment, and inbox rows into app state", async () => {
    const client = makeFetchClient({
      rows: {
        trips: [
          {
            id: "trip-1",
            region: "domestic",
            title: "부산 기록",
            start_date: "2026-07-10",
            date_label: "2026.07.10 – 07.11",
            cover: null,
            tags: ["국내", "바다"],
            sort_order: 1,
            created_at: "2026-07-12T00:00:00Z",
            updated_at: "2026-07-12T00:00:00Z",
          },
        ],
        days: [
          {
            id: "day-1",
            trip_id: "trip-1",
            label: "Day 1",
            date_label: "07.10 금",
            date_value: "2026-07-10",
            sort_order: 1,
            created_at: "2026-07-12T00:01:00Z",
            updated_at: "2026-07-12T00:01:00Z",
          },
        ],
        spots: [
          {
            id: "spot-1",
            day_id: "day-1",
            name: "해운대",
            time: "11:40",
            lat: 35.1587,
            lng: 129.1604,
            mood: "바다",
            guide: "여기서 하루를 열었지.",
            reaction: "파도 좋다!",
            sort_order: 1,
            created_at: "2026-07-12T00:02:00Z",
            updated_at: "2026-07-12T00:02:00Z",
          },
        ],
        moments: [
          {
            id: "moment-1",
            spot_id: "spot-1",
            display_path: "display/trip-1/moment-1.webp",
            thumb_path: "thumb/trip-1/moment-1.webp",
            label: "해운대 산책",
            ratio: "4/3",
            tint: "cool",
            content_hash: "hash-1",
            original_name: "beach.jpg",
            original_size: 1234,
            taken_at: "2026-07-10T11:40:00Z",
            lat: 35.1587,
            lng: 129.1604,
            owner: "bara",
            original_status: "kept",
            sort_order: 1,
            created_at: "2026-07-12T00:03:00Z",
            updated_at: "2026-07-12T00:03:00Z",
          },
        ],
        inbox_items: [
          {
            id: "inbox-1",
            kind: "noloc",
            date: "2026-07-11",
            time: "20:30",
            taken_at: "2026-07-11T20:30:00Z",
            lat: null,
            lng: null,
            display_path: "display/inbox/inbox-1.webp",
            thumb_path: "thumb/inbox/inbox-1.webp",
            label: "저녁 사진",
            auto_label: "저녁 사진",
            ratio: "1/1",
            tint: "warm",
            blur: false,
            content_hash: "hash-inbox",
            original_name: "dinner.jpg",
            original_size: 4321,
            owner: "nyong",
            original_status: "kept",
            created_at: "2026-07-12T00:04:00Z",
            updated_at: "2026-07-12T00:04:00Z",
          },
        ],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const state = await adapter.fetchState();

    expect(client.from).toHaveBeenCalledWith("trips");
    expect(client.from).toHaveBeenCalledWith("days");
    expect(client.from).toHaveBeenCalledWith("spots");
    expect(client.from).toHaveBeenCalledWith("moments");
    expect(client.from).toHaveBeenCalledWith("inbox_items");
    expect(client.storage.from).toHaveBeenCalledWith("photos");
    expect(state.version).toBe(Date.parse("2026-07-12T00:04:00Z"));
    expect(state.regions.domestic.trips).toEqual([{
      id: "trip-1",
      region: "domestic",
      start: "2026-07-10",
      title: "부산 기록",
      dateLabel: "2026.07.10 – 07.11",
      cover: expect.objectContaining({
        id: "moment-1",
        src: "https://signed.example/display/trip-1/moment-1.webp",
        thumb: "https://signed.example/thumb/trip-1/moment-1.webp",
      }),
      tags: ["국내", "바다"],
      days: [{
        id: "day-1",
        label: "Day 1",
        date: "07.10 금",
        dateValue: "2026-07-10",
        spots: [{
          id: "spot-1",
          name: "해운대",
          time: "11:40",
          lat: 35.1587,
          lng: 129.1604,
          mood: "바다",
          guide: "여기서 하루를 열었지.",
          reaction: "파도 좋다!",
          photos: [expect.objectContaining({
            id: "moment-1",
            label: "해운대 산책",
            src: "https://signed.example/display/trip-1/moment-1.webp",
            thumb: "https://signed.example/thumb/trip-1/moment-1.webp",
            content_hash: "hash-1",
            owner: "bara",
            original_status: "kept",
          })],
        }],
      }],
    }]);
    expect(state.regions.intl.trips).toEqual([]);
    expect(state.inbox).toEqual([expect.objectContaining({
      id: "inbox-1",
      kind: "noloc",
      date: "2026-07-11",
      time: "20:30",
      src: "https://signed.example/display/inbox/inbox-1.webp",
      thumb: "https://signed.example/thumb/inbox/inbox-1.webp",
      autoLabel: "저녁 사진",
      owner: "nyong",
    })]);
  });

  it("returns unchanged when the persisted version is not newer than since", async () => {
    const client = makeFetchClient({
      rows: {
        trips: [{
          id: "trip-1",
          region: "domestic",
          title: "부산 기록",
          start_date: "2026-07-10",
          date_label: "2026.07.10",
          tags: [],
          updated_at: "2026-07-12T00:00:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.fetchState(Date.parse("2026-07-12T00:00:00Z"))).resolves.toEqual({
      unchanged: true,
    });
  });

  it("skips signed URL work when the version is not newer than since", async () => {
    const client = makeFetchClient({
      rows: {
        inbox_items: [{
          id: "inbox-1",
          kind: "noloc",
          date: "2026-07-11",
          time: "20:30",
          display_path: "display/inbox/inbox-1.webp",
          thumb_path: "thumb/inbox/inbox-1.webp",
          content_hash: "hash-inbox",
          owner: "bara",
          original_status: "kept",
          updated_at: "2026-07-12T00:00:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const result = await adapter.fetchState(Date.parse("2026-07-12T00:00:00Z"));

    expect(result).toEqual({ unchanged: true });
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });
});

describe("supabaseAdapter incoming transfers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-07-21T01:02:03.000Z");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists only unexpired uploaded transfers for the active recipient", async () => {
    const client = makeFetchClient({
      rows: {
        transfer_queue: [
          transferRow(),
          transferRow({ id: "tr_expired", expires_at: "2026-07-21T01:02:03.000Z" }),
          transferRow({ id: "tr_landed", status: "landed" }),
          transferRow({ id: "tr_for_bara", dest_owner: "bara" }),
        ],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const result = await adapter.listIncomingTransfers("nyong");

    expect(result).toEqual([{
      id: "tr_hash-123",
      contentHash: "hash-123",
      sourceOwner: "bara",
      destinationOwner: "nyong",
      originalName: "gps.jpg",
      originalSize: 3,
      mimeType: "image/jpeg",
      expiresAt: "2026-07-28T01:02:03.000Z",
      createdAt: "2026-07-21T01:02:03.000Z",
    }]);
    expect(result[0]).not.toHaveProperty("tmpPath");
    expect(result[0]).not.toHaveProperty("tmp_path");
    const transferQuery = client.spies.queries.find(({ table }) => table === "transfer_queue")?.query;
    expect(transferQuery.eq).toHaveBeenCalledWith("dest_owner", "nyong");
    expect(transferQuery.eq).toHaveBeenCalledWith("status", "uploaded");
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects an unsupported logical recipient", async () => {
    const adapter = createSupabaseAdapter({ client: makeFetchClient() });

    await expect(adapter.listIncomingTransfers("shared"))
      .rejects.toThrow("사진 owner는 bara 또는 nyong이어야 해요");
  });

  it("requires a Supabase session before listing incoming transfers", async () => {
    const adapter = createSupabaseAdapter({ client: makeFetchClient({ user: null }) });

    await expect(adapter.listIncomingTransfers("nyong"))
      .rejects.toThrow("Supabase 로그인이 필요해요");
  });

  it("creates a five-minute download URL for the active recipient", async () => {
    const client = makeFetchClient({ rows: { transfer_queue: [transferRow()] } });
    const adapter = createSupabaseAdapter({ client });

    const result = await adapter.createIncomingTransferDownload("tr_hash-123", "nyong");

    expect(client.spies.createSignedUrl).toHaveBeenCalledWith(
      "relay-originals/user-123/tr_hash-123/gps.jpg",
      300,
      { download: "gps.jpg" },
    );
    expect(result).toEqual({
      transferId: "tr_hash-123",
      url: "https://signed.example/relay-originals/user-123/tr_hash-123/gps.jpg",
      filename: "gps.jpg",
      mimeType: "image/jpeg",
      size: 3,
      expiresAt: "2026-07-28T01:02:03.000Z",
    });
    expect(result).not.toHaveProperty("tmpPath");
    expect(result).not.toHaveProperty("tmp_path");
    const transferQuery = client.spies.queries.find(({ table }) => table === "transfer_queue")?.query;
    expect(transferQuery.eq).toHaveBeenCalledWith("id", "tr_hash-123");
    expect(transferQuery.eq).toHaveBeenCalledWith("dest_owner", "nyong");
    expect(transferQuery.eq).toHaveBeenCalledWith("status", "uploaded");
  });

  it("rejects an unsupported recipient before signing a download", async () => {
    const client = makeFetchClient({ rows: { transfer_queue: [transferRow()] } });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.createIncomingTransferDownload("tr_hash-123", "shared"))
      .rejects.toThrow("사진 owner는 bara 또는 nyong이어야 해요");
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });

  it("requires a Supabase session before signing a download", async () => {
    const client = makeFetchClient({ user: null, rows: { transfer_queue: [transferRow()] } });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.createIncomingTransferDownload("tr_hash-123", "nyong"))
      .rejects.toThrow("Supabase 로그인이 필요해요");
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", []],
    ["another recipient", [transferRow({ dest_owner: "bara" })]],
    ["non-uploaded", [transferRow({ status: "landed" })]],
  ])("rejects a %s transfer before signing", async (_label, transferRows) => {
    const client = makeFetchClient({ rows: { transfer_queue: transferRows } });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.createIncomingTransferDownload("tr_hash-123", "nyong"))
      .rejects.toThrow("받을 수 있는 원본 전송을 찾지 못했어요");
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects an expired transfer before signing", async () => {
    const client = makeFetchClient({
      rows: { transfer_queue: [transferRow({ expires_at: "2026-07-21T01:02:03.000Z" })] },
    });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.createIncomingTransferDownload("tr_hash-123", "nyong"))
      .rejects.toThrow("원본 전송이 만료되었어요");
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects a pathless transfer before signing", async () => {
    const client = makeFetchClient({
      rows: { transfer_queue: [transferRow({ tmp_path: " " })] },
    });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.createIncomingTransferDownload("tr_hash-123", "nyong"))
      .rejects.toThrow("원본 전송 경로가 없어요");
    expect(client.spies.createSignedUrl).not.toHaveBeenCalled();
  });

  it("surfaces a signed download URL failure", async () => {
    const relayPath = "relay-originals/user-123/tr_hash-123/gps.jpg";
    const client = makeFetchClient({
      rows: { transfer_queue: [transferRow()] },
      signedUrlErrors: { [relayPath]: { message: "signing unavailable" } },
    });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.createIncomingTransferDownload("tr_hash-123", "nyong"))
      .rejects.toThrow("Supabase 원본 다운로드 URL 생성 실패: signing unavailable");
  });
});

describe("supabaseAdapter record edits", () => {
  it("updates a trip title and returns refreshed state", async () => {
    const client = makeFetchClient({
      rows: {
        trips: [{
          id: "trip-1",
          region: "domestic",
          title: "새 부산 기록",
          start_date: "2026-07-10",
          date_label: "2026.07.10",
          tags: [],
          updated_at: "2026-07-12T00:00:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const state = await adapter.editTrip("trip-1", "새 부산 기록");

    expect(client.spies.updates[0]).toEqual({
      table: "trips",
      payload: { title: "새 부산 기록" },
      column: "id",
      value: "trip-1",
    });
    expect(state.regions.domestic.trips[0].title).toBe("새 부산 기록");
  });

  it("updates an allowed spot field and returns refreshed state", async () => {
    const client = makeFetchClient({
      rows: {
        trips: [{
          id: "trip-1",
          region: "domestic",
          title: "부산 기록",
          start_date: "2026-07-10",
          date_label: "2026.07.10",
          tags: [],
          updated_at: "2026-07-12T00:00:00Z",
        }],
        days: [{
          id: "day-1",
          trip_id: "trip-1",
          label: "Day 1",
          date_label: "07.10 금",
          sort_order: 1,
          updated_at: "2026-07-12T00:01:00Z",
        }],
        spots: [{
          id: "spot-1",
          day_id: "day-1",
          name: "해운대",
          time: "11:40",
          lat: 35.1587,
          lng: 129.1604,
          mood: "바다",
          guide: "새 가이드",
          reaction: "파도 좋다!",
          sort_order: 1,
          updated_at: "2026-07-12T00:02:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const state = await adapter.editSpot("spot-1", "guide", "새 가이드");

    expect(client.spies.updates[0]).toEqual({
      table: "spots",
      payload: { guide: "새 가이드" },
      column: "id",
      value: "spot-1",
    });
    expect(state.regions.domestic.trips[0].days[0].spots[0].guide).toBe("새 가이드");
  });

  it("rejects unsupported spot fields before calling Supabase", async () => {
    const client = makeFetchClient();
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.editSpot("spot-1", "owner", "nyong")).rejects.toThrow("수정할 수 없는 Spot 필드예요");
    expect(client.spies.updates).toEqual([]);
  });
});

describe("supabaseAdapter inbox edits", () => {
  it("keeps a located review item by returning it to unsorted", async () => {
    const client = makeFetchClient({
      rows: {
        inbox_items: [{
          id: "inbox-1",
          kind: "review",
          date: "2026-07-11",
          time: "20:30",
          lat: 37.5,
          lng: 127.0,
          display_path: "display/inbox/inbox-1.webp",
          thumb_path: "thumb/inbox/inbox-1.webp",
          auto_label: "검토 사진",
          content_hash: "hash-inbox",
          owner: "bara",
          original_status: "kept",
          blur: true,
          updated_at: "2026-07-12T00:00:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const state = await adapter.inboxKeep("inbox-1");

    expect(client.spies.updates[0]).toEqual({
      table: "inbox_items",
      payload: { kind: "unsorted", blur: false },
      column: "id",
      value: "inbox-1",
    });
    expect(state.inbox[0].id).toBe("inbox-1");
  });

  it("marks discarded inbox items pending and hides them from refreshed inbox state", async () => {
    const client = makeFetchClient({
      rows: {
        inbox_items: [{
          id: "inbox-1",
          kind: "review",
          date: "2026-07-11",
          time: "20:30",
          display_path: "display/inbox/inbox-1.webp",
          thumb_path: "thumb/inbox/inbox-1.webp",
          auto_label: "검토 사진",
          content_hash: "hash-inbox",
          owner: "bara",
          original_status: "discard_pending",
          blur: true,
          updated_at: "2026-07-12T00:00:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    const state = await adapter.inboxDiscard(["inbox-1"]);

    expect(client.spies.updates[0]).toEqual({
      table: "inbox_items",
      payload: { original_status: "discard_pending" },
      column: "id",
      value: ["inbox-1"],
    });
    expect(state.inbox).toEqual([]);
  });

  it("purges inbox item rows", async () => {
    const client = makeFetchClient();
    const adapter = createSupabaseAdapter({ client });

    await adapter.inboxPurge(["inbox-1", "inbox-2"]);

    expect(client.spies.deletes[0]).toEqual({
      table: "inbox_items",
      column: "id",
      value: ["inbox-1", "inbox-2"],
    });
  });
});

describe("supabaseAdapter.placePhotos", () => {
  it("moves inbox items into existing spot moments", async () => {
    const client = makeFetchClient({
      rows: {
        inbox_items: [{
          id: "inbox-1",
          kind: "unsorted",
          date: "2026-07-11",
          time: "20:30",
          taken_at: "2026-07-11T20:30:00Z",
          lat: 37.5,
          lng: 127.0,
          display_path: "display/inbox/inbox-1.webp",
          thumb_path: "thumb/inbox/inbox-1.webp",
          label: "원래 라벨",
          auto_label: "자동 라벨",
          ratio: "4/3",
          tint: "cool",
          content_hash: "hash-inbox",
          original_name: "photo.jpg",
          original_size: 1234,
          owner: "bara",
          original_status: "kept",
          updated_at: "2026-07-12T00:00:00Z",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    await adapter.placePhotos([{
      itemId: "inbox-1",
      tripId: "trip-1",
      spotId: "spot-1",
      memo: "사용자 메모",
      lat: 37.6,
      lng: 127.1,
    }]);

    expect(client.spies.inserts[0]).toEqual({
      table: "moments",
      payload: [expect.objectContaining({
        spot_id: "spot-1",
        display_path: "display/inbox/inbox-1.webp",
        thumb_path: "thumb/inbox/inbox-1.webp",
        label: "사용자 메모",
        ratio: "4/3",
        tint: "cool",
        content_hash: "hash-inbox",
        original_name: "photo.jpg",
        original_size: 1234,
        taken_at: "2026-07-11T20:30:00Z",
        lat: 37.6,
        lng: 127.1,
        owner: "bara",
        original_status: "kept",
      })],
    });
    expect(client.spies.deletes[0]).toEqual({
      table: "inbox_items",
      column: "id",
      value: ["inbox-1"],
    });
  });

  it("creates a new spot on the matching trip day before placing moments", async () => {
    const client = makeFetchClient({
      rows: {
        days: [{
          id: "day-1",
          trip_id: "trip-1",
          label: "Day 1",
          date_label: "07.11 토",
          date_value: "2026-07-11",
          sort_order: 0,
        }],
        inbox_items: [{
          id: "inbox-1",
          kind: "unsorted",
          date: "2026-07-11",
          time: "20:30",
          taken_at: "2026-07-11T20:30:00Z",
          lat: 37.5,
          lng: 127.0,
          display_path: "display/inbox/inbox-1.webp",
          thumb_path: "thumb/inbox/inbox-1.webp",
          auto_label: "자동 라벨",
          ratio: "4/3",
          tint: "cool",
          content_hash: "hash-inbox",
          original_name: "photo.jpg",
          original_size: 1234,
          owner: "bara",
          original_status: "kept",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    await adapter.placePhotos([{
      itemId: "inbox-1",
      tripId: "trip-1",
      spotId: "__new__",
      newSpotName: "새 장소",
      memo: "사용자 메모",
      line: { guide: "새 가이드", reaction: "새 반응" },
    }]);

    expect(client.spies.inserts[0]).toEqual({
      table: "spots",
      payload: [expect.objectContaining({
        id: "spot-inbox-1",
        day_id: "day-1",
        name: "새 장소",
        time: "20:30",
        lat: 37.5,
        lng: 127.0,
        mood: "우리 기록",
        guide: "새 가이드",
        reaction: "새 반응",
      })],
    });
    expect(client.spies.inserts[1]).toEqual({
      table: "moments",
      payload: [expect.objectContaining({
        spot_id: "spot-inbox-1",
        display_path: "display/inbox/inbox-1.webp",
        thumb_path: "thumb/inbox/inbox-1.webp",
        label: "사용자 메모",
        content_hash: "hash-inbox",
      })],
    });
    expect(client.spies.deletes[0]).toEqual({
      table: "inbox_items",
      column: "id",
      value: ["inbox-1"],
    });
  });
});

describe("supabaseAdapter.addTrip", () => {
  it("inserts a trip tree and removes source inbox items", async () => {
    const client = makeFetchClient({
      rows: {
        inbox_items: [{
          id: "inbox-1",
          display_path: "display/inbox/inbox-1.webp",
          thumb_path: "thumb/inbox/inbox-1.webp",
          content_hash: "hash-inbox",
          original_name: "photo.jpg",
          original_size: 1234,
          taken_at: "2026-07-11T20:30:00Z",
          lat: 37.5,
          lng: 127.0,
          owner: "bara",
        }],
      },
    });
    const adapter = createSupabaseAdapter({ client });

    await adapter.addTrip({
      id: "trip-1",
      region: "domestic",
      start: "2026-07-11",
      title: "새 여행",
      dateLabel: "2026.07.11 – 07.11",
      tags: ["국내", "새 여행"],
      _sourceIds: ["inbox-1"],
      days: [{
        label: "Day 1",
        date: "07.11 토",
        spots: [{
          id: "spot-1",
          name: "새 장소",
          time: "20:30",
          lat: 37.5,
          lng: 127.0,
          mood: "우리 기록",
          guide: "여기서의 기록이야.",
          reaction: "좋다!",
          photos: [{
            label: "사용자 메모",
            ratio: "4/3",
            tint: "cool",
            content_hash: "hash-inbox",
            owner: "bara",
            taken_at: "2026-07-11T20:30:00Z",
            lat: 37.5,
            lng: 127.0,
          }],
        }],
      }],
    });

    expect(client.spies.inserts[0]).toEqual({
      table: "trips",
      payload: [expect.objectContaining({
        id: "trip-1",
        region: "domestic",
        title: "새 여행",
        start_date: "2026-07-11",
        date_label: "2026.07.11 – 07.11",
        tags: ["국내", "새 여행"],
      })],
    });
    expect(client.spies.inserts[1]).toEqual({
      table: "days",
      payload: [expect.objectContaining({
        id: "trip-1-day-1",
        trip_id: "trip-1",
        label: "Day 1",
        date_label: "07.11 토",
        sort_order: 0,
      })],
    });
    expect(client.spies.inserts[2]).toEqual({
      table: "spots",
      payload: [expect.objectContaining({
        id: "spot-1",
        day_id: "trip-1-day-1",
        name: "새 장소",
        time: "20:30",
        lat: 37.5,
        lng: 127.0,
        mood: "우리 기록",
        guide: "여기서의 기록이야.",
        reaction: "좋다!",
        sort_order: 0,
      })],
    });
    expect(client.spies.inserts[3]).toEqual({
      table: "moments",
      payload: [expect.objectContaining({
        spot_id: "spot-1",
        display_path: "display/inbox/inbox-1.webp",
        thumb_path: "thumb/inbox/inbox-1.webp",
        label: "사용자 메모",
        content_hash: "hash-inbox",
        owner: "bara",
      })],
    });
    expect(client.spies.deletes[0]).toEqual({
      table: "inbox_items",
      column: "id",
      value: ["inbox-1"],
    });
  });

  it("persists day date_value so a later new-spot placement can match by date", async () => {
    const client = makeFetchClient({ rows: { inbox_items: [] } });
    const adapter = createSupabaseAdapter({ client });

    await adapter.addTrip({
      id: "trip-1",
      region: "domestic",
      start: "2026-07-11",
      title: "새 여행",
      dateLabel: "2026.07.11 – 07.11",
      tags: [],
      _sourceIds: [],
      days: [{ label: "Day 1", date: "07.11 토", dateValue: "2026-07-11", spots: [] }],
    });

    const daysInsert = client.spies.inserts.find((entry) => entry.table === "days");
    expect(daysInsert.payload[0]).toMatchObject({
      id: "trip-1-day-1",
      date_value: "2026-07-11",
    });
  });
});

describe("supabaseAdapter.uploadPhotos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T01:02:03.000Z"));
  });

  it("requires a signed-in Supabase user", async () => {
    const client = makeUploadClient({ user: null });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.uploadPhotos([], "bara")).rejects.toThrow("Supabase 로그인이 필요해요");
  });

  it("uploads temporary originals and records GPS metadata", async () => {
    const client = makeUploadClient();
    const adapter = createSupabaseAdapter({ client, prepareUploadItem: null });
    const onProgress = vi.fn();
    const bytes = new Uint8Array([1, 2, 3]);
    const file = new File([bytes], "gps.jpg", { type: "image/jpeg", lastModified: 1719705600000 });

    const result = await adapter.uploadPhotos([{
      file,
      bytes,
      name: "gps.jpg",
      mimeType: "image/jpeg",
      size: 3,
      takenAt: "2026-06-25T10:11:12",
      lat: 37.5,
      lng: 127.0,
      source: "capacitor-photos",
    }], "bara", onProgress);

    expect(client.storage.from).toHaveBeenCalledWith("photos");
    expect(client.spies.upload).toHaveBeenCalledWith(
      "test-originals/user-123/20260625T010203000Z/001-gps.jpg",
      bytes,
      { contentType: "image/jpeg", upsert: false },
    );
    expect(client.from).toHaveBeenCalledWith("test_uploads");
    expect(client.spies.insert).toHaveBeenCalledWith([expect.objectContaining({
      owner: "bara",
      user_id: "user-123",
      upload_session_id: "20260625T010203000Z",
      storage_path: "test-originals/user-123/20260625T010203000Z/001-gps.jpg",
      lat: 37.5,
      lng: 127.0,
      source: "capacitor-photos",
    })]);
    expect(result.added[0]).toMatchObject({
      lat: 37.5,
      lng: 127.0,
      src: "https://signed.example/photo.jpg",
      autoLabel: "Supabase test original",
    });
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it.each([
    {
      path: "display/hash-123.webp",
      message: "Supabase display signed URL 생성 실패: signing unavailable",
    },
    {
      path: "thumb/hash-123.webp",
      message: "Supabase thumb signed URL 생성 실패: signing unavailable",
    },
  ])("does not upload a relay original when signing $path fails", async ({ path, message }) => {
    const client = makeUploadClient({
      signedUrlErrors: {
        [path]: { message: "signing unavailable" },
      },
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara")).rejects.toThrow(message);

    expect(client.spies.uploads.map(({ path }) => path)).toEqual([
      "display/hash-123.webp",
      "thumb/hash-123.webp",
    ]);
    expect(client.spies.inserts).toEqual([]);
  });

  it("uploads prepared derivatives and a seven-day original relay from bara to nyong", async () => {
    const client = makeUploadClient();
    const prepareUploadItem = vi.fn().mockResolvedValue(preparedUpload());
    const adapter = createSupabaseAdapter({ client, prepareUploadItem });
    const file = new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" });
    const onProgress = vi.fn();

    const result = await adapter.uploadPhotos([file], "bara", onProgress);

    expect(prepareUploadItem).toHaveBeenCalledWith(expect.objectContaining({ file }), 0);
    expect(client.spies.upload).toHaveBeenCalledWith(
      "display/hash-123.webp",
      expect.any(Blob),
      { contentType: "image/webp", upsert: false },
    );
    expect(client.spies.upload).toHaveBeenCalledWith(
      "thumb/hash-123.webp",
      expect.any(Blob),
      { contentType: "image/webp", upsert: false },
    );
    expect(client.spies.upload).toHaveBeenCalledWith(
      "relay-originals/user-123/tr_hash-123/gps.jpg",
      file,
      { contentType: "image/jpeg", upsert: false },
    );
    expect(client.from).toHaveBeenCalledWith("inbox_items");
    expect(client.spies.inserts).toEqual([
      {
        table: "inbox_items",
        payload: [expect.objectContaining({
          id: "ib_hash-123",
          kind: "unsorted",
          date: "2026-06-25",
          time: "10:11",
          taken_at: "2026-06-25T10:11:12Z",
          lat: 37.5,
          lng: 127.0,
          display_path: "display/hash-123.webp",
          thumb_path: "thumb/hash-123.webp",
          auto_label: "gps",
          ratio: "4/3",
          tint: "cool",
          content_hash: "hash-123",
          original_name: "gps.jpg",
          original_size: 3,
          owner: "bara",
          original_status: "kept",
        })],
      },
      {
        table: "transfer_queue",
        payload: [expect.objectContaining({
          id: "tr_hash-123",
          user_id: "user-123",
          content_hash: "hash-123",
          source_owner: "bara",
          dest_owner: "nyong",
          tmp_path: "relay-originals/user-123/tr_hash-123/gps.jpg",
          original_name: "gps.jpg",
          original_size: 3,
          mime_type: "image/jpeg",
          status: "uploaded",
          expires_at: "2026-07-02T01:02:03.000Z",
        })],
      },
    ]);
    expect(client.spies.operations.map(({ type, path, table }) => ({ type, path, table }))).toEqual([
      { type: "upload", path: "display/hash-123.webp", table: undefined },
      { type: "upload", path: "thumb/hash-123.webp", table: undefined },
      { type: "upload", path: "relay-originals/user-123/tr_hash-123/gps.jpg", table: undefined },
      { type: "insert", path: undefined, table: "inbox_items" },
      { type: "insert", path: undefined, table: "transfer_queue" },
    ]);
    expect(result.added[0]).toMatchObject({
      id: "ib_hash-123",
      kind: "unsorted",
      src: "https://signed.example/photo.jpg",
      thumb: "https://signed.example/photo.jpg",
      content_hash: "hash-123",
      owner: "bara",
    });
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("stops before persistence when the relay original upload fails", async () => {
    const relayPath = "relay-originals/user-123/tr_hash-123/gps.jpg";
    const client = makeUploadClient({
      uploadErrors: {
        [relayPath]: { message: "relay unavailable" },
      },
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });
    const onProgress = vi.fn();

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara", onProgress)).rejects.toThrow(
      "Supabase relay original 업로드 실패: relay unavailable",
    );

    expect(client.spies.uploads.map(({ path }) => path)).toEqual([
      "display/hash-123.webp",
      "thumb/hash-123.webp",
      relayPath,
    ]);
    expect(client.spies.inserts).toEqual([]);
    expect(onProgress).not.toHaveBeenCalled();
    expect(client.spies.remove).not.toHaveBeenCalled();
  });

  it("routes a nyong original relay to bara", async () => {
    const client = makeUploadClient();
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });

    await adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "nyong");

    expect(client.spies.inserts.find(({ table }) => table === "transfer_queue")?.payload)
      .toEqual([expect.objectContaining({ source_owner: "nyong", dest_owner: "bara" })]);
  });

  it("removes the relay original when the inbox insert fails", async () => {
    const client = makeUploadClient({
      insertErrors: { inbox_items: { message: "inbox unavailable" } },
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });
    const onProgress = vi.fn();

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara", onProgress)).rejects.toThrow("Supabase inbox_items 기록 실패: inbox unavailable");

    expect(client.spies.remove).toHaveBeenCalledWith([
      "relay-originals/user-123/tr_hash-123/gps.jpg",
    ]);
    expect(client.spies.inserts.map(({ table }) => table)).toEqual(["inbox_items"]);
    expect(client.spies.deletes).toEqual([]);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("preserves the inbox insert error when relay removal rejects", async () => {
    const client = makeUploadClient({
      insertErrors: { inbox_items: { message: "inbox unavailable" } },
      removeReject: new Error("remove rejected"),
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara")).rejects.toThrow("Supabase inbox_items 기록 실패: inbox unavailable");

    expect(client.spies.remove).toHaveBeenCalledWith([
      "relay-originals/user-123/tr_hash-123/gps.jpg",
    ]);
  });

  it("deletes the inbox row and relay original when the transfer insert fails", async () => {
    const client = makeUploadClient({
      insertErrors: { transfer_queue: { message: "transfer unavailable" } },
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });
    const onProgress = vi.fn();

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara", onProgress)).rejects.toThrow("Supabase transfer_queue 기록 실패: transfer unavailable");

    expect(client.spies.deletes).toEqual([{
      table: "inbox_items",
      column: "id",
      value: "ib_hash-123",
    }]);
    expect(client.spies.remove).toHaveBeenCalledWith([
      "relay-originals/user-123/tr_hash-123/gps.jpg",
    ]);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("preserves the transfer insert error when cleanup returns errors", async () => {
    const client = makeUploadClient({
      insertErrors: { transfer_queue: { message: "transfer unavailable" } },
      deleteError: { message: "delete unavailable" },
      removeError: { message: "remove unavailable" },
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara")).rejects.toThrow("Supabase transfer_queue 기록 실패: transfer unavailable");

    expect(client.spies.deletes).toEqual([{
      table: "inbox_items",
      column: "id",
      value: "ib_hash-123",
    }]);
    expect(client.spies.remove).toHaveBeenCalledWith([
      "relay-originals/user-123/tr_hash-123/gps.jpg",
    ]);
  });

  it("preserves the transfer insert error and continues cleanup when inbox deletion rejects", async () => {
    const client = makeUploadClient({
      insertErrors: { transfer_queue: { message: "transfer unavailable" } },
      deleteReject: new Error("delete rejected"),
    });
    const adapter = createSupabaseAdapter({
      client,
      prepareUploadItem: vi.fn().mockResolvedValue(preparedUpload()),
    });

    await expect(adapter.uploadPhotos([
      new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" }),
    ], "bara")).rejects.toThrow("Supabase transfer_queue 기록 실패: transfer unavailable");

    expect(client.spies.remove).toHaveBeenCalledWith([
      "relay-originals/user-123/tr_hash-123/gps.jpg",
    ]);
  });
});
