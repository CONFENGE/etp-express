import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useETPs } from '@/hooks/useETPs';
import { useToast } from '@/hooks/useToast';

const etpSchema = z.object({
 title: z.string().min(5, 'O título deve ter no mínimo 5 caracteres'),
 description: z.string().optional(),
});

type ETPFormData = z.infer<typeof etpSchema>;

interface CreateETPDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

export function CreateETPDialog({ open, onOpenChange }: CreateETPDialogProps) {
 const navigate = useNavigate();
 const { createETP } = useETPs();
 const { success, error } = useToast();
 const [isLoading, setIsLoading] = useState(false);

 const {
 register,
 handleSubmit,
 formState: { errors },
 reset,
 } = useForm<ETPFormData>({
 resolver: zodResolver(etpSchema),
 });

 const onSubmit = async (data: ETPFormData) => {
 setIsLoading(true);
 try {
 const etp = await createETP({
 title: data.title,
 description: data.description,
 status: 'draft',
 progress: 0,
 });
 success('ETP criado com sucesso!');
 reset();
 onOpenChange(false);
 navigate(`/etps/${etp.id}`);
 } catch {
 error('Erro ao criar ETP. Tente novamente.');
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Criar Novo ETP</DialogTitle>
 <DialogDescription>
 Crie um novo Estudo Técnico Preliminar
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit(onSubmit)}>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="title">Título *</Label>
 <Input
 id="title"
 placeholder="Ex: Contratação de Serviços de TI"
 {...register('title')}
 aria-invalid={errors.title ? 'true' : 'false'}
 />
 {errors.title && (
 <p className="text-sm text-destructive">
 {errors.title.message}
 </p>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="description">Descrição</Label>
 <Textarea
 id="description"
 placeholder="Descrição breve do ETP..."
 rows={3}
 {...register('description')}
 />
 </div>
 </div>
 <DialogFooter>
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 disabled={isLoading}
 >
 Cancelar
 </Button>
 <Button type="submit" disabled={isLoading}>
 {isLoading ? 'Criando...' : 'Criar ETP'}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
