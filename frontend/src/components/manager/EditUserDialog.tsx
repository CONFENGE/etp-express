import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Label } from '@/components/ui/label';
import { DomainUser, UpdateDomainUserDto } from '@/store/managerStore';

const editUserSchema = z.object({
 name: z
 .string()
 .min(2, 'Name must be at least 2 characters')
 .max(100, 'Name must be at most 100 characters'),
 cargo: z.string().max(100, 'Role must be at most 100 characters').optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 user: DomainUser | null;
 onSubmit: (id: string, data: UpdateDomainUserDto) => Promise<void>;
}

/**
 * Dialog for editing an existing domain user.
 * Only allows editing name and cargo (role).
 * Email cannot be changed after creation.
 *
 * Design: Apple Human Interface Guidelines
 * - Pre-filled form with current values
 * - Clear indication of non-editable fields
 * - Loading state feedback
 *
 * @security Only accessible to users with role: domain_manager
 */
export function EditUserDialog({
 open,
 onOpenChange,
 user,
 onSubmit,
}: EditUserDialogProps) {
 const [isSubmitting, setIsSubmitting] = useState(false);

 const {
 register,
 handleSubmit,
 reset,
 formState: { errors },
 } = useForm<EditUserFormData>({
 resolver: zodResolver(editUserSchema),
 defaultValues: {
 name: '',
 cargo: '',
 },
 });

 useEffect(() => {
 if (user && open) {
 reset({
 name: user.name,
 cargo: user.cargo || '',
 });
 }
 }, [user, open, reset]);

 const handleFormSubmit = async (data: EditUserFormData) => {
 if (!user) return;

 setIsSubmitting(true);
 try {
 await onSubmit(user.id, {
 name: data.name,
 cargo: data.cargo || undefined,
 });
 onOpenChange(false);
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleOpenChange = (newOpen: boolean) => {
 if (!newOpen) {
 reset();
 }
 onOpenChange(newOpen);
 };

 if (!user) return null;

 return (
 <Dialog open={open} onOpenChange={handleOpenChange}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle>Edit User</DialogTitle>
 <DialogDescription>
 Update user information. Email address cannot be changed.
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="email-readonly">Email</Label>
 <Input
 id="email-readonly"
 value={user.email}
 disabled
 className="bg-muted"
 aria-describedby="email-readonly-hint"
 />
 <p
 id="email-readonly-hint"
 className="text-xs text-muted-foreground"
 >
 Email cannot be changed after account creation
 </p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="edit-name">Full Name</Label>
 <Input
 id="edit-name"
 placeholder="John Doe"
 {...register('name')}
 aria-describedby={errors.name ? 'edit-name-error' : undefined}
 />
 {errors.name && (
 <p id="edit-name-error" className="text-sm text-destructive">
 {errors.name.message}
 </p>
 )}
 </div>
 <div className="space-y-2">
 <Label htmlFor="edit-cargo">Role (optional)</Label>
 <Input
 id="edit-cargo"
 placeholder="Software Engineer"
 {...register('cargo')}
 aria-describedby={errors.cargo ? 'edit-cargo-error' : undefined}
 />
 {errors.cargo && (
 <p id="edit-cargo-error" className="text-sm text-destructive">
 {errors.cargo.message}
 </p>
 )}
 </div>
 <DialogFooter>
 <Button
 type="button"
 variant="outline"
 onClick={() => handleOpenChange(false)}
 disabled={isSubmitting}
 >
 Cancel
 </Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting ? 'Saving...' : 'Save Changes'}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
