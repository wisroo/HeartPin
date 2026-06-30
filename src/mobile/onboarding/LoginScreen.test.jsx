import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, test, expect } from "vitest";
import LoginScreen from "./LoginScreen.jsx";

test("submits credentials via onSignIn", async () => {
  const onSignIn = vi.fn().mockResolvedValue();
  render(<LoginScreen onSignIn={onSignIn} settings={{ nameBara: "바라", nameNyong: "뇽이" }} />);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@b.c" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "pw" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  await waitFor(() => expect(onSignIn).toHaveBeenCalledWith("a@b.c", "pw"));
});

test("shows error message on failed sign-in", async () => {
  const onSignIn = vi.fn().mockRejectedValue(new Error("로그인 실패"));
  render(<LoginScreen onSignIn={onSignIn} settings={{ nameBara: "바라", nameNyong: "뇽이" }} />);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@b.c" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "x" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByText("로그인 실패")).toBeInTheDocument();
});
