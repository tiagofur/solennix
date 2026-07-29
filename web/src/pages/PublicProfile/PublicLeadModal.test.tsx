import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { PublicLeadModal } from "./PublicLeadModal";
import { publicProfileService } from "@/services/publicProfileService";

vi.mock("@/services/publicProfileService", () => ({
  publicProfileService: {
    submitLead: vi.fn(),
  },
}));

describe("PublicLeadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <PublicLeadModal
        isOpen={false}
        onClose={vi.fn()}
        slug="alice"
        businessName="Alice Events"
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders form fields when isOpen is true", () => {
    render(
      <PublicLeadModal
        isOpen={true}
        onClose={vi.fn()}
        slug="alice"
        businessName="Alice Events"
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("lead-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("lead-contact-input")).toBeInTheDocument();
    expect(screen.getByTestId("lead-event-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("lead-submit-button")).toBeInTheDocument();
  });

  it("submits lead data and displays success view", async () => {
    vi.mocked(publicProfileService.submitLead).mockResolvedValue({
      id: "l1",
      organizer_user_id: "u1",
      name: "Maria",
      contact: "maria@test.com",
      created_at: "2026-07-29T12:00:00Z",
    });

    const onCloseMock = vi.fn();
    render(
      <PublicLeadModal
        isOpen={true}
        onClose={onCloseMock}
        slug="alice"
        businessName="Alice Events"
      />,
    );

    fireEvent.change(screen.getByTestId("lead-name-input"), {
      target: { value: "Maria Gonzalez" },
    });
    fireEvent.change(screen.getByTestId("lead-contact-input"), {
      target: { value: "maria@test.com" },
    });
    fireEvent.change(screen.getByTestId("lead-event-type-select"), {
      target: { value: "wedding" },
    });
    fireEvent.change(screen.getByTestId("lead-event-date-input"), {
      target: { value: "2026-10-15" },
    });
    fireEvent.change(screen.getByTestId("lead-guests-input"), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByTestId("lead-message-input"), {
      target: { value: "Looking for full catering" },
    });

    fireEvent.click(screen.getByTestId("lead-submit-button"));

    await waitFor(() => {
      expect(publicProfileService.submitLead).toHaveBeenCalledWith("alice", {
        name: "Maria Gonzalez",
        contact: "maria@test.com",
        event_type: "wedding",
        event_date: "2026-10-15",
        num_guests: 150,
        message: "Looking for full catering",
        source: "public_profile",
      });
    });

    expect(await screen.findByTestId("lead-success-view")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("lead-success-close"));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("shows error alert when submission fails", async () => {
    vi.mocked(publicProfileService.submitLead).mockRejectedValue(
      new Error("Failed to submit inquiry"),
    );

    render(
      <PublicLeadModal
        isOpen={true}
        onClose={vi.fn()}
        slug="alice"
        businessName="Alice Events"
      />,
    );

    fireEvent.change(screen.getByTestId("lead-name-input"), {
      target: { value: "Maria" },
    });
    fireEvent.change(screen.getByTestId("lead-contact-input"), {
      target: { value: "maria@test.com" },
    });
    fireEvent.click(screen.getByTestId("lead-submit-button"));

    expect(await screen.findByTestId("lead-error")).toHaveTextContent(
      "Failed to submit inquiry",
    );
  });
});
