import { MarketplaceView } from '@/components/marketplace/MarketplaceView';

export default function CoursesPage() {
  return (
    <div className="page-container py-8">
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
