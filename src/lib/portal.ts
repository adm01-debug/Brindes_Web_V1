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
