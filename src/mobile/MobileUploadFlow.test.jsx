import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileUploadFlow from "./MobileUploadFlow.jsx";
import { pickPhotos } from "../platform/media/mediaPicker.js";
import * as api from "../api.js";

vi.mock("../platform/media/mediaPicker.js", () => ({
  pickPhotos: vi.fn(),
}));

vi.mock("../api.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadPhotos: vi.fn(),
  };
});

const props = {
  onApplyState: vi.fn(),
  onOpenMap: vi.fn(),
  hasTrips: false,
  inboxCount: 0,
  onOpenInbox: vi.fn(),
};

describe("MobileUploadFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("hp-owner", "bara");
    pickPhotos.mockResolvedValue([]);
    api.uploadPhotos.mockResolvedValue({
      state: { version: 1, regions: {}, inbox: [] },
      duplicates: [],
      added: [],
    });
  });

  it("uses the media picker for camera roll selection", async () => {
    render(<MobileUploadFlow {...props} />);

    fireEvent.click(screen.getByText("오늘 사진 올리기 →"));
    fireEvent.click(screen.getByRole("button", { name: /카메라롤/ }));

    await waitFor(() => {
      expect(pickPhotos).toHaveBeenCalledWith({ source: "library", multiple: true });
    });
  });

  it("passes picked media metadata to the upload API", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "gps.jpg", { type: "image/jpeg" });
    const mediaItem = {
      file,
      bytes: new Uint8Array([1, 2, 3]),
      name: "gps.jpg",
      mimeType: "image/jpeg",
      size: 3,
      takenAt: "2026-06-25T10:11:12",
      lat: 37.5,
      lng: 127.0,
      source: "capacitor-photos",
    };
    pickPhotos.mockResolvedValue([mediaItem]);

    render(<MobileUploadFlow {...props} />);

    fireEvent.click(screen.getByText("오늘 사진 올리기 →"));
    fireEvent.click(screen.getByRole("button", { name: /카메라롤/ }));
    await screen.findByText("1장 선택");
    fireEvent.click(screen.getByText("1장 올리고 정리하기 →"));

    await waitFor(() => {
      expect(api.uploadPhotos).toHaveBeenCalledWith([mediaItem], "bara", expect.any(Function));
    });
  });
});
