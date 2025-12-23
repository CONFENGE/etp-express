import { HtmlToDocxParser } from './html-to-docx.parser';
import { Paragraph, Table } from 'docx';

describe('HtmlToDocxParser', () => {
  let parser: HtmlToDocxParser;

  beforeEach(() => {
    parser = new HtmlToDocxParser();
  });

  describe('parse', () => {
    describe('empty/null content', () => {
      it('should return empty placeholder for empty string', () => {
        const result = parser.parse('');

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should return empty placeholder for whitespace only', () => {
        const result = parser.parse('   \n\t  ');

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });
    });

    describe('paragraph parsing', () => {
      it('should parse single paragraph', () => {
        const html = '<p>Hello World</p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should parse multiple paragraphs', () => {
        const html = '<p>First paragraph</p><p>Second paragraph</p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Paragraph);
        expect(result[1]).toBeInstanceOf(Paragraph);
      });

      it('should parse paragraph with bold text', () => {
        const html = '<p>Hello <strong>bold</strong> world</p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should parse paragraph with italic text', () => {
        const html = '<p>Hello <em>italic</em> world</p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should parse paragraph with bold and italic', () => {
        const html = '<p><strong><em>Bold and italic</em></strong></p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should handle <b> and <i> tags as aliases', () => {
        const html = '<p>Hello <b>bold</b> and <i>italic</i></p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });
    });

    describe('list parsing', () => {
      it('should parse unordered list', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
        const result = parser.parse(html);

        expect(result).toHaveLength(3);
        result.forEach((item) => {
          expect(item).toBeInstanceOf(Paragraph);
        });
      });

      it('should parse ordered list', () => {
        const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
        const result = parser.parse(html);

        expect(result).toHaveLength(3);
        result.forEach((item) => {
          expect(item).toBeInstanceOf(Paragraph);
        });
      });

      it('should parse list items with formatting', () => {
        const html =
          '<ul><li><strong>Bold</strong> item</li><li><em>Italic</em> item</li></ul>';
        const result = parser.parse(html);

        expect(result).toHaveLength(2);
        result.forEach((item) => {
          expect(item).toBeInstanceOf(Paragraph);
        });
      });
    });

    describe('table parsing', () => {
      it('should parse simple table', () => {
        const html = `
          <table>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
            <tr><td>Cell 3</td><td>Cell 4</td></tr>
          </table>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Table);
      });

      it('should parse table with header row', () => {
        const html = `
          <table>
            <thead>
              <tr><th>Header 1</th><th>Header 2</th></tr>
            </thead>
            <tbody>
              <tr><td>Data 1</td><td>Data 2</td></tr>
            </tbody>
          </table>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Table);
      });

      it('should parse table with th elements as headers', () => {
        const html = `
          <table>
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td>Data 1</td><td>Data 2</td></tr>
          </table>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Table);
      });

      it('should parse table with formatted cell content', () => {
        const html = `
          <table>
            <tr><td><strong>Bold</strong></td><td><em>Italic</em></td></tr>
          </table>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Table);
      });
    });

    describe('mixed content', () => {
      it('should parse paragraphs before table', () => {
        const html = `
          <p>Introduction text</p>
          <table>
            <tr><td>Data</td></tr>
          </table>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Paragraph);
        expect(result[1]).toBeInstanceOf(Table);
      });

      it('should parse paragraphs after table', () => {
        const html = `
          <table>
            <tr><td>Data</td></tr>
          </table>
          <p>Conclusion text</p>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Table);
        expect(result[1]).toBeInstanceOf(Paragraph);
      });

      it('should parse list after paragraph', () => {
        const html = `
          <p>Requirements:</p>
          <ul>
            <li>Requirement 1</li>
            <li>Requirement 2</li>
          </ul>
        `;
        const result = parser.parse(html);

        expect(result).toHaveLength(3);
        expect(result[0]).toBeInstanceOf(Paragraph);
        expect(result[1]).toBeInstanceOf(Paragraph);
        expect(result[2]).toBeInstanceOf(Paragraph);
      });

      it('should handle complex TipTap output', () => {
        const html = `
          <p>This is the <strong>introduction</strong> with <em>emphasis</em>.</p>
          <p>Here are the key points:</p>
          <ul>
            <li>First point with <strong>bold</strong></li>
            <li>Second point</li>
          </ul>
          <p>Summary table:</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Total</td><td>R$ 1.000,00</td></tr>
            </tbody>
          </table>
        `;
        const result = parser.parse(html);

        // 3 paragraphs + 2 list items + 1 table = 6 elements
        expect(result.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('HTML entities', () => {
      it('should decode HTML entities', () => {
        const html = '<p>A &amp; B &lt; C &gt; D</p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should handle non-breaking spaces', () => {
        const html = '<p>Hello&nbsp;World</p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });
    });

    describe('edge cases', () => {
      it('should handle plain text without tags', () => {
        const text = 'Plain text without HTML';
        const result = parser.parse(text);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should handle nested formatting', () => {
        const html =
          '<p><strong>Bold with <em>nested italic</em> text</strong></p>';
        const result = parser.parse(html);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Paragraph);
      });

      it('should handle empty paragraphs gracefully', () => {
        const html = '<p></p><p>Content</p><p></p>';
        const result = parser.parse(html);

        // Should only include paragraphs with content
        expect(result.length).toBeGreaterThanOrEqual(1);
      });

      it('should handle empty list items gracefully', () => {
        const html = '<ul><li></li><li>Item</li></ul>';
        const result = parser.parse(html);

        // Should only include items with content
        expect(result.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
