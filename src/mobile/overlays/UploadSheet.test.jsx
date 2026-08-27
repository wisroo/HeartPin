import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("../../platform/media/mediaPicker.js", () => ({
  pickPhotos: vi.fn(),
}));

vi.mock("../../api.js", async (orig) => ({
  ...(await orig()),
  uploadPhotos: vi.fn(),
}));

import * as api from "../../api.js";
import { pickPhotos } from "../../platform/media/mediaPicker.js";
import UploadSheet from "./UploadSheet.jsx";

const mkApp = () => ({
  regions: { domestic: { trips: [] }, intl: { trips: [] } },
  apply: vi.fn(),
  inboxItems: [],
});

const makeItem = (name, source = "library") => {
  const file = new File([name], name, { type: "image/jpeg", lastModified: 123 });
  return {
    file,
    bytes: new Uint8Array([1, 2, 3]),
    name,
    mimeType: "image/jpeg",
    size: file.size,
    lastModified: 123,
    takenAt: null,
    lat: null,
    lng: null,
    source,
  };
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const renderSheet = (props = {}) => {
  const app = props.app || mkApp();
  const nav = props.nav || { close: vi.fn(), toast: vi.fn() };
  const sheet = <UploadSheet app={app} nav={nav} settings={{ myChar: "bara" }} />;
  const result = render(props.strict ? <StrictMode>{sheet}</StrictMode> : sheet);
  return { app, nav, ...result };
};

beforeEach(() => {
  vi.clearAllMocks();
  pickPhotos.mockResolvedValue([]);
  api.uploadPhotos.mockResolvedValue({ state: {}, added: [], duplicates: [] });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file) => `blob:${file.name}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

test("renders the picker step with the bara prompt", () => {
  renderSheet();

  expect(screen.getByText(/그냥 다 골라줘/)).toBeInTheDocument();
});

test("opens the library picker with multi-select enabled", async () => {
  renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  await waitFor(() => {
    expect(pickPhotos).toHaveBeenCalledWith({ source: "library", multiple: true });
  });
});

test("opens the camera picker in single-photo mode", async () => {
  renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "바로 찍기" }));

  await waitFor(() => {
    expect(pickPhotos).toHaveBeenCalledWith({ source: "camera", multiple: false });
  });
});

test("serializes competing picker taps and releases the guard after cancellation", async () => {
  const selection = deferred();
  pickPhotos.mockReturnValueOnce(selection.promise);
  renderSheet();

  const libraryButton = screen.getByRole("button", { name: "카메라롤" });
  const cameraButton = screen.getByRole("button", { name: "바로 찍기" });
  fireEvent.click(libraryButton);
  fireEvent.click(cameraButton);

  expect(pickPhotos).toHaveBeenCalledTimes(1);
  expect(pickPhotos).toHaveBeenCalledWith({ source: "library", multiple: true });
  expect(libraryButton).toBeDisabled();
  expect(cameraButton).toBeDisabled();

  selection.resolve([]);
  await waitFor(() => expect(libraryButton).not.toBeDisabled());
  expect(cameraButton).not.toBeDisabled();

  fireEvent.click(cameraButton);
  await waitFor(() => expect(pickPhotos).toHaveBeenCalledTimes(2));
  expect(pickPhotos).toHaveBeenLastCalledWith({ source: "camera", multiple: false });
});

test("releases the picker guard after rejection and a successful retry clears the error", async () => {
  const retryItem = makeItem("retry.jpg", "camera");
  pickPhotos
    .mockRejectedValueOnce(new Error("사진 접근 권한이 필요해요"))
    .mockResolvedValueOnce([retryItem]);
  renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  expect(await screen.findByText(/사진 접근 권한이 필요해요/)).toHaveClass("hpm-err");
  expect(screen.getByRole("button", { name: "카메라롤" })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "바로 찍기" })).not.toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "바로 찍기" }));

  await screen.findByText("1장 선택");
  expect(document.querySelector(".hpm-err")).not.toBeInTheDocument();
  expect(pickPhotos).toHaveBeenCalledTimes(2);
});

test("a picked photo creates a selected preview and enables upload", async () => {
  const item = makeItem("photo-one.jpg");
  pickPhotos.mockResolvedValueOnce([item]);
  renderSheet();

  const cta = screen.getByRole("button", { name: /올리고 정리하기/ });
  expect(cta).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  await waitFor(() => expect(screen.getByText("1장 선택")).toBeInTheDocument());
  expect(URL.createObjectURL).toHaveBeenCalledWith(item.file);
  expect(cta).not.toBeDisabled();
});

test("creates one preview URL when React StrictMode checks state updates", async () => {
  const item = makeItem("strict-mode.jpg");
  pickPhotos.mockResolvedValueOnce([item]);
  renderSheet({ strict: true });

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  await screen.findByText("1장 선택");
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(URL.createObjectURL).toHaveBeenCalledWith(item.file);
});

test("reopening the picker accumulates another photo", async () => {
  pickPhotos
    .mockResolvedValueOnce([makeItem("photo-one.jpg")])
    .mockResolvedValueOnce([makeItem("photo-two.jpg")]);
  renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  await screen.findByText("1장 선택");
  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  expect(await screen.findByText("2장 선택")).toBeInTheDocument();
});

test("does not add a duplicate with the same name and size", async () => {
  pickPhotos
    .mockResolvedValueOnce([makeItem("photo-one.jpg")])
    .mockResolvedValueOnce([makeItem("photo-one.jpg")]);
  renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  await screen.findByText("1장 선택");
  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  await waitFor(() => expect(pickPhotos).toHaveBeenCalledTimes(2));
  expect(screen.getByText("1장 선택")).toBeInTheDocument();
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
});

test("an empty picker result keeps the sheet open without an error or upload", async () => {
  const { nav } = renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  await waitFor(() => expect(pickPhotos).toHaveBeenCalledTimes(1));
  expect(screen.getByText("사진 올리기")).toBeInTheDocument();
  expect(document.querySelector(".hpm-err")).not.toBeInTheDocument();
  expect(api.uploadPhotos).not.toHaveBeenCalled();
  expect(nav.close).not.toHaveBeenCalled();
});

test("a picker rejection shows its message without uploading", async () => {
  pickPhotos.mockRejectedValueOnce(new Error("사진 접근 권한이 필요해요"));
  renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));

  expect(await screen.findByText(/사진 접근 권한이 필요해요/)).toHaveClass("hpm-err");
  expect(api.uploadPhotos).not.toHaveBeenCalled();
});

test("uploading passes the selected normalized items and bara owner", async () => {
  const item = makeItem("photo-one.jpg");
  pickPhotos.mockResolvedValueOnce([item]);
  const { nav } = renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  await screen.findByText("1장 선택");
  fireEvent.click(screen.getByRole("button", { name: /1장 올리고 정리하기/ }));

  await waitFor(() => expect(nav.close).toHaveBeenCalled());
  const [items, owner, onProgress] = api.uploadPhotos.mock.calls[0];
  expect(items).toHaveLength(1);
  expect(items[0]).toBe(item);
  expect(owner).toBe("bara");
  expect(onProgress).toEqual(expect.any(Function));
});

test("a successful zero-added upload revokes every preview before closing", async () => {
  pickPhotos.mockResolvedValueOnce([
    makeItem("photo-one.jpg"),
    makeItem("photo-two.jpg"),
  ]);
  const { nav } = renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  await screen.findByText("2장 선택");
  fireEvent.click(screen.getByRole("button", { name: /2장 올리고 정리하기/ }));

  await waitFor(() => expect(nav.close).toHaveBeenCalledTimes(1));
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(URL.revokeObjectURL).toHaveBeenNthCalledWith(1, "blob:photo-one.jpg");
  expect(URL.revokeObjectURL).toHaveBeenNthCalledWith(2, "blob:photo-two.jpg");
});

test("closing the sheet revokes every created preview URL", async () => {
  pickPhotos.mockResolvedValueOnce([
    makeItem("photo-one.jpg"),
    makeItem("photo-two.jpg"),
  ]);
  const { nav } = renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  await screen.findByText("2장 선택");
  fireEvent.click(screen.getByRole("button", { name: "✕" }));

  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(URL.revokeObjectURL).toHaveBeenNthCalledWith(1, "blob:photo-one.jpg");
  expect(URL.revokeObjectURL).toHaveBeenNthCalledWith(2, "blob:photo-two.jpg");
  expect(nav.close).toHaveBeenCalledTimes(1);
});

test("external unmount revokes each created preview exactly once", async () => {
  pickPhotos.mockResolvedValueOnce([makeItem("photo-one.jpg")]);
  const { unmount } = renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  await screen.findByText("1장 선택");
  unmount();

  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-one.jpg");
});

test("a picker resolving after unmount creates no preview or state update", async () => {
  const selection = deferred();
  pickPhotos.mockReturnValueOnce(selection.promise);
  const { unmount } = renderSheet();

  fireEvent.click(screen.getByRole("button", { name: "카메라롤" }));
  unmount();
  selection.resolve([makeItem("late-photo.jpg")]);

  await selection.promise;
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
});
