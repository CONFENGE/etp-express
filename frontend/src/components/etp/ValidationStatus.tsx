import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/types/etp';

interface ValidationStatusProps {
 validation: ValidationResult;
}

export function ValidationStatus({ validation }: ValidationStatusProps) {
 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-sm">Status de Validação</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm text-muted-foreground">Completude</span>
 <Badge
 variant={validation.completeness === 100 ? 'success' : 'warning'}
 >
 {validation.completeness}%
 </Badge>
 </div>

 {validation.errors.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-sm font-medium text-destructive">
 <XCircle className="h-4 w-4" />
 Erros ({validation.errors.length})
 </div>
 <ul className="space-y-1">
 {validation.errors.map((error, index) => (
 <li key={index} className="text-xs text-muted-foreground ml-6">
 Seção {error.sectionNumber}: {error.message}
 </li>
 ))}
 </ul>
 </div>
 )}

 {validation.warnings.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
 <AlertTriangle className="h-4 w-4" />
 Avisos ({validation.warnings.length})
 </div>
 <ul className="space-y-1">
 {validation.warnings.map((warning, index) => (
 <li key={index} className="text-xs text-muted-foreground ml-6">
 Seção {warning.sectionNumber}: {warning.message}
 </li>
 ))}
 </ul>
 </div>
 )}

 {validation.isValid && (
 <div className="flex items-center gap-2 text-sm font-medium text-green-600">
 <CheckCircle className="h-4 w-4" />
 ETP válido e pronto para exportação
 </div>
 )}
 </CardContent>
 </Card>
 );
}
