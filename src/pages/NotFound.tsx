import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
          <span className="text-primary-foreground font-bold text-2xl">N</span>
        </div>
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Página no encontrada</p>
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">
          La página que buscas no existe o ha sido movida.
        </p>
        <Button asChild>
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
