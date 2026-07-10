import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, test, expect } from "vitest";

vi.mock("../../api.js", async (orig) => ({
  ...(await orig()),
  uploadPhotos: vi.fn().mockResolvedValue({
    state: {},
    added: [{ id: "x", lat: null, lng: null, time: "12:00", date: "2025-10-11", autoLabel: "테스트", src: "" }],
    duplicates: [],
  }),
}));

import UploadSheet from "./UploadSheet.jsx";

const mkApp = () => ({
  regions: { domestic: { trips: [] }, intl: { trips: [] } },
  apply: vi.fn(),
  inboxItems: [],
});

test("renders the picker step with the bara prompt", () => {
  render(
    <UploadSheet app={mkApp()} nav={{ close: vi.fn(), toast: vi.fn() }} settings={{ myChar: "bara" }} />
  );
  expect(screen.getByText(/그냥 다 골라줘/)).toBeInTheDocument();
});

test("picking a file enables the upload CTA", () => {
  const { container } = render(
    <UploadSheet app={mkApp()} nav={{ close: vi.fn(), toast: vi.fn() }} settings={{ myChar: "bara" }} />
  );
  // CTA starts disabled with 0 selected
  const cta = screen.getByRole("button", { name: /올리고 정리하기/ });
  expect(cta).toBeDisabled();

  const input = container.querySelector('input[type="file"][multiple]');
  expect(input).toBeTruthy();
  const file = new File(["x"], "p1.jpg", { type: "image/jpeg" });
  fireEvent.change(input, { target: { files: [file] } });

  expect(screen.getByRole("button", { name: /올리고 정리하기/ })).not.toBeDisabled();
});

test("start() uploads then ends with toast + close (no photos to confirm)", async () => {
  const api = await import("../../api.js");
  api.uploadPhotos.mockResolvedValueOnce({ state: {}, added: [], duplicates: [] });
  const app = mkApp();
  const nav = { close: vi.fn(), toast: vi.fn() };
  const { container } = render(<UploadSheet app={app} nav={nav} settings={{ myChar: "bara" }} />);

  const input = container.querySelector('input[type="file"][multiple]');
  fireEvent.change(input, { target: { files: [new File(["x"], "p1.jpg", { type: "image/jpeg" })] } });
  fireEvent.click(screen.getByRole("button", { name: /올리고 정리하기/ }));

  await waitFor(() => expect(nav.close).toHaveBeenCalled());
  expect(api.uploadPhotos).toHaveBeenCalled();
  // owner is settings.myChar
  expect(api.uploadPhotos.mock.calls[0][1]).toBe("bara");
});
