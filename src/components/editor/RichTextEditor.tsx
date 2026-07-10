import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, List, ListOrdered, Link2 } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 180 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const lastEmittedRef = useRef<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!initializedRef.current) {
      el.innerHTML = value || "";
      initializedRef.current = true;
      lastEmittedRef.current = value || "";
      return;
    }
    if (document.activeElement === el) return;
    if (value === lastEmittedRef.current) return;
    if ((el.innerHTML || "") !== (value || "")) {
      el.innerHTML = value || "";
      lastEmittedRef.current = value || "";
    }
  }, [value]);

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
  }, []);

  const emit = () => {
    const html = ref.current?.innerHTML || "";
    lastEmittedRef.current = html;
    onChange(html);
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const addLink = () => {
    const url = window.prompt("Pega el link (https://...)");
    if (!url) return;
    if (!isValidUrl(url)) {
      alert("URL inválida. Solo se permiten enlaces http:// o https://");
      return;
    }
    exec("createLink", url);
  };

  const handleBlur = () => {
    const raw = ref.current?.innerHTML || "";
    const clean = sanitizeHtml(raw);
    if (ref.current && clean !== raw) ref.current.innerHTML = clean;
    lastEmittedRef.current = clean;
    onChange(clean);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation();
    }
  };

  const isEmpty = !value || value.replace(/<[^>]+>/g, "").trim() === "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4 mr-1" /> Negrita
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4 mr-1" /> Cursiva
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4 mr-1" /> Subrayado
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4 mr-1" /> Lista
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4 mr-1" /> Numerada
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Link2 className="h-4 w-4 mr-1" /> Link
        </Button>
      </div>

      <div className="relative">
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          style={{ minHeight }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
          onInput={emit}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: pega texto normal y luego aplica formato con los botones. Enter crea un nuevo párrafo.
      </p>
    </div>
  );
}

export default RichTextEditor;
