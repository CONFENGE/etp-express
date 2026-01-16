import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Etp } from '../../entities/etp.entity';
import { ComplianceValidationHistory } from '../../entities/compliance-validation-history.entity';
import { ComplianceValidationService } from './compliance-validation.service';
import {
  ComplianceReportDto,
  ViolationDto,
  CategoryScoreDto,
  ValidationHistoryEntryDto,
} from './dto/compliance-report.dto';
import {
  ComplianceValidationResult,
  ComplianceItemResult,
} from './dto/compliance-validation-result.dto';
import {
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../entities/compliance-checklist-item.entity';

/**
 * Nomes legíveis para categorias de checklist.
 */
const CATEGORY_NAMES: Record<ChecklistItemCategory, string> = {
  [ChecklistItemCategory.IDENTIFICATION]: 'Identificação',
  [ChecklistItemCategory.JUSTIFICATION]: 'Justificativa',
  [ChecklistItemCategory.REQUIREMENTS]: 'Requisitos',
  [ChecklistItemCategory.PRICING]: 'Estimativa de Preços',
  [ChecklistItemCategory.RISKS]: 'Riscos',
  [ChecklistItemCategory.CONCLUSION]: 'Conclusão',
  [ChecklistItemCategory.DOCUMENTATION]: 'Documentação',
};

/**
 * Mapeamento de tipo de item para severidade.
 */
const TYPE_TO_SEVERITY: Record<ChecklistItemType, string> = {
  [ChecklistItemType.MANDATORY]: 'CRITICAL',
  [ChecklistItemType.RECOMMENDED]: 'HIGH',
  [ChecklistItemType.OPTIONAL]: 'MEDIUM',
};

/**
 * Known Chromium executable paths.
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
 * Service para geração de relatórios de conformidade TCU.
 *
 * Responsabilidades:
 * - Gerar dados estruturados do relatório
 * - Exportar relatório em PDF
 * - Gerenciar histórico de validações
 *
 * Issue #1264 - [Compliance-c] Criar relatório de conformidade
 */
@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);
  private template: HandlebarsTemplateDelegate;
  private chromiumPath: string | undefined;

  constructor(
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
    @InjectRepository(ComplianceValidationHistory)
    private readonly historyRepository: Repository<ComplianceValidationHistory>,
    private readonly validationService: ComplianceValidationService,
  ) {
    this.loadTemplate();
    this.registerHandlebarsHelpers();
    this.detectChromiumPath();
  }

  /**
   * Gera o relatório completo de conformidade para um ETP.
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuário solicitante
   * @param userRole - Role do usuário
   * @param organizationId - ID da organização do usuário
   * @returns Dados estruturados do relatório
   */
  async generateReport(
    etpId: string,
    userId: string,
    userRole: string,
    organizationId: string,
  ): Promise<ComplianceReportDto> {
    const startTime = Date.now();

    // Validar acesso ao ETP
    const etp = await this.validateEtpAccess(
      etpId,
      userId,
      userRole,
      organizationId,
    );

    // Executar validação
    const validationResult = await this.validationService.validateEtp(etpId);

    // Salvar no histórico
    await this.saveValidationHistory(validationResult, userId);

    // Buscar histórico anterior
    const history = await this.getValidationHistory(etpId, 10);

    // Montar relatório
    const report = this.buildReport(etp, validationResult, history);
    report.processingTimeMs = Date.now() - startTime;

    this.logger.log(
      `Compliance report generated for ETP ${etpId}: score=${report.score}%, time=${report.processingTimeMs}ms`,
    );

    return report;
  }

  /**
   * Exporta o relatório de conformidade em PDF.
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuário solicitante
   * @param userRole - Role do usuário
   * @param organizationId - ID da organização do usuário
   * @returns Buffer contendo o PDF
   */
  async exportReportToPdf(
    etpId: string,
    userId: string,
    userRole: string,
    organizationId: string,
  ): Promise<Buffer> {
    this.logger.log(`Exporting compliance report PDF for ETP ${etpId}`);

    // Gerar dados do relatório
    const report = await this.generateReport(
      etpId,
      userId,
      userRole,
      organizationId,
    );

    // Gerar HTML
    const html = this.generateHTML(report);

    // Gerar PDF
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
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1.5cm',
          right: '1.5cm',
          bottom: '1.5cm',
          left: '1.5cm',
        },
        printBackground: true,
      });

      this.logger.log(
        `Compliance report PDF generated for ETP ${etpId} (${pdfBuffer.length} bytes)`,
      );

      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate compliance report PDF for ETP ${etpId}: ${errorMessage}`,
      );

      if (
        errorMessage.includes('Could not find Chrome') ||
        errorMessage.includes('Failed to launch')
      ) {
        throw new InternalServerErrorException(
          'Chromium não encontrado no servidor. Verifique a instalação do Puppeteer/Chromium.',
        );
      }

      throw new InternalServerErrorException(
        `Erro ao gerar PDF do relatório: ${errorMessage}`,
      );
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error(
            `Failed to close browser: ${closeError instanceof Error ? closeError.message : 'Unknown'}`,
          );
        }
      }
    }
  }

  /**
   * Busca o histórico de validações de um ETP.
   *
   * @param etpId - ID do ETP
   * @param limit - Número máximo de registros
   * @returns Lista de entradas de histórico
   */
  async getValidationHistory(
    etpId: string,
    limit: number = 10,
  ): Promise<ValidationHistoryEntryDto[]> {
    const history = await this.historyRepository.find({
      where: { etpId },
      relations: ['validatedBy'],
      order: { validatedAt: 'DESC' },
      take: limit,
    });

    return history.map((h) => ({
      id: h.id,
      score: h.score,
      status: h.status,
      validatedAt: h.validatedAt,
      validatedByName: h.validatedBy?.email?.split('@')[0] || 'Sistema',
      totalItems: h.totalItems,
      passedItems: h.passedItems,
      failedItems: h.failedItems,
    }));
  }

  /**
   * Salva uma validação no histórico.
   */
  async saveValidationHistory(
    result: ComplianceValidationResult,
    userId: string,
  ): Promise<ComplianceValidationHistory> {
    const historyEntry = this.historyRepository.create({
      etpId: result.etpId,
      checklistId: result.checklistId,
      checklistName: result.checklistName,
      score: result.score,
      minimumScore: result.minimumScore,
      status: result.status,
      totalItems: result.totalItems,
      passedItems: result.passedItems,
      failedItems: result.failedItems,
      validationSnapshot: {
        itemResults: result.itemResults,
        suggestions: result.suggestions,
        categoryScores: result.categoryScores,
      },
      validatedAt: result.validatedAt,
      validatedById: userId,
    });

    return this.historyRepository.save(historyEntry);
  }

  /**
   * Valida se o usuário pode acessar o ETP.
   */
  private async validateEtpAccess(
    etpId: string,
    userId: string,
    userRole: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      relations: ['template'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} não encontrado`);
    }

    const isAdmin = userRole === 'admin' || userRole === 'system_admin';
    const isOwner = etp.createdById === userId;
    const sameOrg = etp.organizationId === organizationId;

    if (!isOwner && !(isAdmin && sameOrg)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Monta o DTO do relatório a partir dos dados.
   */
  private buildReport(
    etp: Etp,
    validationResult: ComplianceValidationResult,
    history: ValidationHistoryEntryDto[],
  ): ComplianceReportDto {
    // Converter violações
    const violations = this.buildViolations(validationResult.itemResults);

    // Converter scores por categoria
    const categoryScores = this.buildCategoryScores(
      validationResult.categoryScores,
    );

    return {
      etpId: etp.id,
      etpTitle: etp.title,
      etpObjeto: etp.objeto,
      numeroProcesso: etp.numeroProcesso || undefined,
      orgaoEntidade: etp.orgaoEntidade || undefined,
      checklistId: validationResult.checklistId,
      checklistName: validationResult.checklistName,
      score: validationResult.score,
      minimumScore: validationResult.minimumScore,
      passed: validationResult.passed,
      status: validationResult.status,
      totalItems: validationResult.totalItems,
      passedItems: validationResult.passedItems,
      failedItems: validationResult.failedItems,
      categoryScores,
      violations,
      history,
      generatedAt: new Date(),
    };
  }

  /**
   * Converte itens que falharam em violações estruturadas.
   */
  private buildViolations(itemResults: ComplianceItemResult[]): ViolationDto[] {
    return itemResults
      .filter((item) => !item.passed)
      .map((item) => ({
        itemId: item.itemId,
        requirement: item.requirement,
        category: item.category,
        severity: TYPE_TO_SEVERITY[item.type] as ViolationDto['severity'],
        fieldAffected: item.fieldChecked,
        failureReason: item.failureReason,
        fixSuggestion: item.fixSuggestion,
        legalReference: item.legalReference,
      }))
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Converte scores por categoria.
   */
  private buildCategoryScores(
    categoryScores: ComplianceValidationResult['categoryScores'],
  ): CategoryScoreDto[] {
    return Object.entries(categoryScores)
      .map(([category, data]) => ({
        category: category as ChecklistItemCategory,
        categoryName:
          CATEGORY_NAMES[category as ChecklistItemCategory] || category,
        score:
          data.maxScore > 0
            ? Math.round((data.score / data.maxScore) * 100)
            : 0,
        totalItems: data.total,
        passedItems: data.passed,
      }))
      .filter((c) => c.totalItems > 0)
      .sort((a, b) => {
        const order = [
          'IDENTIFICATION',
          'JUSTIFICATION',
          'REQUIREMENTS',
          'PRICING',
          'RISKS',
          'CONCLUSION',
          'DOCUMENTATION',
          'COMPLIANCE',
        ];
        return order.indexOf(a.category) - order.indexOf(b.category);
      });
  }

  /**
   * Gera HTML a partir do template Handlebars.
   */
  private generateHTML(report: ComplianceReportDto): string {
    // Calcular rotação do ponteiro do gauge (0-180 graus)
    const scoreRotation = -90 + (report.score / 100) * 180;

    // Determinar cor do status
    const statusColor =
      report.status === 'APPROVED'
        ? '#28a745'
        : report.status === 'NEEDS_REVIEW'
          ? '#ffc107'
          : '#dc3545';

    // Determinar texto do status
    const statusText =
      report.status === 'APPROVED'
        ? 'APROVADO'
        : report.status === 'NEEDS_REVIEW'
          ? 'REVISÃO NECESSÁRIA'
          : 'REJEITADO';

    // Agrupar violações por severidade
    const violationsByGroup = this.groupViolationsBySeverity(report.violations);

    const data = {
      ...report,
      scoreRotation,
      statusColor,
      statusText,
      violationsByGroup,
    };

    return this.template(data);
  }

  /**
   * Agrupa violações por severidade.
   */
  private groupViolationsBySeverity(
    violations: ViolationDto[],
  ): { severity: string; items: ViolationDto[] }[] {
    const groups: Record<string, ViolationDto[]> = {};

    for (const v of violations) {
      if (!groups[v.severity]) {
        groups[v.severity] = [];
      }
      groups[v.severity].push(v);
    }

    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return order
      .filter((s) => groups[s]?.length > 0)
      .map((s) => ({ severity: s, items: groups[s] }));
  }

  /**
   * Carrega o template Handlebars.
   */
  private loadTemplate(): void {
    try {
      const templatePath = path.join(
        __dirname,
        '..',
        'export',
        'templates',
        'compliance-report-template.hbs',
      );
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
      this.logger.log('Compliance report template loaded successfully');
    } catch (error) {
      this.logger.error('Error loading compliance report template:', error);
      // Fallback básico
      this.template = Handlebars.compile(
        '<html><body><h1>Relatório de Conformidade</h1><p>Score: {{score}}%</p></body></html>',
      );
    }
  }

  /**
   * Registra helpers do Handlebars.
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    Handlebars.registerHelper('lowerCase', (str: string) => {
      return str?.toLowerCase() || '';
    });

    Handlebars.registerHelper(
      'pluralize',
      (count: number, singular: string, plural: string) => {
        return count === 1 ? singular : plural;
      },
    );

    Handlebars.registerHelper('categoryColor', (score: number) => {
      if (score >= 80) return '#28a745';
      if (score >= 60) return '#20c997';
      if (score >= 40) return '#ffc107';
      if (score >= 20) return '#fd7e14';
      return '#dc3545';
    });

    Handlebars.registerHelper(
      'statusText',
      (status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED') => {
        const texts = {
          APPROVED: 'Aprovado',
          NEEDS_REVIEW: 'Revisão',
          REJECTED: 'Rejeitado',
        };
        return texts[status] || status;
      },
    );

    Handlebars.registerHelper(
      'trendClass',
      (index: number, history: ValidationHistoryEntryDto[]) => {
        if (index === 0 || !history[index - 1]) return '';
        const current = history[index];
        const previous = history[index - 1];
        if (current.score > previous.score) return 'trend-up';
        if (current.score < previous.score) return 'trend-down';
        return 'trend-same';
      },
    );

    Handlebars.registerHelper(
      'trendIcon',
      (index: number, history: ValidationHistoryEntryDto[]) => {
        if (index === 0 || !history[index - 1]) return '';
        const current = history[index];
        const previous = history[index - 1];
        if (current.score > previous.score) return '↑';
        if (current.score < previous.score) return '↓';
        return '→';
      },
    );
  }

  /**
   * Detecta o caminho do Chromium.
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
      // Continue without 'which'
    }

    this.chromiumPath = undefined;
    this.logger.warn('No system Chromium found for compliance report PDF.');
  }

  private findChromiumInNixStore(): string | undefined {
    const nixStorePath = '/nix/store';
    if (!fs.existsSync(nixStorePath)) return undefined;

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
          if (this.isValidExecutable(binPath)) return binPath;
        }
      }
    } catch {
      // Continue without Nix
    }

    return undefined;
  }

  private isValidExecutable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
}
