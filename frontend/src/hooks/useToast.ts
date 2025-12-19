import { useUIStore } from '@/store/uiStore';
import { TOAST_DURATION } from '@/lib/constants';

export function useToast() {
 const { showToast } = useUIStore();

 return {
 toast: ({
 title,
 description,
 variant = 'default',
 duration = TOAST_DURATION,
 }: {
 title?: string;
 description?: string;
 variant?: 'default' | 'destructive' | 'success';
 duration?: number;
 }) => {
 showToast({ title, description, variant, duration });
 },
 success: (description: string, title = 'Sucesso') => {
 showToast({
 title,
 description,
 variant: 'success',
 duration: TOAST_DURATION,
 });
 },
 error: (description: string, title = 'Erro') => {
 showToast({
 title,
 description,
 variant: 'destructive',
 duration: TOAST_DURATION,
 });
 },
 };
}
