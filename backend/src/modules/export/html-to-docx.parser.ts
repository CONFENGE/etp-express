import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  IParagraphOptions,
} from 'docx';
import { DOCX_FONTS, DOCX_FONT_SIZES, DOCX_COLORS } from './docx.config';

/**
 * Represents a parsed inline text element with formatting
 */
interface InlineElement {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Represents a parsed block element (paragraph, list, table)
 */
interface BlockElement {
  type: 'paragraph' | 'bullet-list' | 'ordered-list' | 'table';
  content?: InlineElement[];
  items?: InlineElement[][];
  rows?: InlineElement[][][];
  headerRows?: number;
}

/**
 * HTML to DOCX Parser
 *
 * Converts TipTap-generated HTML to docx.js elements.
 * Supports:
 * - Paragraphs (<p>)
 * - Bold (<strong>, <b>)
 * - Italic (<em>, <i>)
 * - Bullet lists (<ul>/<li>)
 * - Ordered lists (<ol>/<li>)
 * - Tables (<table>/<tr>/<th>/<td>)
 *
 * @example
 * ```ts
 * const parser = new HtmlToDocxParser();
 * const paragraphs = parser.parse('<p>Hello <strong>world</strong></p>');
 * ```
 */
export class HtmlToDocxParser {
  /**
   * Parse HTML content to DOCX elements (Paragraph[], Table[])
   */
  parse(html: string): (Paragraph | Table)[] {
    if (!html || html.trim() === '') {
      return [this.createEmptyParagraph()];
    }

    const blocks = this.parseBlocks(html);
    return this.blocksToDocxElements(blocks);
  }

  /**
   * Parse HTML into block elements
   */
  private parseBlocks(html: string): BlockElement[] {
    const blocks: BlockElement[] = [];

    // Remove extra whitespace but preserve meaningful newlines
    const normalized = html.trim();

    // Extract tables first (they can contain other elements)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let lastIndex = 0;
    const parts: { type: 'html' | 'table'; content: string }[] = [];

    while ((tableMatch = tableRegex.exec(normalized)) !== null) {
      if (tableMatch.index > lastIndex) {
        parts.push({
          type: 'html',
          content: normalized.slice(lastIndex, tableMatch.index),
        });
      }
      parts.push({
        type: 'table',
        content: tableMatch[0],
      });
      lastIndex = tableMatch.index + tableMatch[0].length;
    }

    if (lastIndex < normalized.length) {
      parts.push({
        type: 'html',
        content: normalized.slice(lastIndex),
      });
    }

    // If no parts, treat everything as HTML
    if (parts.length === 0) {
      parts.push({ type: 'html', content: normalized });
    }

    for (const part of parts) {
      if (part.type === 'table') {
        const tableBlock = this.parseTable(part.content);
        if (tableBlock) {
          blocks.push(tableBlock);
        }
      } else {
        blocks.push(...this.parseHtmlBlocks(part.content));
      }
    }

    return blocks;
  }

  /**
   * Parse non-table HTML blocks
   */
  private parseHtmlBlocks(html: string): BlockElement[] {
    const blocks: BlockElement[] = [];

    // Handle bullet lists
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let ulMatch;
    let lastIndex = 0;
    const parts: { type: 'paragraph' | 'ul' | 'ol'; content: string }[] = [];

    // First pass: extract lists
    const tempHtml = html;

    // Extract unordered lists
    ulMatch = ulRegex.exec(tempHtml);
    while (ulMatch !== null) {
      if (ulMatch.index > lastIndex) {
        const before = tempHtml.slice(lastIndex, ulMatch.index);
        if (before.trim()) {
          parts.push({ type: 'paragraph', content: before });
        }
      }
      parts.push({ type: 'ul', content: ulMatch[1] });
      lastIndex = ulMatch.index + ulMatch[0].length;
      ulMatch = ulRegex.exec(tempHtml);
    }

    if (lastIndex === 0) {
      // No unordered lists, check for ordered lists
      const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
      let olMatch = olRegex.exec(tempHtml);
      while (olMatch !== null) {
        if (olMatch.index > lastIndex) {
          const before = tempHtml.slice(lastIndex, olMatch.index);
          if (before.trim()) {
            parts.push({ type: 'paragraph', content: before });
          }
        }
        parts.push({ type: 'ol', content: olMatch[1] });
        lastIndex = olMatch.index + olMatch[0].length;
        olMatch = olRegex.exec(tempHtml);
      }
    }

    if (lastIndex < tempHtml.length) {
      const remaining = tempHtml.slice(lastIndex);
      if (remaining.trim()) {
        parts.push({ type: 'paragraph', content: remaining });
      }
    }

    // If no lists found, treat all as paragraphs
    if (parts.length === 0 && html.trim()) {
      parts.push({ type: 'paragraph', content: html });
    }

    // Convert parts to blocks
    for (const part of parts) {
      if (part.type === 'ul') {
        const items = this.parseListItems(part.content);
        if (items.length > 0) {
          blocks.push({ type: 'bullet-list', items });
        }
      } else if (part.type === 'ol') {
        const items = this.parseListItems(part.content);
        if (items.length > 0) {
          blocks.push({ type: 'ordered-list', items });
        }
      } else {
        // Parse paragraphs
        const paragraphBlocks = this.parseParagraphs(part.content);
        blocks.push(...paragraphBlocks);
      }
    }

    return blocks;
  }

