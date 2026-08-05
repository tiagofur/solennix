import { describe, expect, it } from "vitest";
import {
  buildDirectoryDescription,
  buildDirectoryItemListJsonLd,
  buildDirectoryTitle,
  DIRECTORY_SITE_ORIGIN,
} from "./directorySeo";

const base = {
  baseTitle: "Encontrá el proveedor perfecto para tu evento",
  baseDescription: "Organizadores verificados de eventos en LATAM",
};

describe("directorySeo", () => {
  it("builds default title with Solennix suffix", () => {
    expect(buildDirectoryTitle(base)).toBe(
      "Encontrá el proveedor perfecto para tu evento | Solennix",
    );
  });

  it("builds city + service + event titles", () => {
    expect(
      buildDirectoryTitle({ ...base, city: "CDMX", serviceLabel: "Catering" }),
    ).toBe("Catering en CDMX | Solennix");
    expect(
      buildDirectoryTitle({
        ...base,
        city: "GDL",
        serviceLabel: "DJ",
        eventTypeLabel: "Boda",
      }),
    ).toBe("DJ para Boda en GDL | Solennix");
    expect(buildDirectoryTitle({ ...base, eventTypeLabel: "XV años" })).toBe(
      "Proveedores para XV años | Solennix",
    );
  });

  it("builds filter-aware description without marketplace guarantees", () => {
    const desc = buildDirectoryDescription({
      ...base,
      city: "Monterrey",
      serviceLabel: "Fotografía",
    });
    expect(desc).toMatch(/fotografía/i);
    expect(desc).toMatch(/Monterrey/);
    expect(desc).toMatch(/facilita el contacto/i);
    expect(desc.toLowerCase()).not.toMatch(/garantiz/);
    expect(desc.toLowerCase()).not.toMatch(/marketplace/);
  });

  it("builds ItemList JSON-LD with LocalBusiness items", () => {
    const ld = buildDirectoryItemListJsonLd(
      { ...base, pageUrl: "/providers?city=CDMX" },
      [
        {
          name: "Alice Catering",
          url: "/u/alice-catering",
          description: "Catering premium",
        },
      ],
    );
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.url).toBe(`${DIRECTORY_SITE_ORIGIN}/providers?city=CDMX`);
    expect(ld.numberOfItems).toBe(1);
    const elements = ld.itemListElement as Array<Record<string, unknown>>;
    expect(elements[0].position).toBe(1);
    const item = elements[0].item as Record<string, unknown>;
    expect(item["@type"]).toBe("LocalBusiness");
    expect(item.url).toBe(`${DIRECTORY_SITE_ORIGIN}/u/alice-catering`);
    expect(item.name).toBe("Alice Catering");
  });
});
