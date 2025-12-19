import { create } from 'zustand';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  AnalysisResponse,
  AnalysisDetailsResponse,
  ConvertToEtpRequest,
  ConvertToEtpResponse,
  AnalysisStatus,
} from '@/types/analysis';

interface AnalysisState {
  // State
  analysisResult: AnalysisResponse | null;
  analysisDetails: AnalysisDetailsResponse | null;
  conversionResult: ConvertToEtpResponse | null;
  status: AnalysisStatus;
  uploadProgress: number;
  error: string | null;

  // Actions
  uploadAndAnalyze: (file: File) => Promise<AnalysisResponse>;
  getAnalysisDetails: (analysisId: string) => Promise<AnalysisDetailsResponse>;
  downloadReport: (
    analysisId: string,
    originalFilename: string,
  ) => Promise<void>;
  convertToEtp: (
    analysisId: string,
    options?: ConvertToEtpRequest,
  ) => Promise<ConvertToEtpResponse>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  analysisResult: null,
  analysisDetails: null,
  conversionResult: null,
  status: 'idle' as AnalysisStatus,
  uploadProgress: 0,
  error: null,
};

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,

  /**
   * Upload a document and analyze it for quality.
   * Accepts PDF or DOCX files (max 10MB).
   */
  uploadAndAnalyze: async (file: File) => {
    set({
      status: 'uploading',
      uploadProgress: 0,
      error: null,
      analysisResult: null,
      analysisDetails: null,
      conversionResult: null,
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      set({ status: 'analyzing', uploadProgress: 50 });

      const response = await api.post<{
        data: AnalysisResponse;
        disclaimer: string;
      }>('/analysis/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 50) / progressEvent.total)
            : 0;
          set({ uploadProgress: progress });
        },
      });

      const result = response.data.data;

      set({
        analysisResult: result,
        status: 'completed',
        uploadProgress: 100,
      });

      logger.info('Document analysis completed', {
        analysisId: result.analysisId,
        score: result.overallScore,
        verdict: result.verdict,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao analisar documento';

      set({
        error: errorMessage,
        status: 'failed',
        uploadProgress: 0,
      });

      logger.error('Document analysis failed', error, { filename: file.name });
      throw error;
    }
  },

  /**
   * Get full analysis details including the improvement report.
   */
  getAnalysisDetails: async (analysisId: string) => {
    set({ error: null });

    try {
      const response = await api.get<{
        data: AnalysisDetailsResponse;
        disclaimer: string;
      }>(`/analysis/${analysisId}`);

      const details = response.data.data;

      set({ analysisDetails: details });

      return details;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao obter detalhes da análise';

      set({ error: errorMessage });

      logger.error('Failed to get analysis details', error, { analysisId });
      throw error;
    }
  },

  /**
   * Download the analysis report as PDF.
   */
  downloadReport: async (analysisId: string, originalFilename: string) => {
    set({ error: null });

    try {
      const response = await api.get(`/analysis/${analysisId}/report/pdf`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Generate filename
      const baseFilename = originalFilename.replace(/\.[^.]+$/, '');
      const pdfFilename = `analise_${baseFilename}_${new Date().toISOString().split('T')[0]}.pdf`;

      link.href = url;
      link.setAttribute('download', pdfFilename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.info('Analysis report downloaded', { analysisId, pdfFilename });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao baixar relatório';

      set({ error: errorMessage });

      logger.error('Failed to download report', error, { analysisId });
      throw error;
    }
  },

  /**
   * Convert the analyzed document to a new ETP.
   */
  convertToEtp: async (analysisId: string, options?: ConvertToEtpRequest) => {
    set({ error: null, conversionResult: null });

    try {
      const response = await api.post<{
        data: ConvertToEtpResponse;
        disclaimer: string;
      }>(`/analysis/${analysisId}/convert`, options || {});

      const result = response.data.data;

      set({
        conversionResult: result,
        // Clear analysis state after successful conversion
        analysisResult: null,
        analysisDetails: null,
        status: 'idle',
      });

      logger.info('Document converted to ETP', {
        analysisId,
        etpId: result.etpId,
        sectionsCount: result.sectionsCount,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao converter para ETP';

      set({ error: errorMessage });

      logger.error('Failed to convert to ETP', error, { analysisId });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),
}));