  /**
   * Parse <li> items from list content
   */
  private parseListItems(listContent: string): InlineElement[][] {
    const items: InlineElement[][] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = liRegex.exec(listContent)) !== null) {
      const content = this.parseInlineElements(match[1]);
      if (content.length > 0) {
        items.push(content);
      }
    }

    return items;
  }

  /**
   * Parse paragraphs from HTML
   */
  private parseParagraphs(html: string): BlockElement[] {
    const blocks: BlockElement[] = [];

    // Match <p> tags
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    let hasMatches = false;

    while ((match = pRegex.exec(html)) !== null) {
      hasMatches = true;
      const content = this.parseInlineElements(match[1]);
      if (content.length > 0) {
        blocks.push({ type: 'paragraph', content });
      }
    }

    // If no <p> tags, treat as plain text
    if (!hasMatches) {
      const stripped = this.stripTags(html).trim();
      if (stripped) {
        const content = this.parseInlineElements(html);
        if (content.length > 0) {
          blocks.push({ type: 'paragraph', content });
        }
      }
    }

    return blocks;
  }

  /**
   * Parse inline formatting (bold, italic)
   */
  private parseInlineElements(html: string): InlineElement[] {
    const elements: InlineElement[] = [];

    // Decode HTML entities first
    const decoded = this.decodeHtmlEntities(html);

    // Pattern to match bold/italic tags
    // This handles nested tags like <strong><em>text</em></strong>
    const regex =
      /<(strong|b|em|i)>([^<]*)<\/(strong|b|em|i)>|<(strong|b)><(em|i)>([^<]*)<\/(em|i)><\/(strong|b)>|<(em|i)><(strong|b)>([^<]*)<\/(strong|b)><\/(em|i)>|([^<]+)/g;

    let match;
    while ((match = regex.exec(decoded)) !== null) {
      if (match[1] && match[2] !== undefined) {
        // Simple bold or italic
        const tag = match[1].toLowerCase();
        const text = match[2];
        if (text) {
          elements.push({
            text,
            bold: tag === 'strong' || tag === 'b',
            italic: tag === 'em' || tag === 'i',
          });
        }
      } else if (match[6] !== undefined) {
        // Bold wrapping italic: <strong><em>text</em></strong>
        elements.push({
          text: match[6],
          bold: true,
          italic: true,
        });
      } else if (match[11] !== undefined) {
        // Italic wrapping bold: <em><strong>text</strong></em>
        elements.push({
          text: match[11],
          bold: true,
          italic: true,
        });
      } else if (match[13] !== undefined) {
        // Plain text
        const text = match[13].trim();
        if (text) {
          elements.push({ text });
        }
      }
    }

    // If regex didn't match anything, try stripping tags
    if (elements.length === 0) {
      const stripped = this.stripTags(decoded).trim();
      if (stripped) {
        elements.push({ text: stripped });
      }
    }

    return elements;
  }

  /**
   * Parse table HTML to block element
   */
  private parseTable(tableHtml: string): BlockElement | null {
    const rows: InlineElement[][][] = [];
    let headerRows = 0;

    // Find thead rows
    const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    if (theadMatch) {
      const headerRowMatches = theadMatch[1].matchAll(
        /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
      );
      for (const rowMatch of headerRowMatches) {
        const cells = this.parseTableCells(rowMatch[1], true);
        if (cells.length > 0) {
          rows.push(cells);
          headerRows++;
        }
      }
    }

    // Find tbody rows (or all tr if no thead/tbody)
    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    const bodyContent = tbodyMatch ? tbodyMatch[1] : tableHtml;

    const bodyRowMatches = bodyContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const rowMatch of bodyRowMatches) {
      // Skip if this row was already processed in thead
      if (theadMatch && theadMatch[1].includes(rowMatch[0])) {
        continue;
      }
      const cells = this.parseTableCells(rowMatch[1], false);
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) {
      return null;
    }

    // If no explicit thead but first row has <th>, treat it as header
    if (headerRows === 0 && rows.length > 0) {
      const firstRowHtml = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i)?.[1];
      if (firstRowHtml && /<th[^>]*>/i.test(firstRowHtml)) {
        headerRows = 1;
      }
    }

    return {
      type: 'table',
      rows,
      headerRows,
    };
  }

  /**
   * Parse table cells from row HTML
   */
  private parseTableCells(
    rowHtml: string,
    _isHeader: boolean,
  ): InlineElement[][] {
    const cells: InlineElement[][] = [];

    // Match both <th> and <td> tags
    const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/gi;
    let match;

    while ((match = cellRegex.exec(rowHtml)) !== null) {
      const cellContent = this.parseInlineElements(match[2]);
      cells.push(cellContent.length > 0 ? cellContent : [{ text: '' }]);
    }

    return cells;
  }

  /**
   * Convert block elements to docx.js elements
   */
  private blocksToDocxElements(blocks: BlockElement[]): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case 'paragraph':
          if (block.content) {
            elements.push(this.createParagraph(block.content));
          }
          break;

        case 'bullet-list':
          if (block.items) {
            for (const item of block.items) {
              elements.push(this.createBulletParagraph(item));
            }
          }
          break;

        case 'ordered-list':
          if (block.items) {
            for (let i = 0; i < block.items.length; i++) {
              elements.push(this.createNumberedParagraph(block.items[i], i));
            }
          }
          break;

        case 'table':
          if (block.rows) {
            elements.push(this.createTable(block.rows, block.headerRows ?? 0));
          }
          break;
      }
    }

    return elements;
  }

  /**
   * Create a paragraph with inline elements
   */
  private createParagraph(
    content: InlineElement[],
    options?: IParagraphOptions,
  ): Paragraph {
    return new Paragraph({
      ...options,
      children: content.map(
        (el) =>
          new TextRun({
            text: el.text,
            bold: el.bold,
            italics: el.italic,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
      ),
      spacing: { after: 200 },
    });
  }

  /**
   * Create a bullet list paragraph
   */
  private createBulletParagraph(content: InlineElement[]): Paragraph {
    return new Paragraph({
      bullet: { level: 0 },
      children: content.map(
        (el) =>
          new TextRun({
            text: el.text,
            bold: el.bold,
            italics: el.italic,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
      ),
    });
  }

  /**
   * Create a numbered list paragraph
   */
  private createNumberedParagraph(
    content: InlineElement[],
    _index: number,
  ): Paragraph {
    return new Paragraph({
      numbering: { reference: 'default-numbering', level: 0 },
      children: content.map(
        (el) =>
          new TextRun({
            text: el.text,
            bold: el.bold,
            italics: el.italic,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
      ),
    });
  }

  /**
   * Create a table from rows
   */
  private createTable(rows: InlineElement[][][], headerRows: number): Table {
    const tableBorder = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: DOCX_COLORS.BORDER || '999999',
    };

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (row, rowIndex) =>
          new TableRow({
            tableHeader: rowIndex < headerRows,
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      children: cell.map(
                        (el) =>
                          new TextRun({
                            text: el.text,
                            bold: el.bold || rowIndex < headerRows,
                            italics: el.italic,
                            font: DOCX_FONTS.PRIMARY,
                            size: DOCX_FONT_SIZES.BODY,
                            color: DOCX_COLORS.SECONDARY,
                          }),
                      ),
                    }),
                  ],
                  shading:
                    rowIndex < headerRows
                      ? { fill: DOCX_COLORS.TABLE_HEADER || 'F3F4F6' }
                      : undefined,
                  borders: {
                    top: tableBorder,
                    bottom: tableBorder,
                    left: tableBorder,
                    right: tableBorder,
                  },
                }),
            ),
          }),
      ),
    });
  }

  /**
   * Create an empty paragraph
   */
  private createEmptyParagraph(): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: '[Conteudo nao gerado]',
          italics: true,
          font: DOCX_FONTS.PRIMARY,
          size: DOCX_FONT_SIZES.BODY,
          color: DOCX_COLORS.MUTED,
        }),
      ],
    });
  }

  /**
   * Strip HTML tags from string
   */
  private stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Decode common HTML entities
   */
  private decodeHtmlEntities(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
