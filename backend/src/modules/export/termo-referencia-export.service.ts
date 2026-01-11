import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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
  INumberingOptions,
} from 'docx';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { DISCLAIMER } from '../../common/constants/messages';
import {
  DOCX_STYLES,
  DOCX_MARGINS,
  DOCX_FONTS,
  DOCX_FONT_SIZES,
  DOCX_COLORS,
  DEFAULT_DOCUMENT_PROPERTIES,
} from './docx.config';
import { HtmlToDocxParser } from './html-to-docx.parser';

/**
 * Export formats supported for Termo de Referencia.
 */
export enum TrExportFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  JSON = 'json',
}

/**
 * Known Chromium executable paths across different environments.
 * Order matters - most common production paths first.
 *
 * @see https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
 */
const CHROMIUM_STATIC_PATHS = [
  '/run/current-system/sw/bin/chromium',
  '/run/current-system/sw/bin/chromium-browser',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/lib/chromium/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/snap/bin/chromium',
];

/**
 * Section labels for Termo de Referencia export.
 */
const TR_SECTION_LABELS: Record<string, string> = {
  objeto: 'Do Objeto',
  fundamentacaoLegal: 'Da Fundamentacao Legal',
  descricaoSolucao: 'Da Descricao da Solucao',
  requisitosContratacao: 'Dos Requisitos da Contratacao',
  modeloExecucao: 'Do Modelo de Execucao',
  modeloGestao: 'Do Modelo de Gestao',
  criteriosSelecao: 'Dos Criterios de Selecao',
  valorEstimado: 'Do Valor Estimado',
  dotacaoOrcamentaria: 'Da Dotacao Orcamentaria',
  prazoVigencia: 'Do Prazo de Vigencia',
  obrigacoesContratante: 'Das Obrigacoes do Contratante',
  obrigacoesContratada: 'Das Obrigacoes da Contratada',
  sancoesPenalidades: 'Das Sancoes e Penalidades',
  garantiaContratual: 'Da Garantia Contratual',
  condicoesPagamento: 'Das Condicoes de Pagamento',
};

