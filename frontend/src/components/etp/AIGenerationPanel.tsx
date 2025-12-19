import { AlertTriangle, Sparkles, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AI_WARNING_MESSAGE } from '@/lib/constants';
import { LoadingState } from '@/components/common/LoadingState';
import { GenerationStatus } from '@/types/etp';
import { getStatusMessage } from '@/lib/polling';

interface AIGenerationPanelProps {
 isGenerating: boolean;
 progress?: number;
 status?: GenerationStatus;
 content?: string;
 onGenerate: () => void;
 onRegenerate: () => void;
 onAccept?: () => void;
}

export function AIGenerationPanel({
 isGenerating,
 progress = 0,
 status = 'idle',
 content,
 onGenerate,
 onRegenerate,
 onAccept,
}: AIGenerationPanelProps) {
 return (
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-primary" />
 Sugestões da IA
 </CardTitle>
 {content && (
 <Badge variant="success">
 <CheckCircle className="h-3 w-3 mr-1" />
 Gerado
 </Badge>
 )}
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 {isGenerating ? (
 <div className="space-y-4">
 <LoadingState
 size="sm"
 message={getStatusMessage(status, progress)}
 />
 <Progress value={progress} className="w-full h-2" />
 <p className="text-xs text-muted-foreground text-center">
 {progress}% concluído
 </p>
 </div>
 ) : content ? (
 <>
 <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
 <div className="flex gap-2">
 <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
 <p className="text-xs text-yellow-800">{AI_WARNING_MESSAGE}</p>
 </div>
 </div>

 <div className="p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
 <p className="text-sm whitespace-pre-wrap">{content}</p>
 </div>

 <div className="flex gap-2">
 {onAccept && (
 <Button onClick={onAccept} size="sm" className="flex-1">
 <CheckCircle className="mr-2 h-4 w-4" />
 Aceitar
 </Button>
 )}
 <Button
 onClick={onRegenerate}
 size="sm"
 variant="outline"
 className="flex-1"
 >
 <RefreshCw className="mr-2 h-4 w-4" />
 Regenerar
 </Button>
 </div>
 </>
 ) : (
 <div className="text-center py-4">
 <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
 <p className="text-sm text-muted-foreground mb-4">
 Clique para gerar conteúdo automaticamente com IA
 </p>
 <Button onClick={onGenerate} size="sm" className="w-full">
 <Sparkles className="mr-2 h-4 w-4" />
 Gerar com IA
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 );
}
