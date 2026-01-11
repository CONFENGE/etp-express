import { memo } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRSectionTemplate, TermoReferencia } from '@/types/termo-referencia';

/**
 * Tabs list component for TR Editor section navigation.
 *
 * Displays horizontal scrollable tabs for each TR section.
 * Shows completion status with check icons.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

interface TREditorTabsListProps {
  /** Section templates for tabs */
  sections: TRSectionTemplate[];
  /** Function to check if a section is filled */
  isSectionFilled: (field: keyof TermoReferencia) => boolean;
}

export const TREditorTabsList = memo(function TREditorTabsList({
  sections,
  isSectionFilled,
}: TREditorTabsListProps) {
  return (
    <TabsList
      className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1"
      data-testid="tr-tabs-list"
    >
      {sections.map((section) => {
        const filled = isSectionFilled(section.field);

        return (
          <TabsTrigger
            key={section.number}
            value={String(section.number)}
            className={cn(
              'flex items-center gap-1 min-w-fit whitespace-nowrap px-3 py-2',
              filled && 'text-green-600',
            )}
            title={section.title}
            data-testid={`tab-${section.number}`}
          >
            {filled && <CheckCircle2 className="h-3 w-3" />}
            <span className="hidden sm:inline">{section.shortTitle}</span>
            <span className="sm:hidden">{section.number}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
});
