import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProductType = 'course' | 'ebook' | 'event';

const productTypes = [
  {
    type: 'course' as ProductType,
    icon: BookOpen,
    title: 'Curso',
    description: 'Crea un curso con módulos y lecciones en video o texto',
  },
  {
    type: 'ebook' as ProductType,
    icon: FileText,
    title: 'E-book',
    description: 'Sube un libro digital en PDF o EPUB para vender',
  },
  {
    type: 'event' as ProductType,
    icon: Calendar,
    title: 'Evento Online',
    description: 'Programa un evento en vivo con cupos limitados',
  },
];

export function NewProductDialog({ open, onOpenChange }: NewProductDialogProps) {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const handleContinue = () => {
    if (!selectedType) return;

    onOpenChange(false);
    setSelectedType(null);

    switch (selectedType) {
      case 'course':
        navigate('/creator-app/courses/new');
        break;
      case 'ebook':
        navigate('/creator-app/ebooks/new');
        break;
      case 'event':
        navigate('/creator-app/events/new');
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">¿Qué quieres publicar hoy?</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {productTypes.map((product) => (
            <button
              key={product.type}
              onClick={() => setSelectedType(product.type)}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                selectedType === product.type
                  ? 'border-primary bg-primary/10'
                  : 'border-border'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg',
                selectedType === product.type ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <product.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{product.title}</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleContinue} disabled={!selectedType}>
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
