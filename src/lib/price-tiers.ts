/**
 * Faixas de preço por quantidade ("quanto mais, mais barato").
 *
 * Regra de negócio: cada faixa cobre um intervalo fechado [min_qty, max_qty].
 * `max_qty` nulo significa "desta quantidade em diante". O banco garante que
 * não existam faixas sobrepostas para o mesmo produto, mas o front nunca
 * confia nisso cegamente — ordenamos e validamos antes de usar.
 */

export type PriceTier = {
  id?: string;
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
};

/** Limite de faixas por produto — espelha a validação do banco. */
export const MAX_PRICE_TIERS = 8;

/** Normaliza (converte numéricos vindos como string) e ordena por quantidade. */
export function normalizeTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: PriceTier[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const min = Number(r.min_qty);
    const price = Number(r.unit_price);
    if (!Number.isFinite(min) || min < 1) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    const maxRaw = r.max_qty;
    const max = maxRaw == null ? null : Number(maxRaw);
    tiers.push({
      id: typeof r.id === "string" ? r.id : undefined,
      min_qty: Math.trunc(min),
      max_qty: max != null && Number.isFinite(max) ? Math.trunc(max) : null,
      unit_price: price,
    });
  }
  return tiers.sort((a, b) => a.min_qty - b.min_qty);
}

/** Menor preço unitário entre as faixas (base do rótulo "a partir de"). */
export function lowestTierPrice(tiers: PriceTier[]): number | null {
  if (tiers.length === 0) return null;
  return tiers.reduce((min, t) => (t.unit_price < min ? t.unit_price : min), tiers[0].unit_price);
}

/** Maior preço unitário entre as faixas (usado no AggregateOffer). */
export function highestTierPrice(tiers: PriceTier[]): number | null {
  if (tiers.length === 0) return null;
  return tiers.reduce((max, t) => (t.unit_price > max ? t.unit_price : max), tiers[0].unit_price);
}

/**
 * Faixa aplicável a uma quantidade. Quando a quantidade é menor que a primeira
 * faixa, retorna `null` (o comprador ainda não atingiu o mínimo tabelado).
 */
export function tierForQuantity(tiers: PriceTier[], qty: number): PriceTier | null {
  if (!Number.isFinite(qty) || qty <= 0 || tiers.length === 0) return null;
  const q = Math.trunc(qty);
  for (const t of tiers) {
    if (q >= t.min_qty && (t.max_qty == null || q <= t.max_qty)) return t;
  }
  return null;
}

/** Rótulo legível do intervalo, ex.: "100 – 499 un." ou "1.000+ un.". */
export function tierRangeLabel(tier: PriceTier): string {
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  return tier.max_qty == null
    ? `${fmt(tier.min_qty)}+ un.`
    : `${fmt(tier.min_qty)} – ${fmt(tier.max_qty)} un.`;
}

/** Desconto percentual da faixa em relação à primeira (maior) faixa. */
export function tierDiscountPct(tiers: PriceTier[], tier: PriceTier): number {
  const base = tiers[0]?.unit_price;
  if (!base || base <= 0 || tier.unit_price >= base) return 0;
  return Math.round(((base - tier.unit_price) / base) * 100);
}

/** Erros de consistência (sobreposição / ordem) em PT-BR, para o painel. */
export function validateTiers(tiers: PriceTier[]): string | null {
  if (tiers.length > MAX_PRICE_TIERS) {
    return `Máximo de ${MAX_PRICE_TIERS} faixas de preço por produto.`;
  }
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (!Number.isInteger(t.min_qty) || t.min_qty < 1) {
      return "A quantidade inicial de cada faixa deve ser um número inteiro maior ou igual a 1.";
    }
    if (t.max_qty != null && (!Number.isInteger(t.max_qty) || t.max_qty <= t.min_qty)) {
      return "A quantidade final deve ser maior que a inicial.";
    }
    if (!(t.unit_price >= 0)) {
      return "O preço unitário da faixa não pode ser negativo.";
    }
    if (t.max_qty == null && i < sorted.length - 1) {
      return "Apenas a última faixa pode ficar sem quantidade final.";
    }
    const next = sorted[i + 1];
    if (next && t.max_qty != null && next.min_qty <= t.max_qty) {
      return "As faixas não podem se sobrepor. Ajuste as quantidades.";
    }
  }
  return null;
}
