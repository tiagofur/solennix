import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { PublicProfileQuickActions } from "./PublicProfileQuickActions";
import * as vcard from "@/lib/vcard";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

vi.mock("@/lib/vcard", () => ({
  downloadVCard: vi.fn(),
}));

describe("PublicProfileQuickActions", () => {
  const mockProfile: PublicOrganizerProfile = {
    slug: "alice-events",
    business_name: "Alice Events",
    location: {
      city: "Guadalajara",
      region: "Jalisco",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders quick action buttons", () => {
    render(
      <PublicProfileQuickActions
        profile={mockProfile}
        onScrollToMap={vi.fn()}
      />,
    );
    expect(screen.getByTestId("quick-action-save-vcard")).toBeInTheDocument();
    expect(screen.getByTestId("quick-action-share")).toBeInTheDocument();
    expect(screen.getByTestId("quick-action-copy-link")).toBeInTheDocument();
    expect(screen.getByTestId("quick-action-location")).toBeInTheDocument();
  });

  it("calls downloadVCard when Save Contact is clicked", () => {
    render(<PublicProfileQuickActions profile={mockProfile} />);
    fireEvent.click(screen.getByTestId("quick-action-save-vcard"));
    expect(vcard.downloadVCard).toHaveBeenCalledWith(mockProfile);
  });

  it("copies link and updates button state to copied", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<PublicProfileQuickActions profile={mockProfile} />);
    fireEvent.click(screen.getByTestId("quick-action-copy-link"));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
    });

    expect(screen.getByText("¡Copiado!")).toBeInTheDocument();
  });

  it("calls onScrollToMap when location badge is clicked", () => {
    const onScrollMock = vi.fn();
    render(
      <PublicProfileQuickActions
        profile={mockProfile}
        onScrollToMap={onScrollMock}
      />,
    );

    fireEvent.click(screen.getByTestId("quick-action-location"));
    expect(onScrollMock).toHaveBeenCalled();
  });
});
