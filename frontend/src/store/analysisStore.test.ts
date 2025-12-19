import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysisStore } from './analysisStore';
import api from '@/lib/api';
import type {
 AnalysisResponse,
 AnalysisDetailsResponse,
 ConvertToEtpResponse,
} from '@/types/analysis';

// Mock api module
vi.mock('@/lib/api', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
 logger: {
 info: vi.fn(),
 error: vi.fn(),
 },
}));

describe('analysisStore', () => {
 // Mock data fixtures
 const mockFile = new File(['test content'], 'test.pdf', {
 type: 'application/pdf',
 });

 const mockAnalysisResponse: AnalysisResponse = {
 analysisId: 'analysis-123',
 originalFilename: 'test.pdf',
 mimeType: 'application/pdf',
 overallScore: 78,
 meetsMinimumQuality: true,
 verdict: 'Aprovado com ressalvas',
 documentInfo: {
 wordCount: 1500,
 sectionCount: 8,
 },
 issueSummary: {
 critical: 1,
 important: 3,
 suggestion: 5,
 },
 dimensions: [
 { dimension: 'legal', score: 75, passed: true },
 { dimension: 'clareza', score: 82, passed: true },
 { dimension: 'fundamentacao', score: 70, passed: true },
 ],
 message: 'Documento analisado com sucesso.',
 };

 const mockAnalysisDetails: AnalysisDetailsResponse = {
 analysisId: 'analysis-123',
 originalFilename: 'test.pdf',
 createdAt: new Date('2024-12-14T15:30:00.000Z'),
 result: {
 summary: {
 overallScore: 78,
 meetsMinimumQuality: true,
 dimensions: mockAnalysisResponse.dimensions,
 totalIssues: 9,
 totalSuggestions: 5,
 },
 analyzedAt: new Date('2024-12-14T15:30:00.000Z'),
 documentInfo: mockAnalysisResponse.documentInfo,
 },
 report: {
 generatedAt: new Date('2024-12-14T15:30:00.000Z'),
 documentInfo: mockAnalysisResponse.documentInfo,
 executiveSummary: {
 overallScore: 78,
 meetsMinimumQuality: true,
 totalIssues: 9,
 criticalCount: 1,
 importantCount: 3,
 suggestionCount: 5,
 verdict: 'Aprovado com ressalvas',
 },
 dimensions: [],
 prioritizedRecommendations: [],
 },
 };

 const mockConversionResponse: ConvertToEtpResponse = {
 etpId: 'etp-456',
 title: 'ETP - Contratação de Serviços de TI',
 status: 'draft',
 sectionsCount: 8,
 mappedSectionsCount: 6,
 customSectionsCount: 2,
 convertedAt: new Date('2024-12-14T15:35:00.000Z'),
 message: 'Documento convertido para ETP com sucesso.',
 };

 beforeEach(() => {
 vi.clearAllMocks();

 // Reset store state
 useAnalysisStore.setState({
 analysisResult: null,
 analysisDetails: null,
 conversionResult: null,
 status: 'idle',
 uploadProgress: 0,
 error: null,
 });
 });

 afterEach(() => {
 vi.restoreAllMocks();
 });

 describe('Initial state', () => {
 it('should start with idle status and null values', () => {
 const { result } = renderHook(() => useAnalysisStore());

 expect(result.current.analysisResult).toBeNull();
 expect(result.current.analysisDetails).toBeNull();
 expect(result.current.conversionResult).toBeNull();
 expect(result.current.status).toBe('idle');
 expect(result.current.uploadProgress).toBe(0);
 expect(result.current.error).toBeNull();
 });
 });

 describe('uploadAndAnalyze', () => {
 it('should upload and analyze document successfully', async () => {
 vi.mocked(api.post).mockResolvedValue({
 data: {
 data: mockAnalysisResponse,
 disclaimer: 'Test disclaimer',
 },
 });

 const { result } = renderHook(() => useAnalysisStore());

 let response: AnalysisResponse;
 await act(async () => {
 response = await result.current.uploadAndAnalyze(mockFile);
 });

 expect(api.post).toHaveBeenCalledWith(
 '/analysis/upload',
 expect.any(FormData),
 expect.objectContaining({
 headers: { 'Content-Type': 'multipart/form-data' },
 }),
 );
 expect(response!).toEqual(mockAnalysisResponse);
 expect(result.current.analysisResult).toEqual(mockAnalysisResponse);
 expect(result.current.status).toBe('completed');
 expect(result.current.uploadProgress).toBe(100);
 expect(result.current.error).toBeNull();
 });

 it('should set error on upload failure', async () => {
 const errorMessage = 'Arquivo inválido';
 vi.mocked(api.post).mockRejectedValue(new Error(errorMessage));

 try {
 await act(async () => {
 await useAnalysisStore.getState().uploadAndAnalyze(mockFile);
 });
 } catch {
 // Expected to throw
 }

 // Directly check store state
 const state = useAnalysisStore.getState();
 expect(state.status).toBe('failed');
 expect(state.error).toBe(errorMessage);
 expect(state.uploadProgress).toBe(0);
 expect(state.analysisResult).toBeNull();
 });

 it('should complete upload with correct final status', async () => {
 vi.mocked(api.post).mockResolvedValue({
 data: {
 data: mockAnalysisResponse,
 disclaimer: 'Test',
 },
 });

 await act(async () => {
 await useAnalysisStore.getState().uploadAndAnalyze(mockFile);
 });

 const state = useAnalysisStore.getState();
 expect(state.status).toBe('completed');
 expect(state.uploadProgress).toBe(100);
 });
 });

 describe('getAnalysisDetails', () => {
 it('should fetch analysis details successfully', async () => {
 vi.mocked(api.get).mockResolvedValue({
 data: {
 data: mockAnalysisDetails,
 disclaimer: 'Test',
 },
 });

 const { result } = renderHook(() => useAnalysisStore());

 let details: AnalysisDetailsResponse;
 await act(async () => {
 details = await result.current.getAnalysisDetails('analysis-123');
 });

 expect(api.get).toHaveBeenCalledWith('/analysis/analysis-123');
 expect(details!).toEqual(mockAnalysisDetails);
 expect(result.current.analysisDetails).toEqual(mockAnalysisDetails);
 expect(result.current.error).toBeNull();
 });

 it('should set error on fetch failure', async () => {
 const errorMessage = 'Análise não encontrada';
 vi.mocked(api.get).mockRejectedValue(new Error(errorMessage));

 try {
 await act(async () => {
 await useAnalysisStore.getState().getAnalysisDetails('invalid-id');
 });
 } catch {
 // Expected to throw
 }

 // Directly check store state
 const state = useAnalysisStore.getState();
 expect(state.error).toBe(errorMessage);
 expect(state.analysisDetails).toBeNull();
 });
 });

 describe('downloadReport', () => {
 it('should call API with correct parameters', async () => {
 const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
 vi.mocked(api.get).mockResolvedValue({ data: mockBlob });

 // Mock URL.createObjectURL
 const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
 const mockRevokeObjectURL = vi.fn();
 global.URL.createObjectURL = mockCreateObjectURL;
 global.URL.revokeObjectURL = mockRevokeObjectURL;

 // Mock createElement and link
 const mockClick = vi.fn();
 const mockSetAttribute = vi.fn();
 const originalCreateElement = document.createElement.bind(document);
 vi.spyOn(document, 'createElement').mockImplementation(
 (tagName: string) => {
 if (tagName === 'a') {
 return {
 href: '',
 setAttribute: mockSetAttribute,
 click: mockClick,
 } as unknown as HTMLElement;
 }
 return originalCreateElement(tagName);
 },
 );
 vi.spyOn(document.body, 'appendChild').mockImplementation(
 (node) => node as never,
 );
 vi.spyOn(document.body, 'removeChild').mockImplementation(
 (node) => node as never,
 );

 await act(async () => {
 await useAnalysisStore
 .getState()
 .downloadReport('analysis-123', 'test.pdf');
 });

 expect(api.get).toHaveBeenCalledWith(
 '/analysis/analysis-123/report/pdf',
 {
 responseType: 'blob',
 },
 );
 expect(mockSetAttribute).toHaveBeenCalledWith(
 'download',
 expect.stringContaining('analise_test_'),
 );
 expect(mockClick).toHaveBeenCalled();

 // Restore createElement
 vi.restoreAllMocks();
 });

 it('should set error on download failure', async () => {
 const errorMessage = 'Erro ao baixar relatório';
 vi.mocked(api.get).mockRejectedValue(new Error(errorMessage));

 try {
 await act(async () => {
 await useAnalysisStore
 .getState()
 .downloadReport('analysis-123', 'test.pdf');
 });
 } catch {
 // Expected to throw
 }

 // Directly check store state
 const state = useAnalysisStore.getState();
 expect(state.error).toBe(errorMessage);
 });
 });

 describe('convertToEtp', () => {
 it('should convert document to ETP successfully', async () => {
 vi.mocked(api.post).mockResolvedValue({
 data: {
 data: mockConversionResponse,
 disclaimer: 'Test',
 },
 });

 const { result } = renderHook(() => useAnalysisStore());

 // Setup: set analysis result first
 act(() => {
 useAnalysisStore.setState({
 analysisResult: mockAnalysisResponse,
 });
 });

 let response: ConvertToEtpResponse;
 await act(async () => {
 response = await result.current.convertToEtp('analysis-123', {
 title: 'Custom Title',
 });
 });

 expect(api.post).toHaveBeenCalledWith('/analysis/analysis-123/convert', {
 title: 'Custom Title',
 });
 expect(response!).toEqual(mockConversionResponse);
 expect(result.current.conversionResult).toEqual(mockConversionResponse);
 // Analysis state should be cleared after conversion
 expect(result.current.analysisResult).toBeNull();
 expect(result.current.analysisDetails).toBeNull();
 expect(result.current.status).toBe('idle');
 expect(result.current.error).toBeNull();
 });

 it('should convert without options', async () => {
 vi.mocked(api.post).mockResolvedValue({
 data: {
 data: mockConversionResponse,
 disclaimer: 'Test',
 },
 });

 const { result } = renderHook(() => useAnalysisStore());

 await act(async () => {
 await result.current.convertToEtp('analysis-123');
 });

 expect(api.post).toHaveBeenCalledWith(
 '/analysis/analysis-123/convert',
 {},
 );
 });

 it('should set error on conversion failure', async () => {
 const errorMessage = 'Falha na conversão';
 vi.mocked(api.post).mockRejectedValue(new Error(errorMessage));

 try {
 await act(async () => {
 await useAnalysisStore.getState().convertToEtp('analysis-123');
 });
 } catch {
 // Expected to throw
 }

 // Directly check store state
 const state = useAnalysisStore.getState();
 expect(state.error).toBe(errorMessage);
 expect(state.conversionResult).toBeNull();
 });
 });

 describe('clearError', () => {
 it('should clear error state', () => {
 const { result } = renderHook(() => useAnalysisStore());

 // Setup: set error
 act(() => {
 useAnalysisStore.setState({ error: 'Some error' });
 });

 expect(result.current.error).toBe('Some error');

 act(() => {
 result.current.clearError();
 });

 expect(result.current.error).toBeNull();
 });
 });

 describe('resetStore', () => {
 it('should reset all state to initial values', () => {
 const { result } = renderHook(() => useAnalysisStore());

 // Setup: set various state
 act(() => {
 useAnalysisStore.setState({
 analysisResult: mockAnalysisResponse,
 analysisDetails: mockAnalysisDetails,
 conversionResult: mockConversionResponse,
 status: 'completed',
 uploadProgress: 100,
 error: 'Some error',
 });
 });

 expect(result.current.analysisResult).not.toBeNull();
 expect(result.current.status).toBe('completed');

 act(() => {
 result.current.resetStore();
 });

 expect(result.current.analysisResult).toBeNull();
 expect(result.current.analysisDetails).toBeNull();
 expect(result.current.conversionResult).toBeNull();
 expect(result.current.status).toBe('idle');
 expect(result.current.uploadProgress).toBe(0);
 expect(result.current.error).toBeNull();
 });
 });
});
