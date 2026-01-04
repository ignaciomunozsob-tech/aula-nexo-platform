import { MarketplaceView } from '@/components/marketplace/MarketplaceView';

export default function StudentMarketplacePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">
          Explora cursos, ebooks y eventos para potenciar tu aprendizaje
        </p>
      </div>
      
      <MarketplaceView />
    </div>
  );
}
