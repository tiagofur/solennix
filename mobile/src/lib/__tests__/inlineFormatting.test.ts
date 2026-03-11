import { parseInlineFormatting, renderFormattedHTML } from '../inlineFormatting';

describe('inlineFormatting', () => {
  describe('parseInlineFormatting', () => {
    it('returns original text if no formatting is present', () => {
      const result = parseInlineFormatting('Hello world');
      expect(result).toEqual([
        { text: 'Hello world', bold: false, italic: false, underline: false }
      ]);
    });

    it('parses bold text correctly', () => {
      const result = parseInlineFormatting('This is **bold** text');
      expect(result).toEqual([
        { text: 'This is ', bold: false, italic: false, underline: false },
        { text: 'bold', bold: true, italic: false, underline: false },
        { text: ' text', bold: false, italic: false, underline: false }
      ]);
    });

    it('parses italic text correctly', () => {
      const result = parseInlineFormatting('This is *italic* text');
      expect(result).toEqual([
        { text: 'This is ', bold: false, italic: false, underline: false },
        { text: 'italic', bold: false, italic: true, underline: false },
        { text: ' text', bold: false, italic: false, underline: false }
      ]);
    });

    it('parses underline text correctly', () => {
      const result = parseInlineFormatting('This is __underline__ text');
      expect(result).toEqual([
        { text: 'This is ', bold: false, italic: false, underline: false },
        { text: 'underline', bold: false, italic: false, underline: true },
        { text: ' text', bold: false, italic: false, underline: false }
      ]);
    });

    it('parses multiple formatting types in one string', () => {
      const result = parseInlineFormatting('Hello **bold**, *italic*, and __underline__!');
      expect(result).toEqual([
        { text: 'Hello ', bold: false, italic: false, underline: false },
        { text: 'bold', bold: true, italic: false, underline: false },
        { text: ', ', bold: false, italic: false, underline: false },
        { text: 'italic', bold: false, italic: true, underline: false },
        { text: ', and ', bold: false, italic: false, underline: false },
        { text: 'underline', bold: false, italic: false, underline: true },
        { text: '!', bold: false, italic: false, underline: false }
      ]);
    });

    it('handles contiguous formatting', () => {
      const result = parseInlineFormatting('**bold***italic*__underline__');
      expect(result).toEqual([
        { text: 'bold', bold: true, italic: false, underline: false },
        { text: 'italic', bold: false, italic: true, underline: false },
        { text: 'underline', bold: false, italic: false, underline: true }
      ]);
    });
  });

  describe('renderFormattedHTML', () => {
    it('escapes HTML tags properly when no formatting is used', () => {
      const result = renderFormattedHTML('<script>alert("1")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;1&quot;)&lt;/script&gt;');
    });

    it('renders HTML tags for formatting correctly', () => {
      const result = renderFormattedHTML('This is **bold**, *italic*, and __underline__');
      expect(result).toBe('This is <strong>bold</strong>, <em>italic</em>, and <u>underline</u>');
    });

    it('escapes text inside formatting tags', () => {
      const result = renderFormattedHTML('Watch **<this>** closely');
      expect(result).toBe('Watch <strong>&lt;this&gt;</strong> closely');
    });
  });
});
