import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (role: "creator" | "student") => void;
}

export function RoleChoiceDialog({ open, onOpenChange, onChoose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cómo quieres entrar hoy?</DialogTitle>
          <DialogDescription>
            Tu cuenta tiene acceso como creador y como alumno. Elige con qué rol quieres continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => onChoose("creator")}
            className="novu-btn-primary w-full"
            style={{ padding: "12px 22px" }}
          >
            Como creador
          </button>
          <Button variant="outline" className="w-full" onClick={() => onChoose("student")}>
            Como alumno
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
