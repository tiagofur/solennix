import { describe, it, expect, vi } from "vitest";
import { buildVCardString, downloadVCard } from "./vcard";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

describe("vcard utility", () => {
  const mockProfile: PublicOrganizerProfile = {
    slug: "alice-events",
    business_name: "Alice Events & Catering",
    headline: "Event Planner & Designer",
    contact: {
      type: "whatsapp",
      value: "+525512345678",
    },
    location: {
      city: "Guadalajara",
      region: "Jalisco",
      country: "Mexico",
    },
    events_completed: 50,
    average_rating: 4.9,
    reviews_count: 12,
  };

  it("builds valid vCard 3.0 string with all profile fields", () => {
    const vcard = buildVCardString(mockProfile);

    expect(vcard).toContain("BEGIN:VCARD");
    expect(vcard).toContain("VERSION:3.0");
    expect(vcard).toContain("FN:Alice Events & Catering");
    expect(vcard).toContain("ORG:Alice Events & Catering");
    expect(vcard).toContain("TITLE:Event Planner & Designer");
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE:+525512345678");
    expect(vcard).toContain("/u/alice-events");
    expect(vcard).toContain("ADR;TYPE=WORK:;;;Guadalajara;Jalisco;;Mexico");
    expect(vcard).toContain("NOTE:Event Planner & Designer");
    expect(vcard).toContain("END:VCARD");
  });

  it("escapes special characters in vCard fields", () => {
    const profileWithSpecialChars: PublicOrganizerProfile = {
      ...mockProfile,
      business_name: "A & B, Co.; Events",
    };
    const vcard = buildVCardString(profileWithSpecialChars);
    expect(vcard).toContain("FN:A & B\\, Co.\\; Events");
  });

  it("triggers file download without errors", () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadVCard(mockProfile);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
  });
});
