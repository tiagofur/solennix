import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDirectoryFilters } from "./useDirectoryFilters";

function wrapper(initialEntries: string[]) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe("useDirectoryFilters", () => {
  it("reads initial filters from URL", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores?city=CDMX&event_type=boda&page=2"]),
    });
    expect(result.current.eventType).toBe("boda");
    expect(result.current.page).toBe(2);
    expect(result.current.inputValues.city).toBe("CDMX");
  });

  it("setCity updates inputValues immediately", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores"]),
    });
    act(() => result.current.setCity("GDL"));
    expect(result.current.inputValues.city).toBe("GDL");
  });

  it("setEventType updates eventType immediately (no debounce)", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores"]),
    });
    act(() => result.current.setEventType("xv"));
    expect(result.current.eventType).toBe("xv");
  });

  it("setPage updates page", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores"]),
    });
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
  });

  it("changing a filter resets page to 1", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores?page=3"]),
    });
    expect(result.current.page).toBe(3);
    act(() => result.current.setEventType("boda"));
    expect(result.current.page).toBe(1);
  });

  it("clear resets everything", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores?city=CDMX&q=catering&page=2"]),
    });
    act(() => result.current.clear());
    expect(result.current.inputValues.city).toBe("");
    expect(result.current.inputValues.q).toBe("");
    expect(result.current.page).toBe(1);
  });

  it("debounced filters lag behind inputValues for text inputs", async () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores"]),
    });
    act(() => result.current.setCity("Mex"));
    // Immediately, the debounced filter is still undefined.
    expect(result.current.filters.city).toBeUndefined();
    // After the debounce window, it catches up.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(result.current.filters.city).toBe("Mex");
  });
});
