import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { MemoryRouter } from "react-router-dom";
import { AdminListingModeration } from "./AdminListingModeration";
import {
  listingModerationService,
  type ModerationListing,
} from "@/services/listingModerationService";

vi.mock("@/services/listingModerationService", () => ({
  listingModerationService: {
    listQueue: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: (selector?: (s: { addToast: () => void }) => unknown) => {
    const state = { addToast: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

const mockedService = vi.mocked(listingModerationService);

const item = (overrides: Partial<ModerationListing> = {}): ModerationListing => ({
  user_id: "u1",
  business_name: "Salón Fiesta",
  public_slug: "salon-fiesta",
  city: "CDMX",
  country: "MX",
  headline: "Salón para bodas",
  plan: "free",
  publication_status: "pending_review",
  cover_url: null,
  publication_spam_flag: false,
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminListingModeration />
    </MemoryRouter>,
  );

describe("AdminListingModeration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.listQueue.mockResolvedValue([item()]);
  });

  it("renders the queue rows", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Salón Fiesta")).toBeInTheDocument();
    });
    expect(screen.getByTestId("approve-u1")).toBeInTheDocument();
    expect(screen.getByTestId("reject-u1")).toBeInTheDocument();
    expect(mockedService.listQueue).toHaveBeenCalledWith("pending_review");
  });

  it("approves a listing", async () => {
    mockedService.approve.mockResolvedValue({} as any);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("approve-u1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("approve-u1"));

    await waitFor(() => {
      expect(mockedService.approve).toHaveBeenCalledWith("u1");
    });
  });

  it("rejects with a reason of 3+ chars", async () => {
    mockedService.reject.mockResolvedValue({} as any);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("reject-u1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("reject-u1"));

    const confirm = screen.getByTestId("reject-confirm");
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId("reject-reason"), {
      target: { value: "no" },
    });
    expect(screen.getByTestId("reject-confirm")).toBeDisabled();

    fireEvent.change(screen.getByTestId("reject-reason"), {
      target: { value: "Fotos de baja calidad" },
    });
    fireEvent.click(screen.getByTestId("reject-confirm"));

    await waitFor(() => {
      expect(mockedService.reject).toHaveBeenCalledWith(
        "u1",
        "Fotos de baja calidad",
      );
    });
  });

  it("shows empty state when the queue is empty", async () => {
    mockedService.listQueue.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No listings pending review")).toBeInTheDocument();
    });
  });

  it("shows the error state when loading fails", async () => {
    mockedService.listQueue.mockRejectedValue(new Error("down"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Could not load queue")).toBeInTheDocument();
    });
  });
});
