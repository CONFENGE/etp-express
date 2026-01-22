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
} from 'docx';
import { Edital, EditalModalidade } from '../../entities/edital.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { PesquisaPrecos } from '../../entities/pesquisa-precos.entity';
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
 * Export formats supported for Edital.
 */
export enum EditalExportFormat {
  PDF = 'pdf',
  DOCX = 'docx',
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
 * Service for exporting Edital documents.
 *
 * Supports PDF and DOCX formats with official Brazilian government formatting
 * following Lei 14.133/2021 requirements.
 *
 * PDF generation uses Puppeteer with Chromium for high-fidelity output.
 * DOCX generation uses docx library with professional formatting.
 *
 * Issue #1282 - [Edital-f] Export edital formatado PDF/DOCX
 * Parent: #1276 - [Edital] Módulo de Geração de Edital - EPIC
 * Milestone: M14 - Geração de Edital
 */
@Injectable()
export class EditalExportService {
  private readonly logger = new Logger(EditalExportService.name);
  private template: Handlebars.TemplateDelegate;
  private readonly htmlParser: HtmlToDocxParser;
  private chromiumPath: string | undefined;

  constructor(
    @InjectRepository(Edital)
    private editalRepository: Repository<Edital>,
    @InjectRepository(Etp)
    private etpRepository: Repository<Etp>,
    @InjectRepository(TermoReferencia)
    private termoReferenciaRepository: Repository<TermoReferencia>,
    @InjectRepository(PesquisaPrecos)
    private pesquisaPrecosRepository: Repository<PesquisaPrecos>,
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
      const templatePath = path.join(
        __dirname,
        'templates',
        'edital-pdf.template.hbs',
      );
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
      this.logger.log('Edital template loaded successfully');
    } catch (error) {
      this.logger.error('Error loading Edital template:', error);
      this.template = Handlebars.compile(
        '<html><body><h1>EDITAL - {{edital.numero}}</h1><h2>{{edital.objeto}}</h2></body></html>',
      );
    }
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date | string | null) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('pt-BR');
    });

    Handlebars.registerHelper('formatCurrency', (value: string | number) => {
      if (!value && value !== 0) return 'N/A';
      return Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    });

    Handlebars.registerHelper('formatModalidade', (modalidade: string) => {
      const modalidadeMap: Record<string, string> = {
        PREGAO: 'Pregão',
        CONCORRENCIA: 'Concorrência',
        CONCURSO: 'Concurso',
        LEILAO: 'Leilão',
        DIALOGO_COMPETITIVO: 'Diálogo Competitivo',
      };
      return modalidadeMap[modalidade] || modalidade;
    });

    Handlebars.registerHelper('formatText', (text: string) => {
      if (!text) return '';
      return new Handlebars.SafeString(
        text
          .split(/\n\n+/)
          .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join(''),
      );
    });
  }

  /**
   * Exports an Edital to PDF format.
   *
   * @param editalId - The Edital UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns Buffer containing the PDF file
   * @throws {NotFoundException} If Edital not found
   * @throws {InternalServerErrorException} If PDF generation fails
   */
  async exportToPDF(
    editalId: string,
    organizationId: string,
  ): Promise<Buffer> {
    this.logger.log(`Exporting Edital ${editalId} to PDF`);

    const edital = await this.getEditalWithRelations(editalId, organizationId);
    const { etp, termoReferencia, pesquisaPrecos } =
      await this.getRelatedDocuments(edital);

    const html = this.generateHTML(edital, etp, termoReferencia, pesquisaPrecos);

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
          top: '3cm',
          right: '2cm',
          bottom: '2.5cm',
          left: '2cm',
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #333; padding-top: 10px;">
            <strong>EDITAL ${edital.numero || ''}</strong>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding-bottom: 10px;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
      });

      this.logger.log(
        `PDF generated successfully for Edital ${editalId} (${pdfBuffer.length} bytes)`,
      );
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate PDF for Edital ${editalId}: ${errorMessage}`,
        errorStack,
      );

      if (
        errorMessage.includes('Could not find Chrome') ||
        errorMessage.includes('Failed to launch') ||
        errorMessage.includes('ENOENT')
      ) {
        throw new InternalServerErrorException(
          'Chromium não encontrado no servidor. ' +
            'Verifique a instalação do Puppeteer/Chromium no ambiente de produção.',
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
   * Exports an Edital to DOCX format.
   *
   * @param editalId - The Edital UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns Buffer containing the DOCX file
   * @throws {NotFoundException} If Edital not found
   */
  async exportToDocx(
    editalId: string,
    organizationId: string,
  ): Promise<Buffer> {
    this.logger.log(`Exporting Edital ${editalId} to DOCX`);

    const edital = await this.getEditalWithRelations(editalId, organizationId);
    const { etp, termoReferencia, pesquisaPrecos } =
      await this.getRelatedDocuments(edital);

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
            // Header - Brasão (placeholder)
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: '[BRASÃO DO ÓRGÃO]',
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.BODY,
                  color: DOCX_COLORS.MUTED,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Organization name
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: edital.organization?.name || 'ÓRGÃO PÚBLICO',
                  bold: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.HEADING_2,
                  color: DOCX_COLORS.PRIMARY,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `EDITAL ${edital.numero || 'N/A'}`,
                  bold: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.TITLE,
                  color: DOCX_COLORS.PRIMARY,
                }),
              ],
              spacing: { after: 200 },
            }),

            // Modalidade
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: this.formatModalidade(edital.modalidade),
                  bold: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.HEADING_3,
                  color: DOCX_COLORS.SECONDARY,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Objeto
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: edital.objeto,
                  italics: true,
                  font: DOCX_FONTS.PRIMARY,
                  size: DOCX_FONT_SIZES.BODY,
                  color: DOCX_COLORS.SECONDARY,
                }),
              ],
              spacing: { after: 600 },
            }),

            // Metadata table
            ...this.createMetadataTable(edital),

            // Main content sections
            ...this.createEditalSections(edital, etp, termoReferencia, pesquisaPrecos),

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
      title: `Edital ${edital.numero || ''} - ${edital.objeto}`,
      subject: `Edital de Licitação - ${this.formatModalidade(edital.modalidade)}`,
      keywords: [
        ...DEFAULT_DOCUMENT_PROPERTIES.keywords!,
        'Edital',
        'Licitação',
        'Lei 14.133/2021',
      ].join(', '),
      description: `Edital de ${this.formatModalidade(edital.modalidade)} para ${edital.objeto}`,
    });

    const buffer = await Packer.toBuffer(doc);
    this.logger.log('DOCX generated successfully for Edital');
    return buffer;
  }

  /**
   * Creates metadata table for DOCX export.
   */
  private createMetadataTable(edital: Edital): (Paragraph | Table)[] {
    const noBorder = {
      style: BorderStyle.NONE,
      size: 0,
      color: 'FFFFFF',
    };

    const metadataRows: { label: string; value: string }[] = [
      { label: 'Número do Edital', value: edital.numero || 'N/A' },
      {
        label: 'Processo Administrativo',
        value: edital.numeroProcesso || 'N/A',
      },
      { label: 'UASG', value: edital.uasg || 'N/A' },
      {
        label: 'Modalidade',
        value: this.formatModalidade(edital.modalidade),
      },
      {
        label: 'Valor Estimado',
        value: edital.valorEstimado
          ? `R$ ${Number(edital.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : edital.sigiloOrcamento
            ? 'SIGILOSO'
            : 'N/A',
      },
      {
        label: 'Data da Sessão Pública',
        value: edital.dataSessaoPublica
          ? new Date(edital.dataSessaoPublica).toLocaleString('pt-BR')
          : 'A definir',
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
                width: { size: 35, type: WidthType.PERCENTAGE },
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
                width: { size: 65, type: WidthType.PERCENTAGE },
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
            text: 'DADOS GERAIS',
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
   * Creates main sections for DOCX export.
   */
  private createEditalSections(
    edital: Edital,
    etp: Etp | null,
    termoReferencia: TermoReferencia | null,
    pesquisaPrecos: PesquisaPrecos | null,
  ): (Paragraph | Table)[] {
    const sections: (Paragraph | Table)[] = [];

    // 1. DO OBJETO
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '1. DO OBJETO',
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.HEADING_1,
            color: DOCX_COLORS.PRIMARY,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: edital.objeto,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
        ],
        spacing: { after: 200 },
      }),
    );

    if (edital.descricaoObjeto) {
      sections.push(
        ...this.htmlParser.parse(edital.descricaoObjeto),
      );
    }

    // 2. DAS CONDIÇÕES DE PARTICIPAÇÃO
    if (edital.condicoesParticipacao) {
      sections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: '2. DAS CONDIÇÕES DE PARTICIPAÇÃO',
              bold: true,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.HEADING_1,
              color: DOCX_COLORS.PRIMARY,
            }),
          ],
          spacing: { before: 400, after: 200 },
        }),
        ...this.htmlParser.parse(edital.condicoesParticipacao),
      );
    }

    // 3. DOS ANEXOS (referência a ETP, TR, Pesquisa)
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: '3. DOS ANEXOS',
            bold: true,
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.HEADING_1,
            color: DOCX_COLORS.PRIMARY,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Fazem parte integrante deste Edital os seguintes documentos:',
            font: DOCX_FONTS.PRIMARY,
            size: DOCX_FONT_SIZES.BODY,
            color: DOCX_COLORS.SECONDARY,
          }),
        ],
        spacing: { after: 200 },
      }),
    );

    if (etp) {
      sections.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: `Anexo I - Estudo Técnico Preliminar (ETP): ${etp.title}`,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.BODY,
              color: DOCX_COLORS.SECONDARY,
            }),
          ],
        }),
      );
    }

    if (termoReferencia) {
      sections.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: `Anexo II - Termo de Referência: ${termoReferencia.objeto}`,
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.BODY,
              color: DOCX_COLORS.SECONDARY,
            }),
          ],
        }),
      );
    }

    if (pesquisaPrecos) {
      sections.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: 'Anexo III - Pesquisa de Preços',
              font: DOCX_FONTS.PRIMARY,
              size: DOCX_FONT_SIZES.BODY,
              color: DOCX_COLORS.SECONDARY,
            }),
          ],
        }),
      );
    }

    return sections;
  }

  private formatModalidade(modalidade: EditalModalidade | null): string {
    if (!modalidade) return 'N/A';
    const modalidadeMap: Record<string, string> = {
      PREGAO: 'Pregão',
      CONCORRENCIA: 'Concorrência',
      CONCURSO: 'Concurso',
      LEILAO: 'Leilão',
      DIALOGO_COMPETITIVO: 'Diálogo Competitivo',
    };
    return modalidadeMap[modalidade] || modalidade;
  }

  private generateHTML(
    edital: Edital,
    etp: Etp | null,
    termoReferencia: TermoReferencia | null,
    pesquisaPrecos: PesquisaPrecos | null,
  ): string {
    const data = {
      edital: {
        ...edital,
        organization: edital.organization || {},
        createdBy: edital.createdBy || {},
      },
      etp: etp || null,
      termoReferencia: termoReferencia || null,
      pesquisaPrecos: pesquisaPrecos || null,
      generatedAt: new Date(),
    };

    return this.template(data);
  }

  /**
   * Retrieves an Edital with relations for export.
   */
  private async getEditalWithRelations(
    editalId: string,
    organizationId: string,
  ): Promise<Edital> {
    const edital = await this.editalRepository
      .createQueryBuilder('edital')
      .leftJoinAndSelect('edital.organization', 'organization')
      .leftJoinAndSelect('edital.createdBy', 'createdBy')
      .where('edital.id = :editalId', { editalId })
      .andWhere('edital.organizationId = :organizationId', { organizationId })
      .getOne();

    if (!edital) {
      throw new NotFoundException(
        `Edital ${editalId} não encontrado ou sem permissão de acesso`,
      );
    }

    return edital;
  }

  /**
   * Retrieves related documents (ETP, TR, Pesquisa de Preços).
   */
  private async getRelatedDocuments(edital: Edital): Promise<{
    etp: Etp | null;
    termoReferencia: TermoReferencia | null;
    pesquisaPrecos: PesquisaPrecos | null;
  }> {
    const [etp, termoReferencia, pesquisaPrecos] = await Promise.all([
      edital.etpId
        ? this.etpRepository.findOne({
            where: { id: edital.etpId },
            select: ['id', 'title', 'objeto', 'numeroProcesso'],
          })
        : Promise.resolve(null),
      edital.termoReferenciaId
        ? this.termoReferenciaRepository.findOne({
            where: { id: edital.termoReferenciaId },
            select: ['id', 'objeto'],
          })
        : Promise.resolve(null),
      edital.pesquisaPrecosId
        ? this.pesquisaPrecosRepository.findOne({
            where: { id: edital.pesquisaPrecosId },
            select: ['id'],
          })
        : Promise.resolve(null),
    ]);

    return { etp, termoReferencia, pesquisaPrecos };
  }
}
