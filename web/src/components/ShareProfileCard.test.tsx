import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@tests/customRender";
import { ShareProfileCard } from "./ShareProfileCard";

// Mock useAuth (provider user).
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mock publicProfileConfigService (is_enabled check).
vi.mock("@/services/publicProfileConfigService", () => ({
  publicProfileConfigService: {
    getMyPublicProfile: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { publicProfileConfigService } from "@/services/publicProfileConfigService";

function mockAuth(slug: string | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: slug ? { public_slug: slug, plan: "pro" } : { public_slug: null, plan: "pro" },
    // minimal auth shape the card uses
  } as any);
}

function mockProfile(isEnabled: boolean, slug?: string) {
  vi.mocked(publicProfileConfigService.getMyPublicProfile).mockResolvedValue({
    is_enabled: isEnabled,
    public_slug: slug,
    // minimal profile shape
  } as any);
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ShareProfileCard />
    </MemoryRouter>,
  );
}

describe("ShareProfileCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clipboard present by default in jsdom
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    // navigator.share absent by default (desktop)
    delete (navigator as any).share;
  });

  it("renders share card with actions when profile is enabled with slug", async () => {
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-profile-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("share-copy-btn")).toBeInTheDocument();
    expect(screen.getByTestId("share-whatsapp-btn")).toBeInTheDocument();
    // No native share on desktop.
    expect(screen.queryByTestId("share-native-btn")).not.toBeInTheDocument();
  });

  it("renders empty state CTA when profile is not enabled", async () => {
    mockAuth("alice");
    mockProfile(false);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-profile-empty")).toBeInTheDocument();
    });
    expect(screen.getByTestId("share-empty-cta")).toBeInTheDocument();
    expect(screen.getByTestId("share-empty-cta")).toHaveAttribute(
      "href",
      "/settings?tab=public-profile",
    );
  });

  it("renders empty state when user has no slug", async () => {
    mockAuth(null);
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-profile-empty")).toBeInTheDocument();
    });
  });

  it("shows incentive copy", async () => {
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-profile-card")).toBeInTheDocument();
    });
    expect(screen.getByText(/compartís tu perfil|share your profile/i)).toBeInTheDocument();
  });

  it("builds the correct profile URL", async () => {
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-profile-url")).toBeInTheDocument();
    });
    const url = screen.getByTestId("share-profile-url").getAttribute("href") || "";
    expect(url).toContain("/u/alice");
  });

  it("copies link to clipboard on copy click and shows feedback", async () => {
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-copy-btn")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("share-copy-btn"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/u/alice"),
      );
    });
    // Feedback "Copied" appears.
    await waitFor(() => {
      expect(screen.getByTestId("share-copy-btn").textContent).toMatch(/copiad|copied/i);
    });
  });

  it("builds WhatsApp URL with encoded text", async () => {
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-whatsapp-btn")).toBeInTheDocument();
    });
    const href = screen.getByTestId("share-whatsapp-btn").getAttribute("href") || "";
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(href)).toContain("/u/alice");
  });

  it("shows native share button when navigator.share is available", async () => {
    (navigator as any).share = vi.fn().mockResolvedValue(undefined);
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-native-btn")).toBeInTheDocument();
    });
  });

  it("hides native share button when navigator.share is not available", async () => {
    mockAuth("alice");
    mockProfile(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("share-profile-card")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("share-native-btn")).not.toBeInTheDocument();
  });

  it("renders loading skeleton while fetching profile", () => {
    mockAuth("alice");
    // Never-resolving promise to keep isLoading true.
    vi.mocked(publicProfileConfigService.getMyPublicProfile).mockReturnValue(
      new Promise(() => {}) as any,
    );
    renderCard();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
