import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StaffTeamDetails } from "./StaffTeamDetails";
import {
  useStaffTeam,
  useDeleteStaffTeam,
} from "@/hooks/queries/useStaffQueries";

vi.mock("@/hooks/queries/useStaffQueries", () => ({
  useStaffTeam: vi.fn(),
  useDeleteStaffTeam: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const mockedTeam = vi.mocked(useStaffTeam);
const mockedDelete = vi.mocked(useDeleteStaffTeam);

const team = {
  id: "t1",
  name: "Equipo A",
  role_label: "Sonido",
  notes: "nota",
  members: [
    { staff_id: "s1", staff_name: "Juan", position: 1, is_lead: false },
    { staff_id: "s2", staff_name: "Ana", position: 0, is_lead: true },
  ],
};

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/staff/teams/:id" element={<StaffTeamDetails />} />
        <Route path="/staff/teams" element={<div data-testid="teams-list" />} />
      </Routes>
    </MemoryRouter>,
  );

describe("StaffTeamDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTeam.mockReturnValue({ data: team, isLoading: false } as any);
    mockedDelete.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
  });

  it("renders the team with members sorted by position", async () => {
    renderAt("/staff/teams/t1");

    await waitFor(() => {
      expect(screen.getByText("Equipo A")).toBeInTheDocument();
    });
    expect(mockedTeam).toHaveBeenCalledWith("t1");
    const names = screen.getAllByText(/^(Ana|Juan)$/).map((el) => el.textContent);
    expect(names).toEqual(["Ana", "Juan"]);
    expect(screen.getByText("Lidera el equipo")).toBeInTheDocument();
  });

  it("shows empty members message when the team has none", async () => {
    mockedTeam.mockReturnValue({
      data: { ...team, members: [] },
      isLoading: false,
    } as any);
    renderAt("/staff/teams/t1");

    await waitFor(() => {
      expect(
        screen.getByText(/no tiene miembros todavía/i),
      ).toBeInTheDocument();
    });
  });

  it("shows not found when the team does not exist", async () => {
    mockedTeam.mockReturnValue({ data: undefined, isLoading: false } as any);
    renderAt("/staff/teams/missing");

    await waitFor(() => {
      expect(screen.getByText(/equipo no encontrado/i)).toBeInTheDocument();
    });
  });

  it("deletes after confirm and navigates to the list", async () => {
    const deleteMut = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    mockedDelete.mockReturnValue(deleteMut as any);
    renderAt("/staff/teams/t1");

    await waitFor(() => {
      expect(screen.getByText("Equipo A")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(screen.getByText("Eliminar equipo")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar permanentemente" }),
    );

    await waitFor(() => {
      expect(deleteMut.mutateAsync).toHaveBeenCalledWith("t1");
    });
    await waitFor(() => {
      expect(screen.getByTestId("teams-list")).toBeInTheDocument();
    });
  });

  it("cancel closes the confirm dialog without deleting", async () => {
    const deleteMut = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    mockedDelete.mockReturnValue(deleteMut as any);
    renderAt("/staff/teams/t1");

    await waitFor(() => {
      expect(screen.getByText("Equipo A")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(screen.getByText("Eliminar equipo")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.queryByText("Eliminar equipo")).toBeNull();
    });
    expect(deleteMut.mutateAsync).not.toHaveBeenCalled();
  });
});
