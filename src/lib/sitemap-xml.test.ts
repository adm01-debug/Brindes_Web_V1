import { describe, expect, it } from "vitest";
import { SITEMAP_MAX_URLS, escapeXml, urlEntry, urlset } from "@/lib/sitemap-xml";

describe("escapeXml", () => {
  it("escapa os cinco caracteres reservados", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("escapa & antes das demais entidades (sem duplo escape)", () => {
    expect(escapeXml("a & <b>")).toBe("a &amp; &lt;b&gt;");
    expect(escapeXml("&amp;")).toBe("&amp;amp;");
  });

  it("preserva acentuação (UTF-8 é válido em XML)", () => {
    expect(escapeXml("Canecas Térmicas")).toBe("Canecas Térmicas");
  });
});

describe("urlEntry", () => {
  it("omite campos opcionais ausentes", () => {
    const xml = urlEntry("https://x.com/a");
    expect(xml).toContain("<loc>https://x.com/a</loc>");
    expect(xml).not.toContain("lastmod");
    expect(xml).not.toContain("changefreq");
    expect(xml).not.toContain("priority");
  });

  it("escapa query strings na loc", () => {
    expect(urlEntry("https://x.com/a?b=1&c=2")).toContain("b=1&amp;c=2");
  });

  it("inclui bloco extra (image sitemap) quando fornecido", () => {
    const xml = urlEntry("https://x.com/a", undefined, "weekly", "0.6", "    <image:image/>");
    expect(xml).toContain("<image:image/>");
    expect(xml.indexOf("<image:image/>")).toBeLessThan(xml.indexOf("</url>"));
  });
});

describe("urlset", () => {
  it("emite namespace de imagem apenas quando solicitado", () => {
    expect(urlset([])).not.toContain("sitemap-image");
    expect(urlset([], true)).toContain("sitemap-image/1.1");
  });

  it("é um documento válido mesmo vazio", () => {
    const xml = urlset([]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("nunca ultrapassa o teto do protocolo", () => {
    const entries = Array.from({ length: SITEMAP_MAX_URLS + 10 }, (_, i) => `<url>${i}</url>`);
    const xml = urlset(entries);
    expect(xml.split("<url>").length - 1).toBe(SITEMAP_MAX_URLS);
  });
});
