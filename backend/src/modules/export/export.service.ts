import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  Footer,
  PageNumber,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { DISCLAIMER } from '../../common/constants/messages';
import {
  DOCX_STYLES,
  DOCX_MARGINS,
  DOCX_FONTS,
  DOCX_FONT_SIZES,
  DOCX_COLORS,
  DEFAULT_DOCUMENT_PROPERTIES,
  ETP_SECTION_LABELS,
} from './docx.config';

export enum ExportFormat {
  PDF = 'pdf',
  JSON = 'json',
  XML = 'xml',
  DOCX = 'docx',
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private template: HandlebarsTemplateDelegate;

  constructor(
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
    @InjectRepository(EtpSection)
    private sectionsRepository: Repository<EtpSection>,
  ) {
    this.loadTemplate();
    this.registerHandlebarsHelpers();
  }

  private loadTemplate() {
    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        'etp-template.hbs',
      );
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
      this.logger.log('Template loaded successfully');
    } catch (error) {
      this.logger.error('Error loading template:', error);
      // Fallback to basic template
      this.template = Handlebars.compile(
        '<html><body><h1>{{etp.title}}</h1></body></html>',
      );
    }
  }

  private registerHandlebarsHelpers() {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('pt-BR');
    });

    Handlebars.registerHelper('formatCurrency', (value: number) => {
      if (!value) return 'N/A';
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });
  }

  async exportToPDF(etpId: string): Promise<Buffer> {
    this.logger.log(`Exporting ETP ${etpId} to PDF`);

    const etp = await this.getEtpWithSections(etpId);
    const html = this.generateHTML(etp);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
        },
        printBackground: true,
      });

      this.logger.log('PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async exportToJSON(etpId: string): Promise<Record<string, unknown>> {
    this.logger.log(`Exporting ETP ${etpId} to JSON`);

    const etp = await this.getEtpWithSections(etpId);

    return {
      etp: {
        id: etp.id,
        title: etp.title,
        description: etp.description,
        objeto: etp.objeto,
        numeroProcesso: etp.numeroProcesso,
        valorEstimado: etp.valorEstimado,
        status: etp.status,
        metadata: etp.metadata,
        currentVersion: etp.currentVersion,
        completionPercentage: etp.completionPercentage,
        createdAt: etp.createdAt,
        updatedAt: etp.updatedAt,
      },
      sections: etp.sections.map((section) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        content: section.content,
        userInput: section.userInput,
        status: section.status,
        order: section.order,
        metadata: section.metadata,
        validationResults: section.validationResults,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      })),
      exportedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };
  }

  async exportToXML(etpId: string): Promise<string> {
    this.logger.log(`Exporting ETP ${etpId} to XML`);

    const etp = await this.getEtpWithSections(etpId);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<etp>\n';
    xml += `  <id>${this.escapeXml(etp.id)}</id>\n`;
    xml += `  <title>${this.escapeXml(etp.title)}</title>\n`;
    xml += `  <description>${this.escapeXml(etp.description || '')}</description>\n`;
    xml += `  <objeto>${this.escapeXml(etp.objeto)}</objeto>\n`;
    xml += `  <numeroProcesso>${this.escapeXml(etp.numeroProcesso || '')}</numeroProcesso>\n`;
    xml += `  <valorEstimado>${etp.valorEstimado || 0}</valorEstimado>\n`;
    xml += `  <status>${this.escapeXml(etp.status)}</status>\n`;
    xml += `  <currentVersion>${etp.currentVersion}</currentVersion>\n`;
    xml += `  <completionPercentage>${etp.completionPercentage}</completionPercentage>\n`;
    xml += `  <createdAt>${etp.createdAt.toISOString()}</createdAt>\n`;
    xml += `  <updatedAt>${etp.updatedAt.toISOString()}</updatedAt>\n`;

    xml += '  <sections>\n';
    etp.sections.forEach((section) => {
      xml += '    <section>\n';
      xml += `      <id>${this.escapeXml(section.id)}</id>\n`;
      xml += `      <type>${this.escapeXml(section.type)}</type>\n`;
      xml += `      <title>${this.escapeXml(section.title)}</title>\n`;
      xml += `      <content><![CDATA[${section.content || ''}]]></content>\n`;
      xml += `      <status>${this.escapeXml(section.status)}</status>\n`;
      xml += `      <order>${section.order}</order>\n`;
      xml += `      <createdAt>${section.createdAt.toISOString()}</createdAt>\n`;
      xml += '    </section>\n';
    });
    xml += '  </sections>\n';

    xml += `  <disclaimer>${this.escapeXml(DISCLAIMER)}</disclaimer>\n`;
    xml += '</etp>\n';

    return xml;
  }

  async exportToDocx(etpId: string): Promise<Buffer> {
    this.logger.log(`Exporting ETP ${etpId} to DOCX`);

    const etp = await this.getEtpWithSections(etpId);

    const doc = new Document({
      styles: DOCX_STYLES,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: DOCX_MARGINS.TOP,
                right: DOCX_MARGINS.RIGHT,
                bottom: DOCX_MARGINS.BOTTOM,
                left: DOCX_MARGINS.LEFT,
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [
                        'Página ',
                        PageNumber.CURRENT,
                        ' de ',
                        PageNumber.TOTAL_PAGES,
                      ],
                      font: DOCX_FONTS.PRIMARY,
                      size: DOCX_FONT_SIZES.FOOTER,
                      color: DOCX_COLORS.MUTED,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // Title
            new Paragraph({
              style: 'etpTitle',
              children: [
                new TextRun({
                  text: etp.title,
                  bold: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.TITLE,
                  color: DOCX_COLORS.PRIMARY,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Subtitle (objeto)
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: etp.objeto,
                  italics: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.HEADING_3,
                  color: DOCX_COLORS.SECONDARY,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Metadata table
            ...this.createMetadataTable(etp),

            // Sections
            ...this.createSectionsParagraphs(etp.sections),

            // Disclaimer
            new Paragraph({
              style: 'disclaimer',
              children: [
                new TextRun({
                  text: 'Aviso: ',
                  bold: true,
                  italics: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.CAPTION,
                  color: DOCX_COLORS.MUTED,
                }),
                new TextRun({
                  text: DISCLAIMER,
                  italics: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.CAPTION,
                  color: DOCX_COLORS.MUTED,
                }),
              ],
              spacing: { before: 600 },
            }),

            // Generated at
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.FOOTER,
                  color: DOCX_COLORS.MUTED,
                }),
              ],
              spacing: { before: 200 },
            }),
          ],
        },
      ],
      creator: DEFAULT_DOCUMENT_PROPERTIES.creator,
      title: etp.title,
      subject: `Estudo Técnico Preliminar - ${etp.objeto}`,
      keywords: DEFAULT_DOCUMENT_PROPERTIES.keywords?.join(', '),
      description: etp.description || `ETP para ${etp.objeto}`,
    });

    const buffer = await Packer.toBuffer(doc);
    this.logger.log('DOCX generated successfully');
    return buffer;
  }

  private createMetadataTable(etp: Etp): (Paragraph | Table)[] {
    const noBorder = {
      style: BorderStyle.NONE,
      size: 0,
      color: 'FFFFFF',
    };

    const metadataRows: { label: string; value: string }[] = [
      { label: 'Processo', value: etp.numeroProcesso || 'Não informado' },
      {
        label: 'Valor Estimado',
        value: etp.valorEstimado
          ? `R$ ${Number(etp.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : 'Não informado',
      },
      { label: 'Status', value: this.formatStatus(etp.status) },
      { label: 'Versão', value: `v${etp.currentVersion}` },
      {
        label: 'Unidade Requisitante',
        value: etp.metadata?.unidadeRequisitante || 'Não informado',
      },
      {
        label: 'Responsável Técnico',
        value: etp.metadata?.responsavelTecnico || 'Não informado',
      },
    ];

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
        insideHorizontal: noBorder,
        insideVertical: noBorder,
      },
      rows: metadataRows.map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${row.label}:`,
                        bold: true,
                        font: DOCX_FONTS.PRIMARY,
                        size: DOCX_FONT_SIZES.BODY,
                        color: DOCX_COLORS.SECONDARY,
                      }),
                    ],
                  }),
                ],
                borders: {
                  top: noBorder,
                  bottom: noBorder,
                  left: noBorder,
                  right: noBorder,
                },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: row.value,
                        font: DOCX_FONTS.PRIMARY,
                        size: DOCX_FONT_SIZES.BODY,
                        color: DOCX_COLORS.SECONDARY,
                      }),
                    ],
                  }),
                ],
                borders: {
                  top: noBorder,
                  bottom: noBorder,
                  left: noBorder,
                  right: noBorder,
                },
              }),
            ],
          }),
      ),
    });

    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: 'Informações Gerais',
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.HEADING_2,
            color: DOCX_COLORS.PRIMARY,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      table,
      new Paragraph({ spacing: { after: 400 } }),
    ];
  }

  private createSectionsParagraphs(sections: EtpSection[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    sortedSections.forEach((section, index) => {
      // Section title
      const sectionLabel =
        ETP_SECTION_LABELS[section.type.toUpperCase()] || section.title;

      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: `${index + 1}. ${sectionLabel}`,
              bold: true,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.HEADING_1,
              color: DOCX_COLORS.PRIMARY,
            }),
          ],
          spacing: { before: 400, after: 200 },
        }),
      );

      // Section content
      if (section.content) {
        const contentParagraphs = this.parseContentToParagraphs(
          section.content,
        );
        paragraphs.push(...contentParagraphs);
      } else {
        paragraphs.push(
          new Paragraph({
            style: 'bodyText',
            children: [
              new TextRun({
                text: '[Conteúdo não gerado]',
                italics: true,
                font: DOCX_FONTS.PRIMARY,
                size: DOCX_FONT_SIZES.BODY,
                color: DOCX_COLORS.MUTED,
              }),
            ],
          }),
        );
      }
    });

    return paragraphs;
  }

  private parseContentToParagraphs(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Split by double newlines for paragraphs
    const blocks = content.split(/\n\n+/);

    blocks.forEach((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

      // Check for bullet points
      if (trimmedBlock.match(/^[-•*]\s/m)) {
        const lines = trimmedBlock.split('\n');
        lines.forEach((line) => {
          const bulletMatch = line.match(/^[-•*]\s+(.*)$/);
          if (bulletMatch) {
            paragraphs.push(
              new Paragraph({
                bullet: { level: 0 },
                children: [
                  new TextRun({
                    text: bulletMatch[1],
                    font: DOCX_FONTS.PRIMARY,
                    size: DOCX_FONT_SIZES.BODY,
                    color: DOCX_COLORS.SECONDARY,
                  }),
                ],
              }),
            );
          }
        });
      } else {
        // Regular paragraph - handle markdown bold/italic
        const children = this.parseInlineFormatting(trimmedBlock);
        paragraphs.push(
          new Paragraph({
            style: 'bodyText',
            children,
            spacing: { after: 200 },
          }),
        );
      }
    });

    return paragraphs;
  }

  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];

    // Simple regex-based parsing for **bold** and *italic*
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[2]) {
        // Bold text
        runs.push(
          new TextRun({
            text: match[2],
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
        );
      } else if (match[3]) {
        // Italic text
        runs.push(
          new TextRun({
            text: match[3],
            italics: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
        );
      } else if (match[4]) {
        // Regular text
        runs.push(
          new TextRun({
            text: match[4],
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
        );
      }
    }

    // If no matches, return the whole text as a single run
    if (runs.length === 0) {
      runs.push(
        new TextRun({
          text,
          font: DOCX_FONTS.PRIMARY,
          size: DOCX_FONT_SIZES.BODY,
          color: DOCX_COLORS.SECONDARY,
        }),
      );
    }

    return runs;
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Rascunho',
      in_progress: 'Em Andamento',
      review: 'Em Revisão',
      completed: 'Concluído',
      archived: 'Arquivado',
    };
    return statusMap[status] || status;
  }

  private generateHTML(etp: Etp): string {
    const data = {
      etp: {
        ...etp,
        metadata: etp.metadata || {},
      },
      sections: etp.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          ...section,
          content: this.formatContent(section.content || ''),
        })),
      generatedAt: new Date(),
    };

    return this.template(data);
  }

  private formatContent(content: string): string {
    // Convert markdown-like formatting to HTML
    const formatted = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    return `<p>${formatted}</p>`;
  }

  private async getEtpWithSections(etpId: string): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id: etpId },
      relations: ['sections', 'createdBy'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP ${etpId} não encontrado`);
    }

    // Sort sections by order
    etp.sections.sort((a, b) => a.order - b.order);

    return etp;
  }

  private escapeXml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
