import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Palette, Save } from 'lucide-react';
import type { TenantBranding } from '@/hooks/useBranding';

/**
 * Branding Settings Page
 * Allows admin users to customize white-label branding for their organization.
 */
export function BrandingSettingsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [formData, setFormData] = useState({
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    customDomain: '',
    footerText: '',
  });

  // Load existing branding
  useEffect(() => {
    const loadBranding = async () => {
      if (!user?.organization?.id) return;

      try {
        setIsLoading(true);
        const response = await api.get<TenantBranding>(
          `/tenant-branding/by-organization/${user.organization.id}`,
        );

        if (response.data) {
          setBranding(response.data);
          setFormData({
            logoUrl: response.data.logoUrl || '',
            primaryColor: response.data.primaryColor || '',
            secondaryColor: response.data.secondaryColor || '',
            accentColor: response.data.accentColor || '',
            customDomain: response.data.customDomain || '',
            footerText: response.data.footerText || '',
          });
        }
      } catch (error) {
        console.error('Failed to load branding:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, [user?.organization?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organization?.id) return;

    try {
      setIsSaving(true);

      if (branding) {
        // Update existing branding
        await api.patch(`/tenant-branding/${branding.id}`, formData);
        toast({
          title: 'Branding atualizado',
          description: 'As configurações de personalização foram atualizadas com sucesso.',
        });
      } else {
        // Create new branding
        await api.post('/tenant-branding', {
          ...formData,
          organizationId: user.organization.id,
        });
        toast({
          title: 'Branding criado',
          description: 'As configurações de personalização foram criadas com sucesso.',
        });
      }

      // Reload page to apply new branding
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.response?.data?.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Palette className="h-8 w-8 text-primary" />
          Personalização White-Label
        </h1>
        <p className="text-muted-foreground mt-2">
          Customize a aparência da plataforma para sua organização.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              URL da logo da sua organização (recomendado: 200x60px, PNG transparente)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL da Logo</Label>
              <Input
                id="logoUrl"
                type="url"
                placeholder="https://cdn.example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />
              {formData.logoUrl && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="h-12 object-contain border rounded p-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cores */}
        <Card>
          <CardHeader>
            <CardTitle>Cores Institucionais</CardTitle>
            <CardDescription>
              Cores da identidade visual (formato HEX, ex: #0066cc)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="text"
                    placeholder="#0066cc"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  />
                  <Input
                    type="color"
                    value={formData.primaryColor || '#0066cc'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-16 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="text"
                    placeholder="#f5f5f7"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  />
                  <Input
                    type="color"
                    value={formData.secondaryColor || '#f5f5f7'}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-16 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="text"
                    placeholder="#ff9500"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  />
                  <Input
                    type="color"
                    value={formData.accentColor || '#ff9500'}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-16 h-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domínio Customizado */}
        <Card>
          <CardHeader>
            <CardTitle>Domínio Customizado</CardTitle>
            <CardDescription>
              Subdomínio ou domínio customizado (ex: lages.etp-express.com.br)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="customDomain">Domínio</Label>
              <Input
                id="customDomain"
                type="text"
                placeholder="lages.etp-express.com.br"
                value={formData.customDomain}
                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <Card>
          <CardHeader>
            <CardTitle>Rodapé Personalizado</CardTitle>
            <CardDescription>
              Texto customizado para o rodapé da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="footerText">Texto do Rodapé</Label>
              <Textarea
                id="footerText"
                placeholder="© 2026 Prefeitura de Lages - Todos os direitos reservados"
                value={formData.footerText}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
