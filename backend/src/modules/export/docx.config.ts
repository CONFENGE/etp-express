/**
 * DOCX Export Configuration
 *
 * Configuration for Word document generation using the docx library.
 * Follows Brazilian government document standards (ABNT NBR).
 */

import {
  AlignmentType,
  convertInchesToTwip,
  IStylesOptions,
  IParagraphStyleOptions,
  IRunStylePropertiesOptions,
  HeadingLevel,
} from 'docx';

/**
 * Font configuration for DOCX export
 */
export const DOCX_FONTS = {
  PRIMARY: 'Arial',
  SECONDARY: 'Times New Roman',
  MONOSPACE: 'Courier New',
} as const;

/**
 * Font sizes in half-points (pt * 2)
 * Standard: 12pt = 24 half-points
 */
export const DOCX_FONT_SIZES = {
  TITLE: 32, // 16pt
  HEADING_1: 28, // 14pt
  HEADING_2: 26, // 13pt
  HEADING_3: 24, // 12pt
  BODY: 24, // 12pt
  CAPTION: 20, // 10pt
  FOOTER: 18, // 9pt
} as const;

/**
 * Document margins in twips (1/1440 inch)
 * ABNT NBR 14724: top/left 3cm, bottom/right 2cm
 */
export const DOCX_MARGINS = {
  TOP: convertInchesToTwip(1.18), // ~3cm
  RIGHT: convertInchesToTwip(0.79), // ~2cm
  BOTTOM: convertInchesToTwip(0.79), // ~2cm
  LEFT: convertInchesToTwip(1.18), // ~3cm
} as const;

/**
 * Line spacing configuration
 */
export const DOCX_LINE_SPACING = {
  SINGLE: 240,
  ONE_AND_HALF: 360, // 1.5 line spacing (ABNT standard)
  DOUBLE: 480,
} as const;

/**
 * Color palette for DOCX styles
 */
export const DOCX_COLORS = {
  PRIMARY: '1a365d', // Dark blue for titles
  SECONDARY: '2d3748', // Dark gray for body
  ACCENT: '2563eb', // Blue for links/highlights
  MUTED: '718096', // Gray for captions
  SUCCESS: '059669', // Green for approved status
  WARNING: 'd97706', // Orange for pending status
  ERROR: 'dc2626', // Red for rejected status
  BORDER: '999999', // Gray for table borders
  TABLE_HEADER: 'F3F4F6', // Light gray for table headers
} as const;

/**
 * Section types for ETP documents
 */
export const ETP_SECTION_LABELS: Record<string, string> = {
  INTRODUCTION: 'Introdução',
  OBJECTIVE: 'Objetivo',
  JUSTIFICATION: 'Justificativa',
  REQUIREMENTS: 'Requisitos da Contratação',
  MARKET_RESEARCH: 'Pesquisa de Mercado',
  SOLUTION_ANALYSIS: 'Análise de Soluções',
  CHOSEN_SOLUTION: 'Solução Escolhida',
  RISKS: 'Riscos e Medidas Mitigadoras',
  SUSTAINABILITY: 'Sustentabilidade',
  BUDGET_ESTIMATE: 'Estimativa de Custos',
  CONCLUSION: 'Conclusão',
} as const;

/**
 * Base run styles for text formatting
 */
export const DOCX_RUN_STYLES: Record<string, IRunStylePropertiesOptions> = {
  title: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.TITLE,
    bold: true,
    color: DOCX_COLORS.PRIMARY,
  },
  heading1: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.HEADING_1,
    bold: true,
    color: DOCX_COLORS.PRIMARY,
  },
  heading2: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.HEADING_2,
    bold: true,
    color: DOCX_COLORS.PRIMARY,
  },
  heading3: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.HEADING_3,
    bold: true,
    color: DOCX_COLORS.SECONDARY,
  },
  body: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.BODY,
    color: DOCX_COLORS.SECONDARY,
  },
  caption: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.CAPTION,
    italics: true,
    color: DOCX_COLORS.MUTED,
  },
  footer: {
    font: DOCX_FONTS.PRIMARY,
    size: DOCX_FONT_SIZES.FOOTER,
    color: DOCX_COLORS.MUTED,
  },
};

