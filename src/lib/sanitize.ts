import DOMPurify from "isomorphic-dompurify";

const DEFAULT_TAGS = ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", "span"];
const DEFAULT_ATTRS = ["href", "target", "rel"];

export type SanitizeOptions = {
  tags?: string[];
  attrs?: string[];
};

/**
 * Sanitiza HTML removendo scripts, handlers de evento e tags perigosas.
 * Isomórfico (funciona SSR + browser). Sempre use antes de `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(input: string | null | undefined, opts: SanitizeOptions = {}): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: opts.tags ?? DEFAULT_TAGS,
    ALLOWED_ATTR: opts.attrs ?? DEFAULT_ATTRS,
    ALLOW_DATA_ATTR: false,
  });
}
