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
import { CreateDomainUserDto } from '@/store/managerStore';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDomainUserDto) => Promise<void>;
  domainSuffix: string;
  quotaAvailable: number;
}

/**
 * Dialog for creating a new domain user.
 * Uses Zod validation for email (same domain) and name.
 *
 * Design: Apple Human Interface Guidelines
 * - Clean form layout with clear labels
 * - Inline validation messages
 * - Loading state feedback
 *
 * @security
 * - Email must match domain suffix
 * - Only accessible to users with role: domain_manager
 */
export function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  domainSuffix,
  quotaAvailable,
}: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createUserSchema = z.object({
    email: z
      .string()
      .email('Please enter a valid email address')
      .refine(
        (email) => email.endsWith(`@${domainSuffix}`),
        `Email must be from the domain @${domainSuffix}`,
      ),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters'),
    cargo: z
      .string()
      .max(100, 'Role must be at most 100 characters')
      .optional(),
  });

  type CreateUserFormData = z.infer<typeof createUserSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      name: '',
      cargo: '',
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        email: data.email,
        name: data.name,
        cargo: data.cargo || undefined,
      });
      reset();
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

  const isQuotaExhausted = quotaAvailable <= 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new user to your domain. They will receive an email with
            instructions to set up their account.
          </DialogDescription>
        </DialogHeader>
        {isQuotaExhausted ? (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">
              You have reached your domain&apos;s user quota.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Contact your administrator to increase the quota.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                {...register('name')}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={`user@${domainSuffix}`}
                {...register('email')}
                aria-describedby={errors.email ? 'email-error' : 'email-hint'}
              />
              {errors.email ? (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : (
                <p id="email-hint" className="text-xs text-muted-foreground">
                  Must be an email from @{domainSuffix}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Role (optional)</Label>
              <Input
                id="cargo"
                placeholder="Software Engineer"
                {...register('cargo')}
                aria-describedby={errors.cargo ? 'cargo-error' : undefined}
              />
              {errors.cargo && (
                <p id="cargo-error" className="text-sm text-destructive">
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
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
