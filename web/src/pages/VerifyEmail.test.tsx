import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@tests/customRender";
import { MemoryRouter } from "react-router-dom";
import { VerifyEmail } from "./VerifyEmail";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

const renderWithToken = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/verify-email${search}`]}>
      <VerifyEmail />
    </MemoryRouter>,
  );

describe("VerifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows success when the token verifies", async () => {
    mockedGet.mockResolvedValue({ message: "Listo" } as any);
    renderWithToken("?token=abc123");

    await waitFor(() => {
      expect(screen.getByText("Correo verificado")).toBeInTheDocument();
    });
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith("/auth/verify-email", {
      token: "abc123",
    });
  });

  it("shows invalid without calling the API when token is missing", async () => {
    renderWithToken("");

    await waitFor(() => {
      expect(screen.getByText("No se pudo verificar")).toBeInTheDocument();
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("shows the backend error message on failure", async () => {
    mockedGet.mockRejectedValue(new Error("Token expirado"));
    renderWithToken("?token=bad");

    await waitFor(() => {
      expect(screen.getByText("No se pudo verificar")).toBeInTheDocument();
    });
    expect(screen.getByText("Token expirado")).toBeInTheDocument();
  });
});
