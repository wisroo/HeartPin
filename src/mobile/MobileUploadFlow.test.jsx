import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileUploadFlow from "./MobileUploadFlow.jsx";
import { pickPhotos } from "../platform/media/mediaPicker.js";

vi.mock("../platform/media/mediaPicker.js", () => ({
  pickPhotos: vi.fn(),
}));

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
  });

  it("uses the media picker for camera roll selection", async () => {
    render(<MobileUploadFlow {...props} />);

    fireEvent.click(screen.getByText("오늘 사진 올리기 →"));
    fireEvent.click(screen.getByRole("button", { name: /카메라롤/ }));

    await waitFor(() => {
      expect(pickPhotos).toHaveBeenCalledWith({ source: "library", multiple: true });
    });
  });
});
