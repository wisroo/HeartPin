import { beforeEach, describe, expect, test, vi } from "vitest";

const supabaseDouble = vi.hoisted(() => {
  const transferFixture = {
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
    expires_at: "2099-07-28T01:02:03.000Z",
    created_at: "2026-07-21T01:02:03.000Z",
  };
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://signed.example/original" },
    error: null,
  });
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const rpc = vi.fn().mockResolvedValue({
    data: {
      ...transferFixture,
      status: "landed",
      landed_location: "nyong_phone",
    },
    error: null,
  });

  function transferQuery() {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      order: vi.fn().mockResolvedValue({
        data: [transferFixture],
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: transferFixture,
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => {
        const mutation = {
          eq: vi.fn(() => mutation),
          select: vi.fn(() => mutation),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: transferFixture.id },
            error: null,
          }),
        };
        return mutation;
      }),
    };
  }

  return {
    createSignedUrl,
    remove,
    rpc,
    client: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "user-123" } } },
          error: null,
        }),
      },
      rpc,
      from: vi.fn(() => transferQuery()),
      storage: {
        from: vi.fn(() => ({ createSignedUrl, remove })),
      },
    },
  };
});

vi.mock("./adapters/supabaseClient.js", () => ({
  createSupabaseClient: vi.fn(() => supabaseDouble.client),
}));

async function loadApi(mode) {
  vi.resetModules();
  vi.stubEnv("VITE_HEARTPIN_API_MODE", mode);
  return import("./api.js");
}

beforeEach(() => {
  vi.unstubAllEnvs();
  supabaseDouble.createSignedUrl.mockClear();
  supabaseDouble.remove.mockClear();
  supabaseDouble.rpc.mockClear();
  supabaseDouble.client.auth.getSession.mockClear();
  supabaseDouble.client.from.mockClear();
  supabaseDouble.client.storage.from.mockClear();
});

describe("recipient transfer API seam", () => {
  test("Supabase mode lists incoming transfers and creates a download", async () => {
    const api = await loadApi("supabase");

    await expect(api.listIncomingTransfers("nyong")).resolves.toEqual([
      {
        id: "tr_hash-123",
        contentHash: "hash-123",
        sourceOwner: "bara",
        destinationOwner: "nyong",
        originalName: "gps.jpg",
        originalSize: 3,
        mimeType: "image/jpeg",
        expiresAt: "2099-07-28T01:02:03.000Z",
        createdAt: "2026-07-21T01:02:03.000Z",
      },
    ]);
    await expect(
      api.createIncomingTransferDownload("tr_hash-123", "nyong"),
    ).resolves.toEqual({
      transferId: "tr_hash-123",
      url: "https://signed.example/original",
      filename: "gps.jpg",
      mimeType: "image/jpeg",
      size: 3,
      expiresAt: "2099-07-28T01:02:03.000Z",
    });
    expect(supabaseDouble.createSignedUrl).toHaveBeenCalledWith(
      "relay-originals/user-123/tr_hash-123/gps.jpg",
      300,
      { download: "gps.jpg" },
    );
    await expect(
      api.confirmIncomingTransferSaved("tr_hash-123", "nyong", "nyong_phone"),
    ).resolves.toEqual({
      transferId: "tr_hash-123",
      status: "deleted",
      location: "nyong_phone",
    });
    expect(supabaseDouble.remove).toHaveBeenCalledWith([
      "relay-originals/user-123/tr_hash-123/gps.jpg",
    ]);
    expect(supabaseDouble.rpc).toHaveBeenCalledWith(
      "confirm_incoming_transfer_landed",
      {
        p_transfer_id: "tr_hash-123",
        p_owner: "nyong",
        p_location: "nyong_phone",
      },
    );
  });

  test("local mode rejects recipient transfer operations explicitly", async () => {
    const api = await loadApi("local");

    expect(() => api.listIncomingTransfers("nyong"))
      .toThrow("Supabase 모드에서만 원본 전송을 받을 수 있어요.");
    expect(() => api.createIncomingTransferDownload("tr_hash-123", "nyong"))
      .toThrow("Supabase 모드에서만 원본 전송을 받을 수 있어요.");
    expect(() => api.confirmIncomingTransferSaved(
      "tr_hash-123",
      "nyong",
      "nyong_phone",
    )).toThrow("Supabase 모드에서만 원본 전송 저장을 확인할 수 있어요.");
  });
});
