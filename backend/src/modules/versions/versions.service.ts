import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtpVersion } from '../../entities/etp-version.entity';
import { Etp } from '../../entities/etp.entity';
import {
  EtpSection,
  SectionType,
  SectionStatus,
} from '../../entities/etp-section.entity';
import { DISCLAIMER } from '../../common/constants/messages';

interface VersionSnapshot {
  title: string;
  description?: string;
  objeto: string;
  status: string;
  sections: Array<{
    id: string;
    type: string;
    title: string;
    content?: string;
    status: string;
    order: number;
    metadata?: Record<string, unknown>;
    validationResults?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

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

  async createVersion(
    etpId: string,
    changeLog?: string,
    _userId?: string,
  ): Promise<EtpVersion> {
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

    const newVersionNumber = latestVersion
      ? latestVersion.versionNumber + 1
      : 1;

    // Create snapshot
    const snapshot: VersionSnapshot = {
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

    // Create version - cast to unknown first for type safety
    const version = this.versionsRepository.create({
      etpId,
      versionNumber: newVersionNumber,
      snapshot: snapshot as unknown as Record<string, unknown>,
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
      metadata: this.compareMetadata(
        version1.snapshot as VersionSnapshot,
        version2.snapshot as VersionSnapshot,
      ),
      sections: this.compareSections(
        (version1.snapshot as VersionSnapshot).sections,
        (version2.snapshot as VersionSnapshot).sections,
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
      disclaimer: DISCLAIMER,
    };
  }

  async restoreVersion(versionId: string, _userId: string): Promise<Etp> {
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
      _userId,
    );

    const snapshot = version.snapshot as VersionSnapshot;

    // Restore ETP data - Use Object.assign to handle type-safe assignment
    Object.assign(etp, {
      title: snapshot.title,
      description: snapshot.description || '',
      objeto: snapshot.objeto,
      metadata: snapshot.metadata || {},
    });

    // Delete current sections
    await this.sectionsRepository.delete({ etpId: etp.id });

    // Restore sections
    const restoredSections: EtpSection[] = [];

    for (const sectionData of snapshot.sections) {
      const section = new EtpSection();
      section.etpId = etp.id;
      section.type = sectionData.type as SectionType;
      section.title = sectionData.title;
      section.content = sectionData.content || '';
      section.status = sectionData.status as SectionStatus;
      section.order = sectionData.order;
      section.metadata = (sectionData.metadata || {}) as EtpSection['metadata'];
      section.validationResults = (sectionData.validationResults ||
        {}) as EtpSection['validationResults'];
      restoredSections.push(section);
    }

    await this.sectionsRepository.save(restoredSections);

    const savedEtp = await this.etpsRepository.save(etp);

    this.logger.log(
      `Version ${version.versionNumber} restored for ETP ${etp.id}`,
    );

    return savedEtp;
  }

  private compareMetadata(snap1: VersionSnapshot, snap2: VersionSnapshot) {
    const changes: Record<string, { old: unknown; new: unknown }> = {};

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

  private compareSections(
    sections1: VersionSnapshot['sections'],
    sections2: VersionSnapshot['sections'],
  ) {
    const added: Array<{
      id: string;
      type: string;
      title: string;
    }> = [];
    const removed: Array<{
      id: string;
      type: string;
      title: string;
    }> = [];
    const modified: Array<{
      id: string;
      type: string;
      changes: Record<string, unknown>;
    }> = [];

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
        const changes: Record<string, unknown> = {};

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
