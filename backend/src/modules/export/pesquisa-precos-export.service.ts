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
  PesquisaPrecos,
  MetodologiaPesquisa,
  ItemPesquisado,
  FonteConsultada,
} from '../../entities/pesquisa-precos.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Export formats supported for Pesquisa de Precos.
 */
export enum PesquisaPrecosExportFormat {
  PDF = 'pdf',
  JSON = 'json',
}

/**
 * Known Chromium executable paths across different environments.
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
 * Mapping of MetodologiaPesquisa to IN 65/2021 article references.
 */
const METODOLOGIA_TO_ARTIGO: Record<MetodologiaPesquisa, string> = {
  [MetodologiaPesquisa.PAINEL_PRECOS]: 'inciso I',
  [MetodologiaPesquisa.CONTRATACOES_SIMILARES]: 'inciso II',
  [MetodologiaPesquisa.MIDIA_ESPECIALIZADA]: 'inciso III',
  [MetodologiaPesquisa.SITES_ELETRONICOS]: 'inciso IV',
  [MetodologiaPesquisa.PESQUISA_FORNECEDORES]: 'inciso V',
  [MetodologiaPesquisa.NOTAS_FISCAIS]: 'inciso VI',
};

/**
 * Human-readable labels for MetodologiaPesquisa.
 */
const METODOLOGIA_LABELS: Record<MetodologiaPesquisa, string> = {
  [MetodologiaPesquisa.PAINEL_PRECOS]: 'Painel de Precos (Gov.br)',
  [MetodologiaPesquisa.CONTRATACOES_SIMILARES]:
    'Contratacoes Similares (PNCP)',
  [MetodologiaPesquisa.MIDIA_ESPECIALIZADA]:
    'Midia Especializada (SINAPI/SICRO)',
  [MetodologiaPesquisa.SITES_ELETRONICOS]: 'Sites Eletronicos Especializados',
  [MetodologiaPesquisa.PESQUISA_FORNECEDORES]: 'Pesquisa Direta com Fornecedores',
  [MetodologiaPesquisa.NOTAS_FISCAIS]: 'Notas Fiscais Eletronicas',
};

/**
 * Service for exporting Pesquisa de Precos documents.
 *
 * Generates formal price research reports in PDF format following
 * IN SEGES/ME n 65/2021 requirements. Includes:
 * - Identification and methodology
 * - Sources consulted with legal references
 * - Comparative price map
 * - Statistical calculations
 * - Acceptability criteria justification
 *
 * Issue #1260 - [Pesquisa-f] Export relatorio de pesquisa PDF
 * Parent: #1254 - [Pesquisa] Modulo de Pesquisa de Precos - EPIC
 */
@Injectable()
export class PesquisaPrecosExportService {
  private readonly logger = new Logger(PesquisaPrecosExportService.name);
  private template: Handlebars.TemplateDelegate;
  private chromiumPath: string | undefined;

  constructor(
    @InjectRepository(PesquisaPrecos)
    private pesquisaPrecosRepository: Repository<PesquisaPrecos>,
    @InjectRepository(Etp)
    private etpRepository: Repository<Etp>,
    @InjectRepository(TermoReferencia)
    private termoReferenciaRepository: Repository<TermoReferencia>,
  ) {
    this.loadTemplate();
    this.registerHandlebarsHelpers();
    this.detectChromiumPath();
  }

