import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StaffTeamForm } from "./StaffTeamForm";
import {
  useStaffTeam,
  useStaff,
  useCreateStaffTeam,
  useUpdateStaffTeam,
} from "@/hooks/queries/useStaffQueries";

vi.mock("@/hooks/queries/useStaffQueries", () => ({
  useStaffTeam: vi.fn(),
  useStaff: vi.fn(),
  useCreateStaffTeam: vi.fn(),
  useUpdateStaffTeam: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const mockedTeam = vi.mocked(useStaffTeam);
const mockedStaff = vi.mocked(useStaff);
const mockedCreate = vi.mocked(useCreateStaffTeam);
const mockedUpdate = vi.mocked(useUpdateStaffTeam);

const catalog = [
  { id: "s1", name: "Juan Pérez", role_label: "Sonido" },
  { id: "s2", name: "Ana Gómez", role_label: "Luces" },
];

const renderAt = (entry: string) => {
  const utils = render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/staff/teams/new" element={<StaffTeamForm />} />
        <Route path="/staff/teams/:id/edit" element={<StaffTeamForm />} />
        <Route path="/staff/teams" element={<div data-testid="teams-list" />} />
      </Routes>
    </MemoryRouter>,
  );
  const form = () =>
    utils.container.querySelector("form") as HTMLFormElement;
  const nameInput = () =>
    utils.container.querySelector("#team-name") as HTMLInputElement;
  return { ...utils, form, nameInput };
};

describe("StaffTeamForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTeam.mockReturnValue({ data: undefined, isLoading: false } as any);
    mockedStaff.mockReturnValue({ data: catalog, isLoading: false } as any);
    mockedCreate.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
    mockedUpdate.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
  });

  it("renders the create form with the staff catalog", async () => {
    renderAt("/staff/teams/new");

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });
    expect(screen.getByText("Ana Gómez")).toBeInTheDocument();
  });

  it("requires a name", async () => {
    const createMut = { mutateAsync: vi.fn(), isPending: false };
    mockedCreate.mockReturnValue(createMut as any);
    const { form } = renderAt("/staff/teams/new");

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });
    fireEvent.submit(form());

    await waitFor(() => {
      expect(
        form().querySelector(".text-danger"),
      ).not.toBeNull();
    });
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it("toggles a member and creates the team", async () => {
    const createMut = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    mockedCreate.mockReturnValue(createMut as any);
    const { form, nameInput } = renderAt("/staff/teams/new");

    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /juan pérez/i }));
    fireEvent.change(nameInput(), { target: { value: "Equipo A" } });
    fireEvent.submit(form());

    await waitFor(() => {
      expect(createMut.mutateAsync).toHaveBeenCalledWith({
        name: "Equipo A",
        role_label: null,
        notes: null,
        members: [{ staff_id: "s1", is_lead: false, position: 0 }],
      });
    });
  });

  it("prefills and updates in edit mode", async () => {
    mockedTeam.mockReturnValue({
      data: {
        name: "Equipo A",
        role_label: "",
        notes: "",
        members: [{ staff_id: "s1", is_lead: true, position: 0 }],
      },
      isLoading: false,
    } as any);
    const updateMut = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    mockedUpdate.mockReturnValue(updateMut as any);
    const { form, nameInput } = renderAt("/staff/teams/t1/edit");

    await waitFor(() => {
      expect(nameInput()).toHaveValue("Equipo A");
    });
    fireEvent.submit(form());

    await waitFor(() => {
      expect(updateMut.mutateAsync).toHaveBeenCalledWith({
        id: "t1",
        data: expect.objectContaining({ name: "Equipo A" }),
      });
    });
  });
});
