/**
 * Export operation state with progress tracking (#612)
 */
export interface ExportState {
  isExporting: boolean;
  progress: number;
  stage: 'idle' | 'preparing' | 'generating' | 'downloading';
  format: 'pdf' | 'docx' | null;
}

export const initialExportState: ExportState = {
  isExporting: false,
  progress: 0,
  stage: 'idle',
  format: null,
};
