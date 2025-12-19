import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Section {
 id: string;
 title: string;
 completed: boolean;
}

interface ETPEditorTabsListProps {
 sections: Section[];
}

export function ETPEditorTabsList({ sections }: ETPEditorTabsListProps) {
 return (
 <TabsList className="grid grid-cols-4 lg:grid-cols-7">
 {sections.map((section) => (
 <TabsTrigger key={section.id} value={section.id}>
 {section.completed && ''} {section.title}
 </TabsTrigger>
 ))}
 </TabsList>
 );
}