/**
 * Document styles configuration for docx library
 */
export const DOCX_STYLES: IStylesOptions = {
  default: {
    document: {
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.BODY,
        color: DOCX_COLORS.SECONDARY,
      },
      paragraph: {
        spacing: {
          line: DOCX_LINE_SPACING.ONE_AND_HALF,
          after: 200,
        },
        alignment: AlignmentType.JUSTIFIED,
      },
    },
    heading1: {
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.HEADING_1,
        bold: true,
        color: DOCX_COLORS.PRIMARY,
      },
      paragraph: {
        spacing: {
          before: 400,
          after: 200,
        },
      },
    },
    heading2: {
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.HEADING_2,
        bold: true,
        color: DOCX_COLORS.PRIMARY,
      },
      paragraph: {
        spacing: {
          before: 300,
          after: 150,
        },
      },
    },
    heading3: {
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.HEADING_3,
        bold: true,
        color: DOCX_COLORS.SECONDARY,
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 100,
        },
      },
    },
  },
  paragraphStyles: [
    {
      id: 'etpTitle',
      name: 'ETP Title',
      basedOn: 'Normal',
      next: 'Normal',
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.TITLE,
        bold: true,
        color: DOCX_COLORS.PRIMARY,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400,
        },
      },
    } as IParagraphStyleOptions,
    {
      id: 'sectionTitle',
      name: 'Section Title',
      basedOn: 'Heading1',
      next: 'Normal',
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.HEADING_1,
        bold: true,
        color: DOCX_COLORS.PRIMARY,
        allCaps: true,
      },
      paragraph: {
        spacing: {
          before: 400,
          after: 200,
        },
      },
    } as IParagraphStyleOptions,
    {
      id: 'bodyText',
      name: 'Body Text',
      basedOn: 'Normal',
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.BODY,
        color: DOCX_COLORS.SECONDARY,
      },
      paragraph: {
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          line: DOCX_LINE_SPACING.ONE_AND_HALF,
          after: 200,
        },
        indent: {
          firstLine: convertInchesToTwip(0.5), // First line indent
        },
      },
    } as IParagraphStyleOptions,
    {
      id: 'captionText',
      name: 'Caption',
      basedOn: 'Normal',
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.CAPTION,
        italics: true,
        color: DOCX_COLORS.MUTED,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 100,
          after: 200,
        },
      },
    } as IParagraphStyleOptions,
    {
      id: 'disclaimer',
      name: 'Disclaimer',
      basedOn: 'Normal',
      run: {
        font: DOCX_FONTS.PRIMARY,
        size: DOCX_FONT_SIZES.CAPTION,
        italics: true,
        color: DOCX_COLORS.MUTED,
      },
      paragraph: {
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          before: 400,
          after: 200,
        },
        border: {
          top: {
            color: DOCX_COLORS.MUTED,
            style: 'single' as const,
            size: 6,
            space: 10,
          },
        },
      },
    } as IParagraphStyleOptions,
  ],
};

/**
 * Document properties configuration
 */
export interface DocxDocumentProperties {
  title: string;
  subject?: string;
  creator?: string;
  keywords?: string[];
  description?: string;
  category?: string;
  lastModifiedBy?: string;
}

/**
 * Default document properties for ETP exports
 */
export const DEFAULT_DOCUMENT_PROPERTIES: Partial<DocxDocumentProperties> = {
  creator: 'ETP Express',
  category: 'Estudo Técnico Preliminar',
  keywords: [
    'ETP',
    'Licitação',
    'Estudo Técnico Preliminar',
    'Contratação Pública',
  ],
};

/**
 * Heading level mapping for section types
 */
export const SECTION_HEADING_LEVELS: Record<
  string,
  (typeof HeadingLevel)[keyof typeof HeadingLevel]
> = {
  main: HeadingLevel.HEADING_1,
  sub: HeadingLevel.HEADING_2,
  detail: HeadingLevel.HEADING_3,
};
