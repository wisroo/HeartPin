import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect } from "vitest";
import PickSide from "./PickSide.jsx";

test("calls onPick with the chosen character", () => {
  const onPick = vi.fn();
  render(<PickSide settings={{ nameBara: "바라", nameNyong: "뇽이" }} onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: /뇽이/ }));
  expect(onPick).toHaveBeenCalledWith("nyong");
});
