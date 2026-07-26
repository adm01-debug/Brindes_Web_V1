import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna a URL pública ou assinada para exibir um arquivo do storage.
 * Como os buckets são privados nesse workspace, usa signed URL de longa duração.
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn = 60 * 60 * 24 * 7) {
  if (!path) return null;
  // Path pode vir já como URL completa (backward compat)
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Cache de URLs assinadas em memória (por aba).
 *
 * Sem ele, uma grade de 24 produtos dispara 24 chamadas `createSignedUrl` a
 * cada montagem — e repete tudo ao voltar para a listagem. O cache deduplica
 * requisições em voo (mesma Promise para o mesmo path) e reaproveita a URL
 * até uma margem de segurança antes do vencimento.
 */
const signedUrlCache = new Map<string, { url: string | null; expiresAt: number; inflight?: Promise<string | null> }>();

/** Margem antes do vencimento real para evitar servir URL prestes a expirar. */
const SIGNED_URL_SAFETY_MS = 60 * 60 * 1000; // 1h

export function getSignedUrlCached(
  bucket: string,
  path: string,
  expiresIn = 60 * 60 * 24 * 7,
): Promise<string | null> {
  if (!path) return Promise.resolve(null);
  if (path.startsWith("http")) return Promise.resolve(path);

  const key = `${bucket}:${path}:${expiresIn}`;
  const now = Date.now();
  const hit = signedUrlCache.get(key);
  if (hit) {
    if (hit.inflight) return hit.inflight;
    if (hit.expiresAt > now) return Promise.resolve(hit.url);
  }

  const inflight = getSignedUrl(bucket, path, expiresIn)
    .then((url) => {
      signedUrlCache.set(key, {
        url,
        // Falha (null) tem TTL curto para permitir nova tentativa logo.
        expiresAt: url ? now + expiresIn * 1000 - SIGNED_URL_SAFETY_MS : now + 30_000,
      });
      return url;
    })
    .catch(() => {
      signedUrlCache.delete(key);
      return null;
    });

  signedUrlCache.set(key, { url: null, expiresAt: 0, inflight });
  return inflight;
}



export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/**
 * Upload de arquivo. Path recomendado: `${companyId}/${filename}`.
 * Valida tamanho e MIME antes de enviar.
 */
export async function uploadFile(bucket: string, path: string, file: File) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Arquivo excede o limite de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    throw new Error("Formato não suportado. Use JPG, PNG, WebP, AVIF ou GIF.");
  }
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;
  return path;
}

export async function deleteFile(bucket: string, path: string) {
  if (!path || path.startsWith("http")) return;
  await supabase.storage.from(bucket).remove([path]);
}

export function formatBRL(value: number | null | undefined) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * URL estável e SSR-safe para uma imagem de storage.
 *
 * Diferente de `getSignedUrlCached`, é síncrona: pode ser usada direto no
 * `src` de uma <img> durante o SSR. O redirect assinado é resolvido pela rota
 * `/i/$` no servidor (ver src/routes/i.$.ts) e cacheado na borda.
 */
export function mediaUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  // Backward compat: registros antigos podem guardar a URL completa.
  if (path.startsWith("http")) return path;
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/i/${bucket}/${encoded}`;
}
