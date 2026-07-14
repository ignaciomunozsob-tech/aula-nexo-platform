import { MarketplaceView } from '@/components/marketplace/MarketplaceView';
import { SEO } from '@/components/SEO';

export default function CoursesPage() {
  return (
    <div className="page-container py-8">
      <SEO
        title="Marketplace — NOVU"
        description="Explora cursos, talleres y productos digitales de creadores chilenos en NOVU."
        path="/courses"
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-muted-foreground">
          Encuentra cursos, ebooks y eventos perfectos para ti
        </p>
      </div>

      <MarketplaceView showHeader={false} />
    </div>
  );
}
