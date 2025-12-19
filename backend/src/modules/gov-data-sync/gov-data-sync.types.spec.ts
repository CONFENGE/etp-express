/**
 * Government Data Sync Types Tests
 *
 * Unit tests for type utility functions.
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 */

import {
 getCurrentReferenceMonth,
 getCurrentQuarterReferenceMonth,
 BRAZILIAN_UFS,
 GOV_DATA_SYNC_QUEUE,
 SINAPI_SYNC_JOB,
 SICRO_SYNC_JOB,
 GOV_CACHE_REFRESH_JOB,
} from './gov-data-sync.types';

describe('gov-data-sync.types', () => {
 describe('getCurrentReferenceMonth', () => {
 it('should return current month in YYYY-MM format', () => {
 const result = getCurrentReferenceMonth();

 expect(result).toMatch(/^\d{4}-\d{2}$/);

 const now = new Date();
 const expectedYear = now.getFullYear();
 const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');

 expect(result).toBe(`${expectedYear}-${expectedMonth}`);
 });
 });

 describe('getCurrentQuarterReferenceMonth', () => {
 it('should return quarter month in YYYY-MM format', () => {
 const result = getCurrentQuarterReferenceMonth();

 expect(result).toMatch(/^\d{4}-\d{2}$/);

 // Quarter months are 01, 04, 07, or 10
 const month = result.split('-')[1];
 expect(['01', '04', '07', '10']).toContain(month);
 });

 it('should return correct quarter month based on current date', () => {
 const result = getCurrentQuarterReferenceMonth();
 const now = new Date();
 const currentMonth = now.getMonth(); // 0-11

 // Calculate expected quarter month
 const quarterMonth = Math.floor(currentMonth / 3) * 3 + 1; // 1, 4, 7, or 10
 const expectedMonth = String(quarterMonth).padStart(2, '0');
 const expectedYear = now.getFullYear();

 expect(result).toBe(`${expectedYear}-${expectedMonth}`);
 });
 });

 describe('BRAZILIAN_UFS', () => {
 it('should contain all 27 Brazilian states', () => {
 expect(BRAZILIAN_UFS).toHaveLength(27);
 });

 it('should contain DF (Distrito Federal)', () => {
 expect(BRAZILIAN_UFS).toContain('DF');
 });

 it('should contain all major states', () => {
 const majorStates = ['SP', 'RJ', 'MG', 'BA', 'RS', 'PR', 'PE'];
 majorStates.forEach((state) => {
 expect(BRAZILIAN_UFS).toContain(state);
 });
 });

 it('should contain northern states', () => {
 const northernStates = ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'];
 northernStates.forEach((state) => {
 expect(BRAZILIAN_UFS).toContain(state);
 });
 });
 });

 describe('Queue and Job constants', () => {
 it('should have correct queue name', () => {
 expect(GOV_DATA_SYNC_QUEUE).toBe('gov-data-sync');
 });

 it('should have correct SINAPI job name', () => {
 expect(SINAPI_SYNC_JOB).toBe('sinapi-sync');
 });

 it('should have correct SICRO job name', () => {
 expect(SICRO_SYNC_JOB).toBe('sicro-sync');
 });

 it('should have correct cache refresh job name', () => {
 expect(GOV_CACHE_REFRESH_JOB).toBe('gov-cache-refresh');
 });
 });
});