  /**
   * Detects and caches the Chromium executable path.
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
      // 'which' command not available - continue
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
        'pesquisa-precos-template.hbs',
      );
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
      this.logger.log('Pesquisa de Precos template loaded successfully');
    } catch (error) {
      this.logger.error('Error loading Pesquisa de Precos template:', error);
      this.template = Handlebars.compile(
        '<html><body><h1>Relatorio de Pesquisa de Precos - {{pesquisa.titulo}}</h1></body></html>',
      );
    }
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('pt-BR');
    });

    Handlebars.registerHelper('formatCurrency', (value: number) => {
      if (value === null || value === undefined) return '0,00';
      return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    Handlebars.registerHelper('formatNumber', (value: number) => {
      if (value === null || value === undefined) return '0';
      return Number(value).toLocaleString('pt-BR');
    });

    Handlebars.registerHelper('formatPercent', (value: number) => {
      if (value === null || value === undefined) return '0,00';
      return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    Handlebars.registerHelper('formatStatus', (status: string) => {
      const statusMap: Record<string, string> = {
        draft: 'Rascunho',
        completed: 'Concluida',
        approved: 'Aprovada',
        archived: 'Arquivada',
      };
      return statusMap[status] || status;
    });

    Handlebars.registerHelper(
      'formatMetodologia',
      (metodologia: MetodologiaPesquisa) => {
        return METODOLOGIA_LABELS[metodologia] || metodologia;
      },
    );

    Handlebars.registerHelper(
      'mapArtigoIN65',
      (metodologia: MetodologiaPesquisa) => {
        return METODOLOGIA_TO_ARTIGO[metodologia] || 'N/A';
      },
    );

    Handlebars.registerHelper('formatText', (text: string) => {
      if (!text) return '';
      return new Handlebars.SafeString(
        text
          .split(/\n\n+/)
          .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join(''),
      );
    });

    Handlebars.registerHelper('addOne', (index: number) => {
      return index + 1;
    });

    Handlebars.registerHelper('isHighCV', (cv: number) => {
      return cv > 25;
    });

    Handlebars.registerHelper(
      'countFontes',
      (itens: ItemPesquisado[]): number => {
        if (!itens || itens.length === 0) return 0;
        const fontes = new Set<string>();
        itens.forEach((item) => {
          if (item.precos) {
            item.precos.forEach((p) => fontes.add(p.fonte));
          }
        });
        return fontes.size;
      },
    );

    Handlebars.registerHelper(
      'getFontesUnicas',
      (itens: ItemPesquisado[]): string[] => {
        if (!itens || itens.length === 0) return [];
        const fontes = new Set<string>();
        itens.forEach((item) => {
          if (item.precos) {
            item.precos.forEach((p) => fontes.add(p.fonte));
          }
        });
        return Array.from(fontes).sort();
      },
    );

    Handlebars.registerHelper(
      'getPrecosPorFonte',
      (
        item: ItemPesquisado,
        allItens: ItemPesquisado[],
      ): { valor: number | null; outlier: boolean }[] => {
        const fontesUnicas = new Set<string>();
        allItens.forEach((i) => {
          if (i.precos) {
            i.precos.forEach((p) => fontesUnicas.add(p.fonte));
          }
        });
        const fontes = Array.from(fontesUnicas).sort();

        return fontes.map((fonte) => {
          const preco = item.precos?.find((p) => p.fonte === fonte);
          if (!preco) return { valor: null, outlier: false };

          // Check if it's an outlier (> 2 standard deviations from mean)
          let outlier = false;
          if (item.media && item.precos && item.precos.length > 2) {
            const valores = item.precos.map((p) => p.valor);
            const mean =
              valores.reduce((a, b) => a + b, 0) / valores.length;
            const stdDev = Math.sqrt(
              valores.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
                valores.length,
            );
            outlier = Math.abs(preco.valor - mean) > 2 * stdDev;
          }

          return { valor: preco.valor, outlier };
        });
      },
    );

    Handlebars.registerHelper(
      'countFontesConsultadas',
      (fontes: FonteConsultada[]): number => {
        return fontes?.length || 0;
      },
    );
  }

  /**
   * Exports a Pesquisa de Precos to PDF format.
   *
   * Generates a formal price research report following IN SEGES/ME n 65/2021.
   * The PDF includes:
   * - Research identification and metadata
   * - Methodology used (with legal references)
   * - Sources consulted
   * - Comparative price map with statistics
   * - Calculation methodology
   * - Price acceptability criteria
   *
   * @param pesquisaId - The Pesquisa de Precos UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns Buffer containing the PDF file
   * @throws {NotFoundException} If pesquisa not found
   * @throws {InternalServerErrorException} If PDF generation fails
   */
  async exportToPDF(
    pesquisaId: string,
    organizationId: string,
  ): Promise<Buffer> {
    this.logger.log(`Exporting Pesquisa de Precos ${pesquisaId} to PDF`);

    const pesquisa = await this.getPesquisaWithRelations(
      pesquisaId,
      organizationId,
    );
    const etp = pesquisa.etpId
      ? await this.getEtpById(pesquisa.etpId)
      : null;
    const termoReferencia = pesquisa.termoReferenciaId
      ? await this.getTermoReferenciaById(pesquisa.termoReferenciaId)
      : null;

    const html = this.generateHTML(pesquisa, etp, termoReferencia);

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
            RELATORIO DE PESQUISA DE PRECOS - IN SEGES/ME n 65/2021
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
            Pagina <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
      });

      this.logger.log(
        `PDF generated successfully for Pesquisa ${pesquisaId} (${pdfBuffer.length} bytes)`,
      );
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate PDF for Pesquisa ${pesquisaId}: ${errorMessage}`,
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
          'Erro ao renderizar o documento PDF. ' + 'Tente novamente.',
        );
      }

      throw new InternalServerErrorException(
        `Erro ao gerar PDF: ${errorMessage}`,
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
   * Exports a Pesquisa de Precos to JSON format.
   *
   * @param pesquisaId - The Pesquisa de Precos UUID to export
   * @param organizationId - Organization ID for multi-tenant validation
   * @returns JSON representation of the pesquisa
   */
  async exportToJSON(
    pesquisaId: string,
    organizationId: string,
  ): Promise<Record<string, unknown>> {
    this.logger.log(`Exporting Pesquisa de Precos ${pesquisaId} to JSON`);

    const pesquisa = await this.getPesquisaWithRelations(
      pesquisaId,
      organizationId,
    );

    return {
      pesquisaPrecos: {
        id: pesquisa.id,
        titulo: pesquisa.titulo,
        descricao: pesquisa.descricao,
        numeroProcesso: pesquisa.numeroProcesso,
        metodologia: pesquisa.metodologia,
        metodologiasComplementares: pesquisa.metodologiasComplementares,
        justificativaMetodologia: pesquisa.justificativaMetodologia,
        fontesConsultadas: pesquisa.fontesConsultadas,
        itens: pesquisa.itens,
        valorTotalEstimado: pesquisa.valorTotalEstimado,
        mediaGeral: pesquisa.mediaGeral,
        medianaGeral: pesquisa.medianaGeral,
        menorPrecoTotal: pesquisa.menorPrecoTotal,
        coeficienteVariacao: pesquisa.coeficienteVariacao,
        criterioAceitabilidade: pesquisa.criterioAceitabilidade,
        justificativaCriterio: pesquisa.justificativaCriterio,
        mapaComparativo: pesquisa.mapaComparativo,
        status: pesquisa.status,
        versao: pesquisa.versao,
        dataValidade: pesquisa.dataValidade,
        createdAt: pesquisa.createdAt,
        updatedAt: pesquisa.updatedAt,
      },
      etpId: pesquisa.etpId,
      termoReferenciaId: pesquisa.termoReferenciaId,
      organizationId: pesquisa.organizationId,
      exportedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
      legalReference: 'IN SEGES/ME n 65/2021',
    };
  }

  /**
   * Generates HTML from the Handlebars template.
   */
  private generateHTML(
    pesquisa: PesquisaPrecos,
    etp: Etp | null,
    termoReferencia: TermoReferencia | null,
  ): string {
    const data = {
      pesquisa: {
        ...pesquisa,
        organization: pesquisa.organization || {},
        createdBy: pesquisa.createdBy || {},
      },
      etp,
      termoReferencia,
      generatedAt: new Date(),
    };

    return this.template(data);
  }

  /**
   * Retrieves a Pesquisa de Precos with relations for export.
   */
  private async getPesquisaWithRelations(
    pesquisaId: string,
    organizationId: string,
  ): Promise<PesquisaPrecos> {
    const pesquisa = await this.pesquisaPrecosRepository
      .createQueryBuilder('pesquisa')
      .leftJoinAndSelect('pesquisa.organization', 'organization')
      .leftJoinAndSelect('pesquisa.createdBy', 'createdBy')
      .where('pesquisa.id = :pesquisaId', { pesquisaId })
      .andWhere('pesquisa.organizationId = :organizationId', { organizationId })
      .getOne();

    if (!pesquisa) {
      throw new NotFoundException(
        `Pesquisa de Precos ${pesquisaId} nao encontrada ou sem permissao de acesso`,
      );
    }

    return pesquisa;
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

  /**
   * Retrieves a Termo de Referencia by ID for reference.
   */
  private async getTermoReferenciaById(
    trId: string,
  ): Promise<TermoReferencia | null> {
    try {
      return await this.termoReferenciaRepository.findOne({
        where: { id: trId },
        select: ['id', 'objeto'],
      });
    } catch {
      return null;
    }
  }
}
