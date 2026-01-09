import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Section {
  id: string;
  title: string;
  fullTitle?: string; // Full title for tooltip (#1345)
  completed: boolean;
}

interface ETPEditorTabsListProps {
  sections: Section[];
}

export function ETPEditorTabsList({ sections }: ETPEditorTabsListProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <TabsList className="grid grid-cols-4 lg:grid-cols-7">
        {sections.map((section) => (
          <Tooltip key={section.id}>
            <TooltipTrigger asChild>
              <TabsTrigger value={section.id} className="text-xs">
                {section.completed && '✅ '}
                {section.title}
              </TabsTrigger>
            </TooltipTrigger>
            {section.fullTitle && (
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">{section.fullTitle}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TabsList>
    </TooltipProvider>
  );
}
