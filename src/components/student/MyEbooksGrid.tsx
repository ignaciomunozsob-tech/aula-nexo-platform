import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getEbookDownloadUrl, type EbookPurchase } from '@/hooks/useStudentLibrary';

export function MyEbooksGrid({ ebooks }: { ebooks: EbookPurchase[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (ebookId: string) => {
    setDownloading(ebookId);
    try {
      const url = await getEbookDownloadUrl(ebookId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('No pudimos abrir el e-book. Intenta nuevamente.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {ebooks.map((ebook) => (
        <div key={ebook.ebook_id} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="aspect-video bg-muted relative overflow-hidden">
            {ebook.cover_image_url ? (
              <img src={ebook.cover_image_url} alt={ebook.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <FileText className="h-12 w-12 text-primary/30" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold line-clamp-2">{ebook.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Comprado el{' '}
              {new Date(ebook.purchased_at).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <Button
              className="w-full mt-4 gap-2"
              onClick={() => handleDownload(ebook.ebook_id)}
              disabled={downloading === ebook.ebook_id}
            >
              {downloading === ebook.ebook_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
