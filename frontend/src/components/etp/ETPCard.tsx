import { Link } from 'react-router';
import { MoreVertical, Edit, Trash2, Download } from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ETP } from '@/types/etp';
import { ETP_STATUS_LABELS, ETP_STATUS_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface ETPCardProps {
  etp: ETP;
  onDelete?: (id: string) => void;
}

export function ETPCard({ etp, onDelete }: ETPCardProps) {
  return (
    <GlassSurface
      intensity="medium"
      className="shadow-lg group cursor-pointer"
      style={{
        transition: `
          transform var(--duration-normal) var(--ease-apple-standard),
          box-shadow var(--duration-normal) var(--ease-apple-standard)
        `,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow =
          'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{etp.title}</CardTitle>
            {etp.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {etp.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={ETP_STATUS_COLORS[etp.status]}>
              {ETP_STATUS_LABELS[etp.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/etps/${etp.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(etp.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progresso</span>
              <span className="text-sm font-medium">{etp.progress}%</span>
            </div>
            <Progress value={etp.progress} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Atualizado em {formatDate(etp.updatedAt)}
            </span>
          </div>
          <Button asChild className="w-full" variant="outline">
            <Link to={`/etps/${etp.id}`}>Abrir ETP</Link>
          </Button>
        </div>
      </CardContent>
    </GlassSurface>
  );
}
