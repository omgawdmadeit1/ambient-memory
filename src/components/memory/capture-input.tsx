import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CaptureInput({
  onSubmit,
  disabled,
  autoFocus,
  placeholder = "Tell me something to remember…",
}: {
  onSubmit: (text: string) => Promise<void> | void;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  async function submit() {
    const text = value.trim();
    if (!text || busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(text);
      setValue("");
      ref.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-2 shadow-sm focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20">
      <textarea
        ref={ref}
        rows={2}
        value={value}
        disabled={disabled || busy}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        className={cn(
          "w-full resize-none bg-transparent px-3 py-2 text-[17px] leading-relaxed text-fg placeholder:text-subtle outline-none",
          "min-h-[3.25rem] max-h-32",
        )}
        aria-label="Capture memory"
      />
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <p className="text-[11px] text-subtle">Enter to remember</p>
        <Button
          type="button"
          size="icon"
          variant="primary"
          disabled={!value.trim() || busy || disabled}
          onClick={() => void submit()}
          aria-label="Remember"
          className="rounded-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
