import { useState } from 'react';
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
import { CreateDomainDto } from '@/store/adminStore';

const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .max(253, 'Domain must be at most 253 characters')
    .regex(
      /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i,
      'Please enter a valid domain (e.g., example.com)',
    ),
  maxUsers: z
    .number()
    .min(1, 'Minimum 1 user required')
    .max(1000, 'Maximum 1000 users allowed'),
});

type CreateDomainFormData = z.infer<typeof createDomainSchema>;

interface CreateDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDomainDto) => Promise<void>;
}

/**
 * Dialog for creating a new authorized domain.
 * Uses Zod validation for domain format and max users.
 *
 * @security Only accessible to users with role: system_admin
 */
export function CreateDomainDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateDomainDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDomainFormData>({
    resolver: zodResolver(createDomainSchema),
    defaultValues: {
      domain: '',
      maxUsers: 10,
    },
  });

  const handleFormSubmit = async (data: CreateDomainFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Domain</DialogTitle>
          <DialogDescription>
            Add a new authorized domain to the platform. Users with email
            addresses from this domain will be able to register.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              {...register('domain')}
              aria-describedby={errors.domain ? 'domain-error' : undefined}
            />
            {errors.domain && (
              <p id="domain-error" className="text-sm text-destructive">
                {errors.domain.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUsers">Max Users</Label>
            <Input
              id="maxUsers"
              type="number"
              min={1}
              max={1000}
              {...register('maxUsers', { valueAsNumber: true })}
              aria-describedby={errors.maxUsers ? 'maxUsers-error' : undefined}
            />
            {errors.maxUsers && (
              <p id="maxUsers-error" className="text-sm text-destructive">
                {errors.maxUsers.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum number of users that can register with this domain
            </p>
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
              {isSubmitting ? 'Creating...' : 'Create Domain'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
