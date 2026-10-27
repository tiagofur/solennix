import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StaffForm } from "./StaffForm";
import {
  useStaffMember,
  useCreateStaff,
  useUpdateStaff,
} from "@/hooks/queries/useStaffQueries";

vi.mock("@/hooks/queries/useStaffQueries", () => ({
  useStaffMember: vi.fn(),
  useCreateStaff: vi.fn(),
  useUpdateStaff: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const mockedMember = vi.mocked(useStaffMember);
const mockedCreate = vi.mocked(useCreateStaff);
const mockedUpdate = vi.mocked(useUpdateStaff);

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/staff/new" element={<StaffForm />} />
        <Route path="/staff/:id/edit" element={<StaffForm />} />
        <Route path="/staff" element={<div data-testid="staff-list" />} />
      </Routes>
    </MemoryRouter>,
  );

const existing = {
  name: "Juan Pérez",
  role_label: "Sonido",
  phone: "+52 33",
  email: "juan@example.com",
  notes: "nota",
  notification_email_opt_in: true,
};

describe("StaffForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMember.mockReturnValue({ data: undefined, isLoading: false } as any);
    mockedCreate.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
    mockedUpdate.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
  });

  it("renders the create form", () => {
    const { container } = renderAt("/staff/new");
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("requires a name", async () => {
    const createMut = { mutateAsync: vi.fn(), isPending: false };
    mockedCreate.mockReturnValue(createMut as any);
    const { container } = renderAt("/staff/new");

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("El nombre es obligatorio.")).toBeInTheDocument();
    });
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const createMut = { mutateAsync: vi.fn(), isPending: false };
    mockedCreate.mockReturnValue(createMut as any);
    const { container } = renderAt("/staff/new");

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByPlaceholderText("maria@ejemplo.com"), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Formato de email inválido.")).toBeInTheDocument();
    });
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it("creates with normalized payload", async () => {
    const createMut = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    mockedCreate.mockReturnValue(createMut as any);
    const { container } = renderAt("/staff/new");

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "  Ana  " },
    });
    fireEvent.change(screen.getByPlaceholderText("maria@ejemplo.com"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(createMut.mutateAsync).toHaveBeenCalledWith({
        name: "Ana",
        role_label: null,
        phone: null,
        email: "ana@example.com",
        notes: null,
        notification_email_opt_in: false,
      });
    });
  });

  it("prefills and updates in edit mode", async () => {
    mockedMember.mockReturnValue({ data: existing, isLoading: false } as any);
    const updateMut = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    mockedUpdate.mockReturnValue(updateMut as any);
    const { container } = renderAt("/staff/abc/edit");

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toHaveValue("Juan Pérez");
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(updateMut.mutateAsync).toHaveBeenCalledWith({
        id: "abc",
        data: expect.objectContaining({ name: "Juan Pérez" }),
      });
    });
  });
});
