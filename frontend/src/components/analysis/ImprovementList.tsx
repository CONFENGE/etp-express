import { useMemo, useState } from 'react';
import {
 AlertCircle,
 AlertTriangle,
 Lightbulb,
 ChevronDown,
 ChevronUp,
 Scale,
 FileText,
 BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
 type ReportIssue,
 type AnalysisDimensionType,
 type SeverityLevel,
 DIMENSION_LABELS,
 SEVERITY_CONFIG,
} from '@/types/analysis';

/**
 * Props for ImprovementList component
 */
export interface ImprovementListProps {
 /**
 * List of issues/improvements to display
 */
 issues: ReportIssue[];
 /**
 * Whether to show expanded view by default
 */
 defaultExpanded?: boolean;
 /**
 * Maximum items to show before "show more"
 */
 maxInitialItems?: number;
 /**
 * Additional class names
 */
 className?: string;
}

/**
 * Get icon for severity level
 */
function getSeverityIcon(severity: SeverityLevel) {
 switch (severity) {
 case 'critical':
 return AlertCircle;
 case 'important':
 return AlertTriangle;
 case 'suggestion':
 return Lightbulb;
 }
}

/**
 * Get icon for dimension
 */
function getDimensionIcon(dimension: AnalysisDimensionType) {
 switch (dimension) {
 case 'legal':
 return Scale;
 case 'clareza':
 return FileText;
 case 'fundamentacao':
 return BookOpen;
 }
}

/**
 * Individual improvement item component
 */
interface ImprovementItemProps {
 issue: ReportIssue;
 showDimension?: boolean;
}

