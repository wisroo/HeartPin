import { renderHook, act } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";

vi.mock("../api.js", () => ({ getApiMode: vi.fn(), signInToSupabase: vi.fn() }));
import * as api from "../api.js";
import { useAuth } from "./useAuth.js";

beforeEach(() => { api.getApiMode.mockReset(); api.signInToSupabase.mockReset(); });

test("local mode never needs login", () => {
  api.getApiMode.mockReturnValue("local");
  const { result } = renderHook(() => useAuth());
  expect(result.current.needsLogin).toBe(false);
});

test("supabase mode needs login until signIn resolves", async () => {
  api.getApiMode.mockReturnValue("supabase");
  api.signInToSupabase.mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuth());
  expect(result.current.needsLogin).toBe(true);
  await act(() => result.current.signIn("a@b.c", "pw"));
  expect(result.current.needsLogin).toBe(false);
});
