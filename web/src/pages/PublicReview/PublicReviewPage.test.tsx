import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PublicReviewPage } from "./PublicReviewPage";
import eventReviewService from "@/services/eventReviewService";

vi.mock("@/services/eventReviewService", () => ({
  default: {
    getPublicReviewRequest: vi.fn(),
    submitPublicReview: vi.fn(),
  },
}));

const mockedService = vi.mocked(eventReviewService);

const renderAtToken = (token: string) =>
  render(
    <MemoryRouter initialEntries={[`/organizer/review/${token}`]}>
      <Routes>
        <Route path="/organizer/review/:token" element={<PublicReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );

const baseMeta = {
  allow_public_testimonials: false,
  event_label: "Boda Ana",
  organizer_name: "Org",
};

describe("PublicReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads meta and shows the review form", async () => {
    mockedService.getPublicReviewRequest.mockResolvedValue(baseMeta as any);
    renderAtToken("tok123");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Enviar reseña" }),
      ).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/qué fue lo que más te gustó/i)).toBeInTheDocument();
    expect(
      mockedService.getPublicReviewRequest,
    ).toHaveBeenCalledWith("tok123");
  });

  it("submits the selected rating and shows success", async () => {
    mockedService.getPublicReviewRequest.mockResolvedValue(baseMeta as any);
    mockedService.submitPublicReview.mockResolvedValue(undefined as any);
    renderAtToken("tok123");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Enviar reseña" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Calificación 4 de 5" }),
    );
    fireEvent.change(
      screen.getByPlaceholderText(/qué fue lo que más te gustó/i),
      { target: { value: "Todo excelente" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar reseña" }));

    await waitFor(() => {
      expect(mockedService.submitPublicReview).toHaveBeenCalledWith("tok123", {
        rating: 4,
        comment: "Todo excelente",
        visibility: "private",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("¡Gracias por tu reseña!")).toBeInTheDocument();
    });
  });

  it("shows unavailable when the token is invalid", async () => {
    mockedService.getPublicReviewRequest.mockRejectedValue(
      new Error("not found"),
    );
    renderAtToken("bad-token");

    await waitFor(() => {
      expect(screen.getByText(/enlace no/i)).toBeInTheDocument();
    });
  });

  it("shows an error when submit fails", async () => {
    mockedService.getPublicReviewRequest.mockResolvedValue(baseMeta as any);
    mockedService.submitPublicReview.mockRejectedValue(new Error("down"));
    renderAtToken("tok123");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Enviar reseña" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reseña" }));

    await waitFor(() => {
      expect(screen.getByText(/no pudimos enviar/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("¡Gracias por tu reseña!")).toBeNull();
  });
});
