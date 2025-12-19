import { create } from 'zustand';
import {
 ETP,
 Section,
 AIGenerationRequest,
 AIGenerationResponse,
 Reference,
 ValidationResult,
 ExportOptions,
 GenerationStatus,
 AsyncSection,
 DataSourceStatusInfo,
} from '@/types/etp';
import axios from 'axios';
import api, { apiHelpers } from '@/lib/api';
import {
 pollJobStatus,
 JobFailedError,
 PollingTimeoutError,
 PollingAbortedError,
} from '@/lib/polling';
import { logger } from '@/lib/logger';

interface ETFState {
 etps: ETP[];
 currentETP: ETP | null;
 references: Reference[];
 isLoading: boolean;
 error: string | null;
 aiGenerating: boolean;
 validationResult: ValidationResult | null;

 // Async generation state (#222)
 generationProgress: number;
 generationStatus: GenerationStatus;
 generationJobId: string | null;

 // Data source status for government APIs (#756)
 dataSourceStatus: DataSourceStatusInfo | null;

 // ETP Operations
 fetchETPs: () => Promise<void>;
 fetchETP: (id: string) => Promise<void>;
 createETP: (data: Partial<ETP>) => Promise<ETP>;
 updateETP: (id: string, data: Partial<ETP>) => Promise<void>;
 deleteETP: (id: string) => Promise<void>;
 setCurrentETP: (etp: ETP | null) => void;

 // Section Operations
 updateSection: (
 etpId: string,
 sectionId: string,
 data: Partial<Section>,
 ) => Promise<void>;
 generateSection: (
 request: AIGenerationRequest,
 ) => Promise<AIGenerationResponse>;
 regenerateSection: (
 request: AIGenerationRequest,
 ) => Promise<AIGenerationResponse>;

 // Validation
 validateETP: (id: string) => Promise<ValidationResult>;

 // Export
 exportPDF: (
 id: string,
 options?: Partial<ExportOptions> & { signal?: AbortSignal },
 ) => Promise<Blob>;
 exportDocx: (id: string, options?: { signal?: AbortSignal }) => Promise<Blob>;
 exportJSON: (id: string) => Promise<string>;

 // References
 fetchReferences: (etpId: string) => Promise<void>;
 addReference: (reference: Reference) => void;

 // Utility
 clearError: () => void;
 resetStore: () => void;

 // Abort/Cancel (#611)
 cancelGeneration: () => void;
}

const initialState = {
 etps: [],
 currentETP: null,
 references: [],
 isLoading: false,
 error: null,
 aiGenerating: false,
 validationResult: null,
 // Async generation state (#222)
 generationProgress: 0,
 generationStatus: 'idle' as GenerationStatus,
 generationJobId: null as string | null,
 // Data source status for government APIs (#756)
 dataSourceStatus: null as DataSourceStatusInfo | null,
};

/**
 * AbortController for current polling operation (#611)
 * Stored outside the store to avoid triggering re-renders
 */
let currentPollingController: AbortController | null = null;

