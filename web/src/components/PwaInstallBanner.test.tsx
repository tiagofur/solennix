import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@tests/customRender";
import { PwaInstallBanner } from "./PwaInstallBanner";

describe("PwaInstallBanner (#1132)", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
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

  it("renders nothing without install signal", () => {
    render(<PwaInstallBanner />);
    expect(screen.queryByTestId("pwa-install-banner")).not.toBeInTheDocument();
  });

  it("shows install CTA after beforeinstallprompt and dismisses", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });

    render(<PwaInstallBanner />);

    await act(async () => {
      const event = new Event("beforeinstallprompt") as Event & {
        prompt: typeof prompt;
        userChoice: typeof userChoice;
        preventDefault: () => void;
      };
      Object.assign(event, { prompt, userChoice, preventDefault: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId("pwa-install-banner")).toBeInTheDocument();
    expect(screen.getByTestId("pwa-install-button")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("pwa-install-dismiss"));
    expect(screen.queryByTestId("pwa-install-banner")).not.toBeInTheDocument();
  });
});
