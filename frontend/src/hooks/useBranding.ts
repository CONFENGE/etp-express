import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface TenantBranding {
  id: string;
  organizationId: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  footerText: string | null;
  isActive: boolean;
}

/**
 * Hook to fetch and apply tenant branding.
 * Loads branding based on:
 * 1. Custom domain (if accessing via subdomain)
 * 2. User's organization (if logged in)
 */
export function useBranding() {
  const { user } = useAuthStore();
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        setIsLoading(true);

        // Try to load branding by domain first
        const domain = window.location.hostname;
        if (domain && domain !== 'localhost') {
          const response = await api.get<TenantBranding>(
            `/tenant-branding/by-domain?domain=${domain}`,
          );
          if (response.data) {
            setBranding(response.data);
            applyBranding(response.data);
            return;
          }
        }

        // Fall back to user's organization
        if (user?.organization?.id) {
          const response = await api.get<TenantBranding>(
            `/tenant-branding/by-organization/${user.organization.id}`,
          );
          if (response.data) {
            setBranding(response.data);
            applyBranding(response.data);
            return;
          }
        }

        // No branding found - use defaults
        setBranding(null);
        resetBranding();
      } catch (error) {
        console.error('Failed to load branding:', error);
        setBranding(null);
        resetBranding();
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, [user?.organization?.id]);

  return { branding, isLoading };
}

/**
 * Apply branding to the document root.
 * Updates CSS custom properties for dynamic theming.
 */
function applyBranding(branding: TenantBranding) {
  const root = document.documentElement;

  if (branding.primaryColor) {
    // Convert HEX to HSL for Tailwind compatibility
    const hsl = hexToHSL(branding.primaryColor);
    root.style.setProperty('--primary', hsl);
  }

  if (branding.secondaryColor) {
    const hsl = hexToHSL(branding.secondaryColor);
    root.style.setProperty('--secondary', hsl);
  }

  if (branding.accentColor) {
    const hsl = hexToHSL(branding.accentColor);
    root.style.setProperty('--accent', hsl);
  }

  // Store logo URL in a data attribute for Header component
  if (branding.logoUrl) {
    root.setAttribute('data-tenant-logo', branding.logoUrl);
  } else {
    root.removeAttribute('data-tenant-logo');
  }

  // Store footer text
  if (branding.footerText) {
    root.setAttribute('data-tenant-footer', branding.footerText);
  } else {
    root.removeAttribute('data-tenant-footer');
  }
}

/**
 * Reset branding to defaults.
 */
function resetBranding() {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--accent');
  root.removeAttribute('data-tenant-logo');
  root.removeAttribute('data-tenant-footer');
}

/**
 * Convert HEX color to HSL format for Tailwind.
 * @param hex - HEX color (e.g., "#0066cc")
 * @returns HSL string (e.g., "221.2 83.2% 53.3%")
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  const sanitizedHex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(sanitizedHex.substring(0, 2), 16) / 255;
  const g = parseInt(sanitizedHex.substring(2, 4), 16) / 255;
  const b = parseInt(sanitizedHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}
