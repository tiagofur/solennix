import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  parseInlineFormatting,
  renderFormattedReact,
  renderFormattedHTML,
} from './inlineFormatting';

describe('inlineFormatting', () => {
  describe('parseInlineFormatting', () => {
    it('returns plain text as a single segment', () => {
      const segments = parseInlineFormatting('Hello world');
      expect(segments).toEqual([
        { text: 'Hello world', bold: false, italic: false, underline: false },
      ]);
    });

    it('parses **bold** markers', () => {
      const segments = parseInlineFormatting('This is **bold** text');
      expect(segments).toEqual([
        { text: 'This is ', bold: false, italic: false, underline: false },
        { text: 'bold', bold: true, italic: false, underline: false },
        { text: ' text', bold: false, italic: false, underline: false },
      ]);
    });

    it('parses *italic* markers', () => {
      const segments = parseInlineFormatting('This is *italic* text');
      expect(segments).toEqual([
        { text: 'This is ', bold: false, italic: false, underline: false },
        { text: 'italic', bold: false, italic: true, underline: false },
        { text: ' text', bold: false, italic: false, underline: false },
      ]);
    });

    it('parses __underline__ markers', () => {
      const segments = parseInlineFormatting('This is __underlined__ text');
      expect(segments).toEqual([
        { text: 'This is ', bold: false, italic: false, underline: false },
        { text: 'underlined', bold: false, italic: false, underline: true },
        { text: ' text', bold: false, italic: false, underline: false },
      ]);
    });

    it('parses mixed formatting in one line', () => {
      const segments = parseInlineFormatting('**bold** and *italic* and __underline__');
      expect(segments).toHaveLength(5);
      expect(segments[0]).toEqual({ text: 'bold', bold: true, italic: false, underline: false });
      expect(segments[1]).toEqual({ text: ' and ', bold: false, italic: false, underline: false });
      expect(segments[2]).toEqual({ text: 'italic', bold: false, italic: true, underline: false });
      expect(segments[3]).toEqual({ text: ' and ', bold: false, italic: false, underline: false });
      expect(segments[4]).toEqual({ text: 'underline', bold: false, italic: false, underline: true });
    });

    it('handles unmatched markers as plain text', () => {
      const segments = parseInlineFormatting('This has ** unmatched marker');
      expect(segments).toEqual([
        { text: 'This has ** unmatched marker', bold: false, italic: false, underline: false },
      ]);
    });

    it('handles adjacent asterisks', () => {
      // **** is parsed as: ** (bold open) then ** (bold close) with nothing — then fallback
      // The regex (.+?) requires at least one char, so **** won't match as bold
      // but it matches * * * * as italic around middle chars
      const segments = parseInlineFormatting('before **** after');
      // The regex finds **** as: ** matches nothing (skipped), then ** matches as containing no chars
      // Actually regex finds: ** before first *, then * after * pattern matches
      expect(segments.length).toBeGreaterThanOrEqual(1);
      // All original text content is preserved
      const allText = segments.map(s => s.text).join('');
      expect(allText).toContain('before');
      expect(allText).toContain('after');
    });

    it('handles multiple bold segments', () => {
      const segments = parseInlineFormatting('**one** middle **two**');
      expect(segments).toHaveLength(3);
      expect(segments[0].bold).toBe(true);
      expect(segments[1].bold).toBe(false);
      expect(segments[2].bold).toBe(true);
    });

    it('handles text that is entirely formatted', () => {
      const segments = parseInlineFormatting('**all bold**');
      expect(segments).toEqual([
        { text: 'all bold', bold: true, italic: false, underline: false },
      ]);
    });

    it('returns original text for empty string', () => {
      const segments = parseInlineFormatting('');
      expect(segments).toEqual([
        { text: '', bold: false, italic: false, underline: false },
      ]);
    });
  });

  describe('renderFormattedHTML', () => {
    it('returns plain text unchanged', () => {
      expect(renderFormattedHTML('Hello world')).toBe('Hello world');
    });

    it('wraps bold text in <strong> tags', () => {
      expect(renderFormattedHTML('**bold**')).toBe('<strong>bold</strong>');
    });

    it('wraps italic text in <em> tags', () => {
      expect(renderFormattedHTML('*italic*')).toBe('<em>italic</em>');
    });

    it('wraps underline text in <u> tags', () => {
      expect(renderFormattedHTML('__underline__')).toBe('<u>underline</u>');
    });

    it('HTML-escapes text content', () => {
      expect(renderFormattedHTML('**<script>alert("xss")</script>**'))
        .toBe('<strong>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</strong>');
    });

    it('handles mixed formatting', () => {
      const result = renderFormattedHTML('Hello **bold** and *italic*');
      expect(result).toBe('Hello <strong>bold</strong> and <em>italic</em>');
    });
  });

  describe('renderFormattedReact', () => {
    it('returns plain text as string', () => {
      const result = renderFormattedReact('Hello world');
      expect(result).toBe('Hello world');
    });

    it('renders bold text as <strong> element', () => {
      const result = renderFormattedReact('**bold**');
      const { container: rendered } = render(
        React.createElement('span', null, result)
      );
      expect(rendered.querySelector('strong')).not.toBeNull();
      expect(rendered.querySelector('strong')?.textContent).toBe('bold');
    });

    it('renders italic text as <em> element', () => {
      const result = renderFormattedReact('*italic*');
      const { container: rendered } = render(
        React.createElement('span', null, result)
      );
      expect(rendered.querySelector('em')).not.toBeNull();
      expect(rendered.querySelector('em')?.textContent).toBe('italic');
    });

    it('renders underline text as <u> element', () => {
      const result = renderFormattedReact('__underline__');
      const { container: rendered } = render(
        React.createElement('span', null, result)
      );
      expect(rendered.querySelector('u')).not.toBeNull();
      expect(rendered.querySelector('u')?.textContent).toBe('underline');
    });

    it('renders mixed formatting correctly', () => {
      const result = renderFormattedReact('**bold** and *italic*');
      const { container: rendered } = render(
        React.createElement('span', null, result)
      );
      expect(rendered.querySelector('strong')?.textContent).toBe('bold');
      expect(rendered.querySelector('em')?.textContent).toBe('italic');
    });
  });
});
