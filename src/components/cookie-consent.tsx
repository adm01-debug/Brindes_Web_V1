import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "brindeshub-cookie-consent";
const VERSION = "1";

type Consent = "accepted" | "rejected";

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: string; c: Consent };
    if (parsed?.v !== VERSION) return null;
    return parsed.c ?? null;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: VERSION, c, at: new Date().toISOString() }),
    );
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer to next tick to avoid hydration mismatch
    const t = window.setTimeout(() => {
      if (readConsent() == null) setVisible(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const decide = (c: Consent) => {
    writeConsent(c);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-start gap-3 sm:flex-1">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
            <Cookie className="h-4 w-4" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">
            Utilizamos cookies estritamente necessários (autenticação e preferências como tema).
            Não usamos rastreamento publicitário. Saiba mais em{" "}
            <Link to="/privacidade" className="font-medium text-primary underline">
              Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => decide("rejected")}>
            Rejeitar opcionais
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Entendi
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar aviso"
            onClick={() => decide("rejected")}
            className="hidden sm:inline-flex"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
