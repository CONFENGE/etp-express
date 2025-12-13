# React Patterns Skill

## Activation

Esta skill e ativada automaticamente quando voce edita arquivos em `frontend/src/`.

---

## Stack do Frontend ETP Express

- **React 18.2** - Biblioteca UI
- **Vite 7.x** - Build tool
- **TypeScript 5.x** - Type safety
- **Tailwind CSS 3.4** - Styling
- **shadcn/ui** - Componentes (Radix primitives)
- **Zustand** - State management
- **React Hook Form + Zod** - Forms e validacao
- **React Router v6** - Routing
- **Vitest + Testing Library** - Testes

---

## Padroes de Componentes

### Componente Funcional Basico

```tsx
import { FC } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' &&
          'bg-gray-200 text-gray-800 hover:bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
```

### Componente com shadcn/ui

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const EtpCard: FC<EtpCardProps> = ({ etp }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{etp.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="objeto">Objeto</Label>
            <Input id="objeto" value={etp.objeto} readOnly />
          </div>
          <Button onClick={() => navigate(`/etps/${etp.id}`)}>Abrir ETP</Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Hooks Customizados

### Hook de API

```tsx
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(options: UseApiOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (endpoint: string, method = 'GET', body?: unknown) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.request<T>({
          url: endpoint,
          method,
          data: body,
        });
        setData(response.data);
        options.onSuccess?.(response.data);
        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  return { data, loading, error, execute };
}
```

### Hook de Debounce

```tsx
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Zustand Store Pattern

```tsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface EtpState {
  etps: Etp[];
  selectedEtp: Etp | null;
  loading: boolean;
  error: string | null;
  // Actions
  setEtps: (etps: Etp[]) => void;
  selectEtp: (etp: Etp | null) => void;
  addEtp: (etp: Etp) => void;
  updateEtp: (id: string, data: Partial<Etp>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEtpStore = create<EtpState>()(
  devtools(
    persist(
      (set) => ({
        etps: [],
        selectedEtp: null,
        loading: false,
        error: null,
        setEtps: (etps) => set({ etps }),
        selectEtp: (etp) => set({ selectedEtp: etp }),
        addEtp: (etp) => set((state) => ({ etps: [...state.etps, etp] })),
        updateEtp: (id, data) =>
          set((state) => ({
            etps: state.etps.map((e) => (e.id === id ? { ...e, ...data } : e)),
          })),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
      }),
      { name: 'etp-store' },
    ),
  ),
);
```

---

## Forms com React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const etpSchema = z.object({
  title: z.string().min(3, 'Titulo deve ter no minimo 3 caracteres'),
  objeto: z.string().min(10, 'Objeto deve ter no minimo 10 caracteres'),
  justificativa: z.string().optional(),
});

type EtpFormData = z.infer<typeof etpSchema>;

export const EtpForm: FC<EtpFormProps> = ({ onSubmit }) => {
  const form = useForm<EtpFormData>({
    resolver: zodResolver(etpSchema),
    defaultValues: {
      title: '',
      objeto: '',
      justificativa: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titulo</FormLabel>
              <FormControl>
                <Input placeholder="Titulo do ETP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </Form>
  );
};
```

---

## Testes com Vitest + Testing Library

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EtpForm } from './EtpForm';

describe('EtpForm', () => {
  it('should render form fields', () => {
    render(<EtpForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/titulo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
  });

  it('should show validation errors', async () => {
    render(<EtpForm onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/titulo deve ter/i)).toBeInTheDocument();
    });
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<EtpForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/titulo/i), {
      target: { value: 'Meu ETP' },
    });
    fireEvent.change(screen.getByLabelText(/objeto/i), {
      target: { value: 'Objeto de teste com mais de 10 caracteres' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Meu ETP' }),
      );
    });
  });
});
```

---

## Regras do Projeto

1. **Sempre use TypeScript** - Interfaces para props
2. **Sempre use shadcn/ui** - Componentes padrao do projeto
3. **Sempre use Zustand** - Para state global
4. **Sempre use Zod** - Para validacao de forms
5. **Sempre escreva testes** - Coverage minimo 60%
6. **Sempre use cn()** - Para classnames condicionais
