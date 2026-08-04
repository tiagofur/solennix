import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePwaInstall } from "./usePwaInstall";

describe("usePwaInstall", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)" ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not show by default without bip or iOS", () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.show).toBe(false);
  });

  it("shows after beforeinstallprompt and can prompt", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });
    const { result } = renderHook(() => usePwaInstall());

    await act(async () => {
      const event = new Event("beforeinstallprompt") as Event & {
        prompt: typeof prompt;
        userChoice: typeof userChoice;
        preventDefault: () => void;
      };
      Object.assign(event, { prompt, userChoice, preventDefault: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(result.current.show).toBe(true);
    expect(result.current.canPromptNative).toBe(true);

    let accepted = false;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });
    expect(prompt).toHaveBeenCalled();
    expect(accepted).toBe(true);
  });

  it("hides after dismiss and persists preference", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: "dismissed" as const, platform: "web" });
    const { result } = renderHook(() => usePwaInstall());

    await act(async () => {
      const event = new Event("beforeinstallprompt") as Event & {
        prompt: typeof prompt;
        userChoice: typeof userChoice;
        preventDefault: () => void;
      };
      Object.assign(event, { prompt, userChoice, preventDefault: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(result.current.show).toBe(true);
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.show).toBe(false);
    expect(localStorage.getItem("solennix.pwa_install_dismissed_at")).toBeTruthy();
  });

  it("does not show when already standalone", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.show).toBe(false);
  });
});
