// src/components/ErrorBoundary.tsx
import React from "react";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string; stack?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any) {
    return {
      hasError: true,
      message: err?.message || String(err),
      stack: err?.stack,
    };
  }

  componentDidCatch(error: any, info: any) {
    // útil para debugging (puedes sacar esto después)
    console.error("UI crashed:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border bg-card p-6 space-y-3">
          <h1 className="text-lg font-bold">Se cayó la app 😵‍💫</h1>
          <p className="text-sm text-muted-foreground">
            Esto normalmente pasa por variables de entorno (Supabase) o por un error en runtime.
          </p>

          <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
            {this.state.message}
          </div>

          <div className="flex gap-2">
            <Button onClick={this.reset}>Recargar</Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(this.state.message || "")}>
              Copiar error
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: abre /debug para revisar conexión con Supabase.
          </p>
        </div>
      </div>
    );
  }
}
