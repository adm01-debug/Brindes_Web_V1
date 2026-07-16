/**
 * Mapeia códigos de erro do Postgres/Supabase para mensagens amigáveis em PT-BR.
 * Códigos referenciados vêm dos triggers/RPCs de segurança do banco.
 */
export function pgErrorMessage(err: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (!err) return fallback;
  const e = err as { code?: string; message?: string; details?: string };
  const code = e.code ?? "";
  const msg = e.message ?? "";

  // Rate-limit e validação (RAISE EXCEPTION USING ERRCODE = '22023')
  if (code === "22023") {
    if (/limite/i.test(msg)) return msg;
    return "Requisição inválida. Verifique os dados enviados.";
  }
  // Acesso negado
  if (code === "42501") return "Acesso negado. Você não tem permissão para esta ação.";
  // Violação de unicidade
  if (code === "23505") return "Já existe um registro com esses dados.";
  // Violação de FK
  if (code === "23503") return "Referência inválida. O registro relacionado não existe.";
  // Violação de NOT NULL
  if (code === "23502") return "Campo obrigatório ausente.";
  // Violação de CHECK
  if (code === "23514") return "Valor não atende às regras de validação.";
  // RLS
  if (/row-level security/i.test(msg)) return "Você não tem permissão para acessar este recurso.";

  return msg || fallback;
}
