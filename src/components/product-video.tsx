import { ExternalLink, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Converte uma URL pública de vídeo em uma URL de embed segura.
 * Retorna `null` quando o provedor não é reconhecido — nunca fazemos embed
 * de host arbitrário (evita iframe de origem não confiável / XSS via srcdoc).
 */
export function toEmbedUrl(raw: string): { kind: "youtube" | "vimeo"; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube: watch?v=ID | youtu.be/ID | /embed/ID | /shorts/ID
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = parsed.searchParams.get("v");
    const pathId = parsed.pathname.match(/^\/(?:embed|shorts|v)\/([\w-]{6,})/)?.[1];
    const id = v && /^[\w-]{6,}$/.test(v) ? v : pathId;
    if (id) return { kind: "youtube", url: `https://www.youtube-nocookie.com/embed/${id}` };
    return null;
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).match(/^[\w-]{6,}$/)?.[0];
    if (id) return { kind: "youtube", url: `https://www.youtube-nocookie.com/embed/${id}` };
    return null;
  }

  // Vimeo: vimeo.com/ID
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname.match(/(\d{6,})/)?.[1];
    if (id) return { kind: "vimeo", url: `https://player.vimeo.com/video/${id}` };
    return null;
  }

  return null;
}

export function ProductVideo({ url, title }: { url: string | null | undefined; title: string }) {
  if (!url) return null;
  const embed = toEmbedUrl(url);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <PlayCircle className="h-4 w-4 text-primary" aria-hidden />
          Vídeo do produto
        </h2>
        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <iframe
              src={embed.url}
              title={`Vídeo de ${title}`}
              loading="lazy"
              className="h-full w-full border-0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Assistir ao vídeo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
