import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileTopbarProps {
  /** Sidebar content rendered inside the sheet. */
  children: ReactNode;
  /** Optional label shown next to the logo. */
  label?: string;
  /** Tailwind breakpoint above which the topbar hides. Defaults to `lg`. */
  hideAt?: "md" | "lg";
}

export default function MobileTopbar({
  children,
  label,
  hideAt = "lg",
}: MobileTopbarProps) {
  const [open, setOpen] = useState(false);
  const hiddenClass = hideAt === "md" ? "md:hidden" : "lg:hidden";

  return (
    <div
      className={`${hiddenClass} sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4`}
    >
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">NOVU</span>
        {label && (
          <span className="text-sm text-muted-foreground ml-1 hidden sm:inline">
            · {label}
          </span>
        )}
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-72 max-w-[85vw]"
          onClick={(e) => {
            // Close when any link/button inside is clicked
            const target = e.target as HTMLElement;
            if (target.closest("a, button")) setOpen(false);
          }}
        >
          {children}
        </SheetContent>
      </Sheet>
    </div>
  );
}