/**
 * Service for exporting Termo de Referencia documents.
 *
 * Supports PDF and DOCX formats with official Brazilian government formatting.
 * PDF generation uses Puppeteer with Chromium for high-fidelity output.
 * DOCX generation uses docx library following ABNT NBR standards.
 *
 * Issue #1252 - [TR-e] Export TR em PDF/DOCX com formatacao oficial
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Injectable()
export class TermoReferenciaExportService {
  private readonly logger = new Logger(TermoReferenciaExportService.name);
  private template: Handlebars.TemplateDelegate;
  private readonly htmlParser: HtmlToDocxParser;
  private chromiumPath: string | undefined;

  constructor(
    @InjectRepository(TermoReferencia)
    private termoReferenciaRepository: Repository<TermoReferencia>,
    @InjectRepository(Etp)
    private etpRepository: Repository<Etp>,
  ) {
    this.loadTemplate();
    this.registerHandlebarsHelpers();
    this.htmlParser = new HtmlToDocxParser();
    this.detectChromiumPath();
  }

  /**
   * Detects and caches the Chromium executable path.
   * Detection order:
   *   1. PUPPETEER_EXECUTABLE_PATH env var
   *   2. Nix store glob patterns (dynamic discovery for Nixpacks)
   *   3. Static known paths (common Linux/macOS locations)
   *   4. `which` command (Unix shell detection)
   *   5. Puppeteer bundled Chromium (fallback)
   */
  private detectChromiumPath(): void {
    const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && this.isValidExecutable(envPath)) {
      this.chromiumPath = envPath;
      this.logger.log(`Using Chromium from env: ${envPath}`);
      return;
    }

    const nixChromium = this.findChromiumInNixStore();
    if (nixChromium) {
      this.chromiumPath = nixChromium;
      this.logger.log(`Found Chromium in Nix store: ${nixChromium}`);
      return;
    }

    for (const candidatePath of CHROMIUM_STATIC_PATHS) {
      if (this.isValidExecutable(candidatePath)) {
        this.chromiumPath = candidatePath;
        this.logger.log(`Found Chromium at: ${candidatePath}`);
        return;
      }
    }

    try {
      const whichResult = execSync(
        'which chromium-browser chromium google-chrome 2>/dev/null || true',
        { encoding: 'utf-8' },
      )
        .trim()
        .split('\n')[0];
      if (whichResult && this.isValidExecutable(whichResult)) {
        this.chromiumPath = whichResult;
        this.logger.log(`Found Chromium via 'which': ${whichResult}`);
        return;
      }
    } catch {
      // 'which' command not available or failed - continue
    }

    this.chromiumPath = undefined;
    this.logger.warn(
      'No system Chromium found. PDF export may fail if PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is enabled.',
    );
  }

  /**
   * Searches for Chromium executable in the Nix store.
   */
  private findChromiumInNixStore(): string | undefined {
    const nixStorePath = '/nix/store';

    if (!fs.existsSync(nixStorePath)) {
      return undefined;
    }

    this.logger.debug('Searching for Chromium in Nix store...');

    try {
      const storeEntries = fs.readdirSync(nixStorePath);
      const chromiumDirs = storeEntries.filter(
        (entry) =>
          entry.includes('-chromium-') || entry.includes('-ungoogled-chromium'),
      );

      chromiumDirs.sort().reverse();

      for (const dir of chromiumDirs) {
        const binPaths = [
          path.join(nixStorePath, dir, 'bin', 'chromium'),
          path.join(nixStorePath, dir, 'bin', 'chromium-browser'),
        ];

        for (const binPath of binPaths) {
          if (this.isValidExecutable(binPath)) {
            return binPath;
          }
        }
      }
    } catch (error) {
      this.logger.debug(
        `Error scanning Nix store: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return undefined;
  }

  /**
   * Checks if a file exists and is executable.
   */
  private isValidExecutable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private loadTemplate(): void {
    try {
      const templatePath = path.join(__dirname, 'templates', 'tr-template.hbs');
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
      this.logger.log('TR template loaded successfully');
    } catch (error) {
      this.logger.error('Error loading TR template:', error);
      this.template = Handlebars.compile(
        '<html><body><h1>Termo de Referencia - {{tr.objeto}}</h1></body></html>',
      );
    }
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('pt-BR');
    });

    Handlebars.registerHelper('formatCurrency', (value: number) => {
      if (!value && value !== 0) return 'N/A';
      return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    Handlebars.registerHelper('formatStatus', (status: string) => {
      const statusMap: Record<string, string> = {
        draft: 'Rascunho',
        review: 'Em Revisao',
        approved: 'Aprovado',
        archived: 'Arquivado',
      };
      return statusMap[status] || status;
    });

    Handlebars.registerHelper('formatText', (text: string) => {
      if (!text) return '';
      // Convert newlines to <br> and wrap paragraphs
      return new Handlebars.SafeString(
        text
          .split(/\n\n+/)
          .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join(''),
      );
    });

    Handlebars.registerHelper(
      'formatJson',
      (obj: Record<string, unknown> | unknown[] | null | undefined) => {
        if (!obj) return '';
        try {
          if (Array.isArray(obj)) {
            return new Handlebars.SafeString(
              `<ul>${obj.map((item) => `<li>${typeof item === 'object' ? JSON.stringify(item) : item}</li>`).join('')}</ul>`,
            );
          }
          return new Handlebars.SafeString(
            `<ul>${Object.entries(obj)
              .map(
                ([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`,
              )
              .join('')}</ul>`,
          );
        } catch {
          return JSON.stringify(obj, null, 2);
        }
      },
    );

    Handlebars.registerHelper(
      'formatCronograma',
      (cronograma: Record<string, unknown> | null) => {
        if (!cronograma) return '';
        try {
          const etapas = Array.isArray(cronograma.etapas)
            ? cronograma.etapas
            : [];
          if (etapas.length === 0) return '<p>Cronograma nao definido</p>';

          let html =
            '<table class="cronograma-table"><thead><tr><th>Etapa</th><th>Descricao</th><th>Prazo</th></tr></thead><tbody>';
          etapas.forEach((etapa: Record<string, unknown>, index: number) => {
            html += `<tr><td>${index + 1}</td><td>${etapa.descricao || ''}</td><td>${etapa.prazo || ''}</td></tr>`;
          });
          html += '</tbody></table>';
          return new Handlebars.SafeString(html);
        } catch {
          return '';
        }
      },
    );
  }

  /**
   * Exports a Termo de Referencia to PDF format.
   *
   * @param trId - The TR UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns Buffer containing the PDF file
   * @throws {NotFoundException} If TR not found
   * @throws {InternalServerErrorException} If PDF generation fails
   */
  async exportToPDF(trId: string, organizationId: string): Promise<Buffer> {
    this.logger.log(`Exporting TR ${trId} to PDF`);

    const tr = await this.getTrWithRelations(trId, organizationId);
    const etp = await this.getEtpById(tr.etpId);
    const html = this.generateHTML(tr, etp);

    let browser: puppeteer.Browser | null = null;

    try {
      const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--single-process',
        ],
      };

      if (this.chromiumPath) {
        launchOptions.executablePath = this.chromiumPath;
        this.logger.debug(
          `Launching Puppeteer with Chromium: ${this.chromiumPath}`,
        );
      } else {
        this.logger.debug('Launching Puppeteer with bundled Chromium');
      }

      browser = await puppeteer.launch(launchOptions);
      this.logger.debug('Browser launched successfully');

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '2.5cm',
          right: '2cm',
          bottom: '2cm',
          left: '2.5cm',
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
            TERMO DE REFERENCIA
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
            Pagina <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
      });

      this.logger.log(
        `PDF generated successfully for TR ${trId} (${pdfBuffer.length} bytes)`,
      );
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate PDF for TR ${trId}: ${errorMessage}`,
        errorStack,
      );

      if (
        errorMessage.includes('Could not find Chrome') ||
        errorMessage.includes('Failed to launch') ||
        errorMessage.includes('ENOENT')
      ) {
        throw new InternalServerErrorException(
          'Chromium nao encontrado no servidor. ' +
            'Verifique a instalacao do Puppeteer/Chromium no ambiente de producao.',
        );
      }

      if (
        errorMessage.includes('Navigation timeout') ||
        errorMessage.includes('net::ERR_')
      ) {
        throw new InternalServerErrorException(
          'Erro ao renderizar o documento PDF. ' +
            'Tente novamente ou exporte em formato DOCX.',
        );
      }

      throw new InternalServerErrorException(
        `Erro ao gerar PDF: ${errorMessage}. ` +
          'Tente novamente ou exporte em formato DOCX como alternativa.',
      );
    } finally {
      if (browser) {
        try {
          await browser.close();
          this.logger.debug('Browser closed successfully');
        } catch (closeError) {
          this.logger.error(
            `Failed to close browser: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`,
          );
        }
      }
    }
  }

  /**
   * Exports a Termo de Referencia to DOCX format.
   *
   * @param trId - The TR UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns Buffer containing the DOCX file
   * @throws {NotFoundException} If TR not found
   */
  async exportToDocx(trId: string, organizationId: string): Promise<Buffer> {
    this.logger.log(`Exporting TR ${trId} to DOCX`);

    const tr = await this.getTrWithRelations(trId, organizationId);
    const etp = await this.getEtpById(tr.etpId);

    const numberingConfig: INumberingOptions = {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    };

    const doc = new Document({
      styles: DOCX_STYLES,
      numbering: numberingConfig,
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
                        'Pagina ',
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
                  text: 'TERMO DE REFERENCIA',
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
                  text: tr.objeto,
                  italics: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.HEADING_3,
                  color: DOCX_COLORS.SECONDARY,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Metadata table
            ...this.createMetadataTable(tr, etp),

            // Sections
            ...this.createTrSectionsParagraphs(tr),

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
                  text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`,
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
      title: `Termo de Referencia - ${tr.objeto}`,
      subject: `Termo de Referencia para contratacao de ${tr.objeto}`,
      keywords: [
        ...DEFAULT_DOCUMENT_PROPERTIES.keywords!,
        'Termo de Referencia',
        'TR',
      ].join(', '),
      description: `Termo de Referencia gerado a partir do ETP`,
    });

    const buffer = await Packer.toBuffer(doc);
    this.logger.log('DOCX generated successfully for TR');
    return buffer;
  }

  /**
   * Exports a Termo de Referencia to JSON format.
   *
   * @param trId - The TR UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns JSON representation of the TR
   */
  async exportToJSON(
    trId: string,
    organizationId: string,
  ): Promise<Record<string, unknown>> {
    this.logger.log(`Exporting TR ${trId} to JSON`);

    const tr = await this.getTrWithRelations(trId, organizationId);

    return {
      termoReferencia: {
        id: tr.id,
        objeto: tr.objeto,
        fundamentacaoLegal: tr.fundamentacaoLegal,
        descricaoSolucao: tr.descricaoSolucao,
        requisitosContratacao: tr.requisitosContratacao,
        modeloExecucao: tr.modeloExecucao,
        modeloGestao: tr.modeloGestao,
        criteriosSelecao: tr.criteriosSelecao,
        valorEstimado: tr.valorEstimado,
        dotacaoOrcamentaria: tr.dotacaoOrcamentaria,
        prazoVigencia: tr.prazoVigencia,
        obrigacoesContratante: tr.obrigacoesContratante,
        obrigacoesContratada: tr.obrigacoesContratada,
        sancoesPenalidades: tr.sancoesPenalidades,
        garantiaContratual: tr.garantiaContratual,
        condicoesPagamento: tr.condicoesPagamento,
        localExecucao: tr.localExecucao,
        subcontratacao: tr.subcontratacao,
        cronograma: tr.cronograma,
        especificacoesTecnicas: tr.especificacoesTecnicas,
        status: tr.status,
        versao: tr.versao,
        createdAt: tr.createdAt,
        updatedAt: tr.updatedAt,
      },
      etpId: tr.etpId,
      organizationId: tr.organizationId,
      exportedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Creates metadata table for DOCX export.
   */
  private createMetadataTable(
    tr: TermoReferencia,
    etp: Etp | null,
  ): (Paragraph | Table)[] {
    const noBorder = {
      style: BorderStyle.NONE,
      size: 0,
      color: 'FFFFFF',
    };

    const metadataRows: { label: string; value: string }[] = [
      { label: 'Processo', value: etp?.numeroProcesso || 'Nao informado' },
      { label: 'ETP de Origem', value: etp?.title || 'Nao informado' },
      {
        label: 'Valor Estimado',
        value: tr.valorEstimado
          ? `R$ ${Number(tr.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : 'Nao informado',
      },
      { label: 'Status', value: this.formatStatus(tr.status) },
      { label: 'Versao', value: `v${tr.versao}` },
      {
        label: 'Prazo de Vigencia',
        value: tr.prazoVigencia ? `${tr.prazoVigencia} dias` : 'Nao informado',
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
            text: 'Informacoes Gerais',
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

  /**
   * Creates section paragraphs for DOCX export.
   */
  private createTrSectionsParagraphs(
    tr: TermoReferencia,
  ): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    const sections: { key: keyof TermoReferencia; order: number }[] = [
      { key: 'objeto', order: 1 },
      { key: 'fundamentacaoLegal', order: 2 },
      { key: 'descricaoSolucao', order: 3 },
      { key: 'requisitosContratacao', order: 4 },
      { key: 'modeloExecucao', order: 5 },
      { key: 'modeloGestao', order: 6 },
      { key: 'criteriosSelecao', order: 7 },
      { key: 'obrigacoesContratante', order: 11 },
      { key: 'obrigacoesContratada', order: 12 },
      { key: 'sancoesPenalidades', order: 13 },
    ];

    // Add optional sections if they have content
    if (tr.garantiaContratual) {
      sections.push({ key: 'garantiaContratual', order: 14 });
    }
    if (tr.condicoesPagamento) {
      sections.push({ key: 'condicoesPagamento', order: 15 });
    }

    sections.forEach((section) => {
      const content = tr[section.key];
      const label = TR_SECTION_LABELS[section.key] || String(section.key);

      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: `${section.order}. ${label}`,
              bold: true,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.HEADING_1,
              color: DOCX_COLORS.PRIMARY,
            }),
          ],
          spacing: { before: 400, after: 200 },
        }),
      );

      if (content && typeof content === 'string') {
        const contentElements = this.parseContentToDocxElements(content);
        elements.push(...contentElements);
      } else {
        elements.push(
          new Paragraph({
            style: 'bodyText',
            children: [
              new TextRun({
                text: '[Conteudo nao informado]',
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

    // Add valor estimado section
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '8. Do Valor Estimado',
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.HEADING_1,
            color: DOCX_COLORS.PRIMARY,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    );

    if (tr.valorEstimado) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `R$ ${Number(tr.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              bold: true,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.HEADING_2,
              color: DOCX_COLORS.PRIMARY,
            }),
          ],
          spacing: { before: 200, after: 200 },
        }),
      );
    } else {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[Valor estimado nao informado]',
              italics: true,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.BODY,
              color: DOCX_COLORS.MUTED,
            }),
          ],
        }),
      );
    }

    // Add dotacao orcamentaria section
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '9. Da Dotacao Orcamentaria',
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.HEADING_1,
            color: DOCX_COLORS.PRIMARY,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    );

    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              tr.dotacaoOrcamentaria ||
              '[A ser indicada no momento da contratacao]',
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: tr.dotacaoOrcamentaria
              ? DOCX_COLORS.SECONDARY
              : DOCX_COLORS.MUTED,
            italics: !tr.dotacaoOrcamentaria,
          }),
        ],
      }),
    );

    // Add prazo de vigencia section
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '10. Do Prazo de Vigencia',
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.HEADING_1,
            color: DOCX_COLORS.PRIMARY,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    );

    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: tr.prazoVigencia
              ? `O prazo de vigencia do contrato sera de ${tr.prazoVigencia} dias, contados a partir da data de sua assinatura.`
              : '[Prazo de vigencia nao informado]',
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: tr.prazoVigencia ? DOCX_COLORS.SECONDARY : DOCX_COLORS.MUTED,
            italics: !tr.prazoVigencia,
          }),
        ],
      }),
    );

    return elements;
  }

  /**
   * Parse content to DOCX elements with rich text support.
   */
  private parseContentToDocxElements(content: string): (Paragraph | Table)[] {
    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    if (isHtml) {
      return this.htmlParser.parse(content);
    }

    return this.parseContentToParagraphs(content);
  }

  /**
   * Parse plain text content to paragraphs.
   */
  private parseContentToParagraphs(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const blocks = content.split(/\n\n+/);

    blocks.forEach((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

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

  /**
   * Parse inline formatting (bold, italic) in text.
   */
  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[2]) {
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
      review: 'Em Revisao',
      approved: 'Aprovado',
      archived: 'Arquivado',
    };
    return statusMap[status] || status;
  }

  private generateHTML(tr: TermoReferencia, etp: Etp | null): string {
    const data = {
      tr: {
        ...tr,
        organization: tr.organization || {},
        createdBy: tr.createdBy || {},
      },
      etpNumeroProcesso: etp?.numeroProcesso || null,
      generatedAt: new Date(),
    };

    return this.template(data);
  }

  /**
   * Retrieves a TR with relations for export.
   */
  private async getTrWithRelations(
    trId: string,
    organizationId: string,
  ): Promise<TermoReferencia> {
    const tr = await this.termoReferenciaRepository
      .createQueryBuilder('tr')
      .leftJoinAndSelect('tr.organization', 'organization')
      .leftJoinAndSelect('tr.createdBy', 'createdBy')
      .where('tr.id = :trId', { trId })
      .andWhere('tr.organizationId = :organizationId', { organizationId })
      .getOne();

    if (!tr) {
      throw new NotFoundException(
        `Termo de Referencia ${trId} nao encontrado ou sem permissao de acesso`,
      );
    }

    return tr;
  }

  /**
   * Retrieves an ETP by ID for reference.
   */
  private async getEtpById(etpId: string): Promise<Etp | null> {
    try {
      return await this.etpRepository.findOne({
        where: { id: etpId },
        select: ['id', 'title', 'numeroProcesso', 'objeto'],
      });
    } catch {
      return null;
    }
  }
}
