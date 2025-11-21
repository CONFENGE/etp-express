import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { DISCLAIMER } from '../../common/constants/messages';

export enum ExportFormat {
  PDF = 'pdf',
  JSON = 'json',
  XML = 'xml',
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
