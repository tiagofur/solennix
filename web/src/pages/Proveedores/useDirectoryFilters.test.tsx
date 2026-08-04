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

  it("reads lat/lng/radius_km from URL into filters", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores?lat=19.4326&lng=-99.1332&radius_km=50&sort=distance"]),
    });
    expect(result.current.filters.lat).toBeCloseTo(19.4326);
    expect(result.current.filters.lng).toBeCloseTo(-99.1332);
    expect(result.current.filters.radius_km).toBe(50);
    expect(result.current.filters.sort).toBe("distance");
    expect(result.current.isGeoActive).toBe(true);
  });

  it("clearGeo removes lat/lng/radius_km and distance sort", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores?lat=19.4&lng=-99.1&radius_km=50&sort=distance&city=CDMX"]),
    });
    expect(result.current.isGeoActive).toBe(true);
    act(() => result.current.clearGeo());
    expect(result.current.isGeoActive).toBe(false);
    expect(result.current.filters.lat).toBeUndefined();
    expect(result.current.filters.lng).toBeUndefined();
    expect(result.current.filters.radius_km).toBeUndefined();
    expect(result.current.filters.sort).toBeUndefined();
    // Non-geo filters stay.
    expect(result.current.inputValues.city).toBe("CDMX");
  });

  it("setSort updates sort immediately", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores"]),
    });
    act(() => result.current.setSort("rating"));
    expect(result.current.sort).toBe("rating");
    expect(result.current.filters.sort).toBe("rating");
  });

  it("reads advanced filters from URL (#1128)", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper([
        "/proveedores?budget=1k_5k&min_budget=1000&max_budget=5000&service_category=catering&available_on=2026-09-15",
      ]),
    });
    expect(result.current.budgetBucket).toBe("1k_5k");
    expect(result.current.filters.min_budget).toBe(1000);
    expect(result.current.filters.max_budget).toBe(5000);
    expect(result.current.filters.service_category).toBe("catering");
    expect(result.current.filters.available_on).toBe("2026-09-15");
  });

  it("setBudgetBucket writes min/max_budget params", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper(["/proveedores"]),
    });
    act(() => result.current.setBudgetBucket("under_1k"));
    expect(result.current.budgetBucket).toBe("under_1k");
    expect(result.current.filters.max_budget).toBe(1000);
    expect(result.current.filters.min_budget).toBeUndefined();
  });

  it("clearFilter removes a single advanced filter", () => {
    const { result } = renderHook(() => useDirectoryFilters(), {
      wrapper: wrapper([
        "/proveedores?service_category=dj&available_on=2026-09-15&city=CDMX",
      ]),
    });
    act(() => result.current.clearFilter("service_category"));
    expect(result.current.serviceCategory).toBe("");
    expect(result.current.availableOn).toBe("2026-09-15");
    expect(result.current.inputValues.city).toBe("CDMX");
  });
});
