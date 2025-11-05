import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtpVersion } from '../../entities/etp-version.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';

@Injectable()
export class VersionsService {
  private readonly logger = new Logger(VersionsService.name);

  constructor(
    @InjectRepository(EtpVersion)
    private versionsRepository: Repository<EtpVersion>,
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
    @InjectRepository(EtpSection)
    private sectionsRepository: Repository<EtpSection>,
  ) {}

  async createVersion(etpId: string, changeLog?: string, userId?: string): Promise<EtpVersion> {
    this.logger.log(`Creating version for ETP ${etpId}`);

    // Get ETP with all sections
    const etp = await this.etpsRepository.findOne({
      where: { id: etpId },
      relations: ['sections', 'createdBy'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP ${etpId} não encontrado`);
    }

    // Get current version number
    const latestVersion = await this.versionsRepository.findOne({
      where: { etpId },
      order: { versionNumber: 'DESC' },
    });

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create snapshot
    const snapshot = {
      title: etp.title,
      description: etp.description,
      objeto: etp.objeto,
      status: etp.status,
      sections: etp.sections.map((section) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        content: section.content,
        status: section.status,
        order: section.order,
        metadata: section.metadata,
        validationResults: section.validationResults,
      })),
      metadata: etp.metadata,
    };

    // Create version
    const version = this.versionsRepository.create({
      etpId,
      versionNumber: newVersionNumber,
      snapshot,
      changeLog: changeLog || 'Snapshot automático',
      createdByName: etp.createdBy?.name || 'Sistema',
    });

    const savedVersion = await this.versionsRepository.save(version);

    // Update ETP current version
    etp.currentVersion = newVersionNumber;
    await this.etpsRepository.save(etp);

    this.logger.log(`Version ${newVersionNumber} created for ETP ${etpId}`);

    return savedVersion;
  }

  async getVersions(etpId: string): Promise<EtpVersion[]> {
    return this.versionsRepository.find({
      where: { etpId },
      order: { versionNumber: 'DESC' },
    });
  }

  async getVersion(versionId: string): Promise<EtpVersion> {
    const version = await this.versionsRepository.findOne({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Versão ${versionId} não encontrada`);
    }

    return version;
  }

  async compareVersions(versionId1: string, versionId2: string) {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    const differences = {
      metadata: this.compareMetadata(version1.snapshot, version2.snapshot),
      sections: this.compareSections(
        version1.snapshot.sections,
        version2.snapshot.sections,
      ),
    };

    return {
      version1: {
        id: version1.id,
        versionNumber: version1.versionNumber,
        createdAt: version1.createdAt,
      },
      version2: {
        id: version2.id,
        versionNumber: version2.versionNumber,
        createdAt: version2.createdAt,
      },
      differences,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  async restoreVersion(versionId: string, userId: string): Promise<Etp> {
    this.logger.log(`Restoring version ${versionId}`);

    const version = await this.getVersion(versionId);

    const etp = await this.etpsRepository.findOne({
      where: { id: version.etpId },
      relations: ['sections'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP ${version.etpId} não encontrado`);
    }

    // Create a new version before restoring (backup current state)
    await this.createVersion(
      etp.id,
      `Backup antes de restaurar versão ${version.versionNumber}`,
      userId,
    );

    // Restore ETP data
    etp.title = version.snapshot.title;
    etp.description = version.snapshot.description;
    etp.objeto = version.snapshot.objeto;
    etp.metadata = version.snapshot.metadata;

    // Delete current sections
    await this.sectionsRepository.delete({ etpId: etp.id });

    // Restore sections
    const restoredSections = version.snapshot.sections.map((sectionData) => {
      return this.sectionsRepository.create({
        etpId: etp.id,
        type: sectionData.type,
        title: sectionData.title,
        content: sectionData.content,
        status: sectionData.status,
        order: sectionData.order,
        metadata: sectionData.metadata,
        validationResults: sectionData.validationResults,
      });
    });

    await this.sectionsRepository.save(restoredSections);

    const savedEtp = await this.etpsRepository.save(etp);

    this.logger.log(`Version ${version.versionNumber} restored for ETP ${etp.id}`);

    return savedEtp;
  }

  private compareMetadata(snap1: any, snap2: any) {
    const changes: any = {};

    if (snap1.title !== snap2.title) {
      changes.title = { old: snap1.title, new: snap2.title };
    }

    if (snap1.description !== snap2.description) {
      changes.description = { old: snap1.description, new: snap2.description };
    }

    if (snap1.objeto !== snap2.objeto) {
      changes.objeto = { old: snap1.objeto, new: snap2.objeto };
    }

    if (snap1.status !== snap2.status) {
      changes.status = { old: snap1.status, new: snap2.status };
    }

    return changes;
  }

  private compareSections(sections1: any[], sections2: any[]) {
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];

    const sections1Map = new Map(sections1.map((s) => [s.id, s]));
    const sections2Map = new Map(sections2.map((s) => [s.id, s]));

    // Find added sections
    sections2.forEach((section) => {
      if (!sections1Map.has(section.id)) {
        added.push({
          id: section.id,
          type: section.type,
          title: section.title,
        });
      }
    });

    // Find removed sections
    sections1.forEach((section) => {
      if (!sections2Map.has(section.id)) {
        removed.push({
          id: section.id,
          type: section.type,
          title: section.title,
        });
      }
    });

    // Find modified sections
    sections1.forEach((section1) => {
      const section2 = sections2Map.get(section1.id);
      if (section2) {
        const changes: any = {};

        if (section1.title !== section2.title) {
          changes.title = { old: section1.title, new: section2.title };
        }

        if (section1.content !== section2.content) {
          changes.content = { changed: true };
        }

        if (section1.status !== section2.status) {
          changes.status = { old: section1.status, new: section2.status };
        }

        if (Object.keys(changes).length > 0) {
          modified.push({
            id: section1.id,
            type: section1.type,
            changes,
          });
        }
      }
    });

    return { added, removed, modified };
  }
}
