export interface FormattedSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/**
 * Parses markdown-lite inline formatting markers into segments.
 * Supports: **bold**, *italic*, __underline__
 */
export function parseInlineFormatting(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  const regex = /(\*\*(.+?)\*\*)|(__(.+?)__)|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        bold: false,
        italic: false,
        underline: false,
      });
    }

    if (match[1]) {
      segments.push({ text: match[2], bold: true, italic: false, underline: false });
    } else if (match[3]) {
      segments.push({ text: match[4], bold: false, italic: false, underline: true });
    } else if (match[5]) {
      segments.push({ text: match[6], bold: false, italic: true, underline: false });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      bold: false,
      italic: false,
      underline: false,
    });
  }

  if (segments.length === 0) {
    segments.push({ text, bold: false, italic: false, underline: false });
  }

  return segments;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders formatted text as an HTML string with <strong>, <em>, <u> tags.
 */
export function renderFormattedHTML(text: string): string {
  const segments = parseInlineFormatting(text);

  return segments
    .map((seg) => {
      let html = escapeHTML(seg.text);
      if (seg.bold) html = `<strong>${html}</strong>`;
      if (seg.italic) html = `<em>${html}</em>`;
      if (seg.underline) html = `<u>${html}</u>`;
      return html;
    })
    .join("");
}
