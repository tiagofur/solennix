import type { PublicOrganizerProfile } from "@/services/publicProfileService";

function sanitizeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates a vCard v3.0 standard text string for a public organizer profile.
 */
export function buildVCardString(profile: PublicOrganizerProfile): string {
  const name =
    profile.business_name?.trim() ||
    profile.slug?.trim() ||
    "Solennix Organizer";
  const org = profile.business_name?.trim() || "";
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${sanitizeVCardValue(name)}`,
  ];

  if (org) {
    lines.push(`ORG:${sanitizeVCardValue(org)}`);
  }

  if (profile.headline) {
    lines.push(`TITLE:${sanitizeVCardValue(profile.headline)}`);
  }

  if (profile.contact?.value) {
    const val = profile.contact.value.trim();
    if (profile.contact.type === "phone" || profile.contact.type === "whatsapp") {
      lines.push(`TEL;TYPE=CELL,VOICE:${sanitizeVCardValue(val)}`);
    } else if (profile.contact.type === "email") {
      lines.push(`EMAIL;TYPE=INTERNET:${sanitizeVCardValue(val)}`);
    }
  }

  if (profile.slug) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    lines.push(`URL:${origin}/u/${encodeURIComponent(profile.slug)}`);
  }

  if (profile.location) {
    const city = profile.location.city || "";
    const region = profile.location.region || "";
    const country = profile.location.country || "";
    lines.push(`ADR;TYPE=WORK:;;;${sanitizeVCardValue(city)};${sanitizeVCardValue(region)};;${sanitizeVCardValue(country)}`);
  }

  if (profile.headline) {
    lines.push(`NOTE:${sanitizeVCardValue(profile.headline)}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/**
 * Triggers a browser file download of the organizer's vCard (.vcf).
 */
export function downloadVCard(profile: PublicOrganizerProfile): void {
  const vcardText = buildVCardString(profile);
  const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const fileName = (
    profile.business_name ||
    profile.slug ||
    "contacto"
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_");

  link.href = url;
  link.setAttribute("download", `${fileName}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
