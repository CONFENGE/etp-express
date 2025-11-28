import type { SectionTemplate } from '../types/etp';

let cachedTemplates: SectionTemplate[] | null = null;

/**
 * Loads section templates from the JSON file.
 * Uses caching to avoid multiple fetch calls.
 *
 * @returns Promise resolving to the section templates array
 */
export async function loadSectionTemplates(): Promise<SectionTemplate[]> {
  if (cachedTemplates) {
    return cachedTemplates;
  }

  try {
    const response = await fetch('/data/section-templates.json');
    if (!response.ok) {
      throw new Error(
        `Failed to load section templates: ${response.statusText}`,
      );
    }
    cachedTemplates = await response.json();
    return cachedTemplates;
  } catch (error) {
    console.error('Error loading section templates:', error);
    throw error;
  }
}

/**
 * Synchronously get section templates (requires prior load).
 * Returns cached templates or empty array if not loaded.
 *
 * @returns The cached section templates array
 */
export function getSectionTemplates(): SectionTemplate[] {
  return cachedTemplates || [];
}

/**
 * Clear the cached templates (useful for testing).
 */
export function clearTemplatesCache(): void {
  cachedTemplates = null;
}
