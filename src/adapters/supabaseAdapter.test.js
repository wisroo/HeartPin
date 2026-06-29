import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTestOriginalPath, createSupabaseAdapter } from "./supabaseAdapter.js";

function makeClient({ user = { id: "user-123" }, uploadError = null, insertError = null } = {}) {
  const upload = vi.fn().mockResolvedValue({ data: { path: "uploaded" }, error: uploadError });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example/photo.jpg" }, error: null });
  const insert = vi.fn().mockResolvedValue({ data: null, error: insertError });
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: user ? { user } : null }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({ upload, createSignedUrl }),
    },
    from: vi.fn().mockReturnValue({ insert }),
    spies: { upload, createSignedUrl, insert },
  };
}

describe("buildTestOriginalPath", () => {
  it("scopes temporary originals by user and session", () => {
    expect(buildTestOriginalPath("user-123", "session-abc", { name: "서울 여행 1.JPG" }))
      .toBe("test-originals/user-123/session-abc/1.jpg");
  });
});

describe("supabaseAdapter.uploadPhotos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T01:02:03.000Z"));
  });

  it("requires a signed-in Supabase user", async () => {
    const client = makeClient({ user: null });
    const adapter = createSupabaseAdapter({ client });

    await expect(adapter.uploadPhotos([], "bara")).rejects.toThrow("Supabase 로그인이 필요해요");
  });

  it("uploads temporary originals and records GPS metadata", async () => {
    const client = makeClient();
    const adapter = createSupabaseAdapter({ client });
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
      "test-originals/user-123/20260625T010203000Z/gps.jpg",
      bytes,
      { contentType: "image/jpeg", upsert: false },
    );
    expect(client.from).toHaveBeenCalledWith("test_uploads");
    expect(client.spies.insert).toHaveBeenCalledWith([expect.objectContaining({
      owner: "bara",
      user_id: "user-123",
      upload_session_id: "20260625T010203000Z",
      storage_path: "test-originals/user-123/20260625T010203000Z/gps.jpg",
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
});
