import React from 'react';
import { jsPDF } from 'jspdf';

export interface FormattedSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/**
 * Parses markdown-lite inline formatting markers into segments.
 * Supports: **bold**, *italic*, __underline__
 * Order matters: ** must match before *, __ before _.
 */
export function parseInlineFormatting(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  // Match ** (bold), __ (underline), * (italic) — ordered by specificity
  const regex = /(\*\*(.+?)\*\*)|(__(.+?)__)|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        bold: false,
        italic: false,
        underline: false,
      });
    }

    if (match[1]) {
      // **bold**
      segments.push({ text: match[2], bold: true, italic: false, underline: false });
    } else if (match[3]) {
      // __underline__
      segments.push({ text: match[4], bold: false, italic: false, underline: true });
    } else if (match[5]) {
      // *italic*
      segments.push({ text: match[6], bold: false, italic: true, underline: false });
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      bold: false,
      italic: false,
      underline: false,
    });
  }

  // If no segments were created, return the original text as-is
  if (segments.length === 0) {
    segments.push({ text, bold: false, italic: false, underline: false });
  }

  return segments;
}

/**
 * Renders formatted text as React elements with <strong>, <em>, <u> tags.
 */
export function renderFormattedReact(text: string): React.ReactNode {
  const segments = parseInlineFormatting(text);

  // Fast path: no formatting found
  if (segments.length === 1 && !segments[0].bold && !segments[0].italic && !segments[0].underline) {
    return text;
  }

  return segments.map((seg, i) => {
    let node: React.ReactNode = seg.text;
    if (seg.bold) node = React.createElement('strong', { key: `b${i}` }, node);
    if (seg.italic) node = React.createElement('em', { key: `i${i}` }, node);
    if (seg.underline) node = React.createElement('u', { key: `u${i}` }, node);
    // Wrap plain segments in a fragment with key
    if (!seg.bold && !seg.italic && !seg.underline) {
      node = React.createElement(React.Fragment, { key: `t${i}` }, node);
    }
    return node;
  });
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders formatted text as an HTML string with <strong>, <em>, <u> tags.
 * HTML-escapes the text content for safety.
 */
export function renderFormattedHTML(text: string): string {
  const segments = parseInlineFormatting(text);

  return segments.map((seg) => {
    let html = escapeHTML(seg.text);
    if (seg.bold) html = `<strong>${html}</strong>`;
    if (seg.italic) html = `<em>${html}</em>`;
    if (seg.underline) html = `<u>${html}</u>`;
    return html;
  }).join('');
}

/**
 * Renders formatted text into a jsPDF document with inline bold/italic/underline.
 * Handles word-wrapping by measuring text widths with doc.getTextWidth().
 * Returns the final Y position after rendering.
 */
export function renderFormattedJsPDF(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): number {
  const segments = parseInlineFormatting(text);
  const lineHeight = fontSize * 0.5; // ~1.4x font size in mm

  let currentX = x;
  let currentY = y;

  doc.setFontSize(fontSize);

  for (const seg of segments) {
    // Split segment text into words to handle wrapping
    const words = seg.text.split(/( +)/); // preserve spaces as separate tokens

    // Set font style for this segment
    const style = seg.bold && seg.italic ? 'bolditalic'
      : seg.bold ? 'bold'
      : seg.italic ? 'italic'
      : 'normal';
    doc.setFont('helvetica', style);

    for (const word of words) {
      if (!word) continue;

      const wordWidth = doc.getTextWidth(word);

      // Wrap to next line if the word exceeds remaining width
      if (currentX > x && currentX + wordWidth > x + maxWidth) {
        currentX = x;
        currentY += lineHeight;
      }

      doc.text(word, currentX, currentY);

      // Draw underline manually
      if (seg.underline) {
        const underlineY = currentY + 1;
        doc.setLineWidth(0.3);
        doc.line(currentX, underlineY, currentX + wordWidth, underlineY);
      }

      currentX += wordWidth;
    }
  }

  // Reset font
  doc.setFont('helvetica', 'normal');

  return currentY + lineHeight;
}
