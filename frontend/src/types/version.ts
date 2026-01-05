/**
 * ETP Version types for version history feature
 * @see #1162 - Implement version history UI
 */

export interface VersionSnapshot {
  title: string;
  description?: string;
  objeto: string;
  status: string;
  sections: VersionSection[];
  metadata?: Record<string, unknown>;
}

export interface VersionSection {
  id: string;
  type: string;
  title: string;
  content?: string;
  status: string;
  order: number;
  metadata?: Record<string, unknown>;
  validationResults?: Record<string, unknown>;
}

export interface EtpVersion {
  id: string;
  versionNumber: number;
  snapshot: VersionSnapshot;
  changeLog?: string;
  createdByName?: string;
  etpId: string;
  createdAt: string;
}

export interface VersionComparisonResult {
  version1: {
    id: string;
    versionNumber: number;
    createdAt: string;
  };
  version2: {
    id: string;
    versionNumber: number;
    createdAt: string;
  };
  differences: {
    metadata: Record<string, { old: unknown; new: unknown }>;
    sections: {
      added: Array<{ id: string; type: string; title: string }>;
      removed: Array<{ id: string; type: string; title: string }>;
      modified: Array<{
        id: string;
        type: string;
        changes: Record<string, unknown>;
      }>;
    };
  };
  disclaimer: string;
}

export interface VersionsResponse {
  data: EtpVersion[];
  disclaimer: string;
}

export interface VersionResponse {
  data: EtpVersion;
  disclaimer: string;
}

export interface RestoreVersionResponse {
  data: unknown;
  message: string;
  disclaimer: string;
}
