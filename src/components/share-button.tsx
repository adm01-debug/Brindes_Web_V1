import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) return;

    // Web Share API (mobile e navegadores modernos)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // Usuário cancelou — sem toast de erro
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // Fallback: copiar para clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={className}
      aria-label="Compartilhar"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copiado
        </>
      ) : typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          Compartilhar
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copiar link
        </>
      )}
    </Button>
  );
}
