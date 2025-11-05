import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-2xl">Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