export const useETPStore = create<ETFState>((set, _get) => ({
 ...initialState,

 fetchETPs: async () => {
 set({ isLoading: true, error: null });
 try {
 const etps = await apiHelpers.get<ETP[]>('/etps');
 set({ etps, isLoading: false });
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao carregar ETPs',
 isLoading: false,
 });
 }
 },

 fetchETP: async (id: string) => {
 set({ isLoading: true, error: null });
 try {
 const etp = await apiHelpers.get<ETP>(`/etps/${id}`);
 set({ currentETP: etp, isLoading: false });
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao carregar ETP',
 isLoading: false,
 });
 }
 },

 createETP: async (data: Partial<ETP>) => {
 set({ isLoading: true, error: null });
 try {
 const etp = await apiHelpers.post<ETP>('/etps', data);
 set((state) => ({
 etps: [etp, ...state.etps],
 currentETP: etp,
 isLoading: false,
 }));
 return etp;
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao criar ETP',
 isLoading: false,
 });
 throw error;
 }
 },

 updateETP: async (id: string, data: Partial<ETP>) => {
 set({ isLoading: true, error: null });
 try {
 const updated = await apiHelpers.put<ETP>(`/etps/${id}`, data);
 set((state) => ({
 etps: state.etps.map((etp) => (etp.id === id ? updated : etp)),
 currentETP: state.currentETP?.id === id ? updated : state.currentETP,
 isLoading: false,
 }));
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao atualizar ETP',
 isLoading: false,
 });
 throw error;
 }
 },

 deleteETP: async (id: string) => {
 set({ isLoading: true, error: null });
 try {
 await apiHelpers.delete(`/etps/${id}`);
 set((state) => ({
 etps: state.etps.filter((etp) => etp.id !== id),
 currentETP: state.currentETP?.id === id ? null : state.currentETP,
 isLoading: false,
 }));
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao deletar ETP',
 isLoading: false,
 });
 throw error;
 }
 },

 setCurrentETP: (etp: ETP | null) => set({ currentETP: etp }),

 updateSection: async (
 etpId: string,
 sectionId: string,
 data: Partial<Section>,
 ) => {
 set({ isLoading: true, error: null });
 try {
 const updated = await apiHelpers.put<Section>(
 `/etps/${etpId}/sections/${sectionId}`,
 data,
 );

 set((state) => {
 if (!state.currentETP) return state;

 const updatedSections = state.currentETP.sections.map((section) =>
 section.id === sectionId ? updated : section,
 );

 return {
 currentETP: {
 ...state.currentETP,
 sections: updatedSections,
 },
 isLoading: false,
 };
 });
 } catch (error) {
 set({
 error:
 error instanceof Error ? error.message : 'Erro ao atualizar seção',
 isLoading: false,
 });
 throw error;
 }
 },

 generateSection: async (request: AIGenerationRequest) => {
 // Cancel any existing polling before starting new one (#611)
 if (currentPollingController) {
 currentPollingController.abort();
 }
 currentPollingController = new AbortController();
 const { signal } = currentPollingController;

 set({
 aiGenerating: true,
 error: null,
 generationProgress: 0,
 generationStatus: 'queued',
 generationJobId: null,
 });

 try {
 // 1. Start async generation and get jobId
 const response = await apiHelpers.post<{ data: AsyncSection }>(
 `/sections/etp/${request.etpId}/generate`,
 {
 type: `section_${request.sectionNumber}`,
 title: `Seção ${request.sectionNumber}`,
 userInput: request.prompt || '',
 context: request.context,
 },
 );

 // Check if aborted before continuing (#611)
 if (signal.aborted) {
 return null as unknown as AIGenerationResponse;
 }

 const jobId = response.data.metadata?.jobId;

 if (!jobId) {
 // Fallback: backend returned sync response (no jobId)
 if (!signal.aborted) {
 set({
 aiGenerating: false,
 generationStatus: 'completed',
 generationProgress: 100,
 });
 }
 return {
 content: response.data.content || '',
 references: [],
 confidence: 1,
 warnings: [],
 } as AIGenerationResponse;
 }

 set({ generationJobId: jobId, generationStatus: 'generating' });

 // 2. Poll for completion with progress updates and abort support (#611)
 const pollResult = await pollJobStatus(
 jobId,
 (progress) => {
 if (!signal.aborted) {
 set({ generationProgress: progress });
 }
 },
 { signal },
 );

 if (!signal.aborted) {
 set({
 aiGenerating: false,
 generationStatus: 'completed',
 generationProgress: 100,
 generationJobId: null,
 // Store data source status for display (#756)
 dataSourceStatus: pollResult.dataSourceStatus || null,
 });
 }

 return {
 content: pollResult.section.content || '',
 references: [],
 confidence: 1,
 warnings: [],
 } as AIGenerationResponse;
 } catch (error) {
 // Silently handle aborted requests (#611)
 if (error instanceof PollingAbortedError || signal.aborted) {
 return null as unknown as AIGenerationResponse;
 }

 let errorMessage = 'Erro ao gerar seção com IA';

 if (error instanceof JobFailedError) {
 errorMessage = error.message;
 } else if (error instanceof PollingTimeoutError) {
 errorMessage = error.message;
 } else if (error instanceof Error) {
 errorMessage = error.message;
 }

 set({
 error: errorMessage,
 aiGenerating: false,
 generationStatus: 'failed',
 generationProgress: 0,
 generationJobId: null,
 });
 throw error;
 } finally {
 // Clean up controller reference (#611)
 if (currentPollingController?.signal === signal) {
 currentPollingController = null;
 }
 }
 },

 regenerateSection: async (request: AIGenerationRequest) => {
 // Cancel any existing polling before starting new one (#611)
 if (currentPollingController) {
 currentPollingController.abort();
 }
 currentPollingController = new AbortController();
 const { signal } = currentPollingController;

 set({
 aiGenerating: true,
 error: null,
 generationProgress: 0,
 generationStatus: 'queued',
 generationJobId: null,
 });

 try {
 // For regenerate, we need to find the section ID first
 // The regenerate endpoint uses section ID, not section number
 const response = await apiHelpers.post<{ data: AsyncSection }>(
 `/sections/etp/${request.etpId}/generate`,
 {
 type: `section_${request.sectionNumber}`,
 title: `Seção ${request.sectionNumber}`,
 userInput: request.prompt || '',
 context: { ...request.context, regenerate: true },
 },
 );

 // Check if aborted before continuing (#611)
 if (signal.aborted) {
 return null as unknown as AIGenerationResponse;
 }

 const jobId = response.data.metadata?.jobId;

 if (!jobId) {
 // Fallback: backend returned sync response (no jobId)
 if (!signal.aborted) {
 set({
 aiGenerating: false,
 generationStatus: 'completed',
 generationProgress: 100,
 });
 }
 return {
 content: response.data.content || '',
 references: [],
 confidence: 1,
 warnings: [],
 } as AIGenerationResponse;
 }

 set({ generationJobId: jobId, generationStatus: 'generating' });

 // Poll for completion with progress updates and abort support (#611)
 const pollResult = await pollJobStatus(
 jobId,
 (progress) => {
 if (!signal.aborted) {
 set({ generationProgress: progress });
 }
 },
 { signal },
 );

 if (!signal.aborted) {
 set({
 aiGenerating: false,
 generationStatus: 'completed',
 generationProgress: 100,
 generationJobId: null,
 // Store data source status for display (#756)
 dataSourceStatus: pollResult.dataSourceStatus || null,
 });
 }

 return {
 content: pollResult.section.content || '',
 references: [],
 confidence: 1,
 warnings: [],
 } as AIGenerationResponse;
 } catch (error) {
 // Silently handle aborted requests (#611)
 if (error instanceof PollingAbortedError || signal.aborted) {
 return null as unknown as AIGenerationResponse;
 }

 let errorMessage = 'Erro ao regenerar seção';

 if (error instanceof JobFailedError) {
 errorMessage = error.message;
 } else if (error instanceof PollingTimeoutError) {
 errorMessage = error.message;
 } else if (error instanceof Error) {
 errorMessage = error.message;
 }

 set({
 error: errorMessage,
 aiGenerating: false,
 generationStatus: 'failed',
 generationProgress: 0,
 generationJobId: null,
 });
 throw error;
 } finally {
 // Clean up controller reference (#611)
 if (currentPollingController?.signal === signal) {
 currentPollingController = null;
 }
 }
 },

 validateETP: async (id: string) => {
 set({ isLoading: true, error: null });
 try {
 const result = await apiHelpers.get<ValidationResult>(
 `/etps/${id}/validate`,
 );
 set({ validationResult: result, isLoading: false });
 return result;
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao validar ETP',
 isLoading: false,
 });
 throw error;
 }
 },

 exportPDF: async (
 id: string,
 options?: Partial<ExportOptions> & { signal?: AbortSignal },
 ) => {
 set({ isLoading: true, error: null });
 try {
 const { signal, ...exportOptions } = options || {};
 const response = await api.post(`/etps/${id}/export/pdf`, exportOptions, {
 responseType: 'blob',
 signal,
 });
 set({ isLoading: false });
 return response.data as Blob;
 } catch (error) {
 // Don't set error state for aborted requests
 if (axios.isCancel(error) || (error as Error).name === 'CanceledError') {
 set({ isLoading: false });
 throw error;
 }
 set({
 error: error instanceof Error ? error.message : 'Erro ao exportar PDF',
 isLoading: false,
 });
 throw error;
 }
 },

 exportDocx: async (id: string, options?: { signal?: AbortSignal }) => {
 set({ isLoading: true, error: null });
 try {
 const response = await api.get(`/export/etp/${id}/docx`, {
 responseType: 'blob',
 signal: options?.signal,
 });
 set({ isLoading: false });
 return response.data as Blob;
 } catch (error) {
 // Don't set error state for aborted requests
 if (axios.isCancel(error) || (error as Error).name === 'CanceledError') {
 set({ isLoading: false });
 throw error;
 }
 set({
 error: error instanceof Error ? error.message : 'Erro ao exportar DOCX',
 isLoading: false,
 });
 throw error;
 }
 },

 exportJSON: async (id: string) => {
 set({ isLoading: true, error: null });
 try {
 const response = await apiHelpers.get<string>(`/etps/${id}/export/json`);
 set({ isLoading: false });
 return response;
 } catch (error) {
 set({
 error: error instanceof Error ? error.message : 'Erro ao exportar JSON',
 isLoading: false,
 });
 throw error;
 }
 },

 fetchReferences: async (etpId: string) => {
 try {
 const references = await apiHelpers.get<Reference[]>(
 `/etps/${etpId}/references`,
 );
 set({ references });
 } catch (error) {
 logger.error('Erro ao carregar referências', error, { etpId });
 }
 },

 addReference: (reference: Reference) => {
 set((state) => ({
 references: [...state.references, reference],
 }));
 },

 clearError: () => set({ error: null }),

 resetStore: () => set(initialState),

 /**
 * Cancel any ongoing AI generation polling (#611)
 * Call this from component cleanup (useEffect return)
 * to prevent state updates on unmounted components
 */
 cancelGeneration: () => {
 if (currentPollingController) {
 currentPollingController.abort();
 currentPollingController = null;
 set({
 aiGenerating: false,
 generationProgress: 0,
 generationStatus: 'idle',
 generationJobId: null,
 });
 }
 },
}));