function ImprovementItem({
 issue,
 showDimension = false,
}: ImprovementItemProps) {
 const [isExpanded, setIsExpanded] = useState(false);
 const severityConfig = SEVERITY_CONFIG[issue.severity];
 const SeverityIcon = getSeverityIcon(issue.severity);
 const DimensionIcon = getDimensionIcon(issue.dimension);

 return (
 <div
 className={cn(
 'border rounded-lg p-4 transition-all',
 issue.severity === 'critical' && 'border-red-200 bg-red-50/50',
 issue.severity === 'important' && 'border-yellow-200 bg-yellow-50/50',
 issue.severity === 'suggestion' && 'border-blue-200 bg-blue-50/50',
 )}
 >
 <div className="flex items-start gap-3">
 <div
 className={cn(
 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
 severityConfig.bgColor,
 )}
 >
 <SeverityIcon
 className={cn('h-4 w-4', severityConfig.color)}
 aria-hidden="true"
 />
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <Badge
 variant="outline"
 className={cn(
 'text-xs',
 severityConfig.color,
 severityConfig.bgColor,
 )}
 >
 {severityConfig.label}
 </Badge>
 {showDimension && (
 <Badge variant="secondary" className="text-xs gap-1">
 <DimensionIcon className="h-3 w-3" aria-hidden="true" />
 {DIMENSION_LABELS[issue.dimension]}
 </Badge>
 )}
 </div>

 <h4 className="font-medium mt-2 text-sm">{issue.title}</h4>

 <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
 {issue.description}
 </p>

 {/* Expandable Recommendation */}
 <Button
 variant="ghost"
 size="sm"
 className="mt-2 h-auto p-0 text-primary hover:bg-transparent"
 onClick={() => setIsExpanded(!isExpanded)}
 aria-expanded={isExpanded}
 >
 {isExpanded ? (
 <>
 <ChevronUp className="h-4 w-4 mr-1" aria-hidden="true" />
 Ocultar recomendação
 </>
 ) : (
 <>
 <ChevronDown className="h-4 w-4 mr-1" aria-hidden="true" />
 Ver recomendação
 </>
 )}
 </Button>

 {isExpanded && (
 <div className="mt-3 p-3 bg-background rounded-md border">
 <p className="text-sm font-medium text-primary mb-1">
 Recomendação:
 </p>
 <p className="text-sm text-muted-foreground">
 {issue.recommendation}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

/**
 * ImprovementList Component
 *
 * Displays a list of improvements/issues organized by category (dimension)
 * with priority badges and expandable recommendations.
 *
 * @example
 * ```tsx
 * <ImprovementList
 * issues={[
 * {
 * dimension: 'legal',
 * severity: 'critical',
 * title: 'Referência legal ausente',
 * description: 'O documento não menciona a Lei 14.133/2021',
 * recommendation: 'Adicione referência explícita ao artigo aplicável'
 * }
 * ]}
 * />
 * ```
 */
export function ImprovementList({
 issues,
 defaultExpanded = false,
 maxInitialItems = 5,
 className,
}: ImprovementListProps) {
 const [showAll, setShowAll] = useState(defaultExpanded);

 // Group issues by dimension
 const issuesByDimension = useMemo(() => {
 const grouped: Record<AnalysisDimensionType, ReportIssue[]> = {
 legal: [],
 clareza: [],
 fundamentacao: [],
 };

 issues.forEach((issue) => {
 if (grouped[issue.dimension]) {
 grouped[issue.dimension].push(issue);
 }
 });

 return grouped;
 }, [issues]);

 // Count issues by severity
 const severityCounts = useMemo(() => {
 return issues.reduce(
 (acc, issue) => {
 acc[issue.severity]++;
 return acc;
 },
 { critical: 0, important: 0, suggestion: 0 } as Record<
 SeverityLevel,
 number
 >,
 );
 }, [issues]);

 // Sorted issues by priority (all dimensions)
 const sortedIssues = useMemo(() => {
 const priorityOrder: Record<SeverityLevel, number> = {
 critical: 0,
 important: 1,
 suggestion: 2,
 };

 return [...issues].sort(
 (a, b) => priorityOrder[a.severity] - priorityOrder[b.severity],
 );
 }, [issues]);

 const visibleIssues = showAll
 ? sortedIssues
 : sortedIssues.slice(0, maxInitialItems);
 const hasMore = sortedIssues.length > maxInitialItems;

 // Check which dimensions have issues
 const dimensionsWithIssues = useMemo(() => {
 return (Object.keys(issuesByDimension) as AnalysisDimensionType[]).filter(
 (dim) => issuesByDimension[dim].length > 0,
 );
 }, [issuesByDimension]);

 if (issues.length === 0) {
 return (
 <Card className={className}>
 <CardContent className="pt-6">
 <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
 <Lightbulb
 className="h-12 w-12 mb-4 text-green-500"
 aria-hidden="true"
 />
 <p className="font-medium text-foreground">
 Nenhum problema encontrado
 </p>
 <p className="text-sm mt-1">
 O documento atende aos critérios de qualidade em todas as
 dimensões.
 </p>
 </div>
 </CardContent>
 </Card>
 );
 }

 return (
 <Card className={className}>
 <CardHeader className="pb-4">
 <div className="flex items-center justify-between">
 <CardTitle className="text-base">Melhorias Recomendadas</CardTitle>
 <div className="flex items-center gap-2">
 {severityCounts.critical > 0 && (
 <Badge variant="destructive" className="text-xs">
 {severityCounts.critical} crítico
 {severityCounts.critical > 1 ? 's' : ''}
 </Badge>
 )}
 {severityCounts.important > 0 && (
 <Badge variant="warning" className="text-xs">
 {severityCounts.important} importante
 {severityCounts.important > 1 ? 's' : ''}
 </Badge>
 )}
 </div>
 </div>
 </CardHeader>

 <CardContent className="space-y-4">
 <Tabs defaultValue="all" className="w-full">
 <TabsList className="w-full justify-start overflow-x-auto">
 <TabsTrigger value="all" className="flex-shrink-0">
 Todos ({issues.length})
 </TabsTrigger>
 {dimensionsWithIssues.map((dim) => {
 const DimensionIcon = getDimensionIcon(dim);
 return (
 <TabsTrigger
 key={dim}
 value={dim}
 className="flex-shrink-0 gap-1.5"
 >
 <DimensionIcon className="h-3.5 w-3.5" aria-hidden="true" />
 {DIMENSION_LABELS[dim]} ({issuesByDimension[dim].length})
 </TabsTrigger>
 );
 })}
 </TabsList>

 {/* All Issues Tab */}
 <TabsContent value="all" className="mt-4 space-y-3">
 {visibleIssues.map((issue, index) => (
 <ImprovementItem
 key={`${issue.dimension}-${issue.severity}-${index}`}
 issue={issue}
 showDimension={true}
 />
 ))}

 {hasMore && !showAll && (
 <Button
 variant="outline"
 className="w-full"
 onClick={() => setShowAll(true)}
 >
 Ver mais {sortedIssues.length - maxInitialItems} itens
 <ChevronDown className="h-4 w-4 ml-2" aria-hidden="true" />
 </Button>
 )}

 {showAll && hasMore && (
 <Button
 variant="ghost"
 className="w-full"
 onClick={() => setShowAll(false)}
 >
 Mostrar menos
 <ChevronUp className="h-4 w-4 ml-2" aria-hidden="true" />
 </Button>
 )}
 </TabsContent>

 {/* Dimension-specific Tabs */}
 {dimensionsWithIssues.map((dim) => (
 <TabsContent key={dim} value={dim} className="mt-4 space-y-3">
 {issuesByDimension[dim].map((issue, index) => (
 <ImprovementItem
 key={`${dim}-${issue.severity}-${index}`}
 issue={issue}
 showDimension={false}
 />
 ))}
 </TabsContent>
 ))}
 </Tabs>
 </CardContent>
 </Card>
 );
}
