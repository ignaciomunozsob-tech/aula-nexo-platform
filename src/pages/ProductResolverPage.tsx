import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CourseDetailPage from "@/pages/CourseDetailPage";
import EventDetailPage from "@/pages/EventDetailPage";
import EbookDetailPage from "@/pages/EbookDetailPage";
import SessionBookingPage from "@/pages/SessionBookingPage";
import NotFound from "@/pages/NotFound";

/**
 * Universal resolver for pretty product URLs: /:creatorSlug/:slug
 * Uses the DB function `resolve_creator_product` to look up which
 * product type a slug belongs to within a creator's namespace.
 */
export default function ProductResolverPage() {
  const { creatorSlug, slug } = useParams<{ creatorSlug: string; slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["resolve-product", creatorSlug, slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resolve_creator_product", {
        _creator_slug: creatorSlug!,
        _product_slug: slug!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row || null;
    },
    enabled: !!creatorSlug && !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) return <NotFound />;

  switch (data.product_type) {
    case "course":
      return <CourseDetailPage />;
    case "event":
      return <EventDetailPage eventId={data.product_id} />;
    case "ebook":
      return <EbookDetailPage ebookId={data.product_id} />;
    case "session":
      return <SessionBookingPage sessionIdOverride={data.product_id} />;
    default:
      return <NotFound />;
  }
}
