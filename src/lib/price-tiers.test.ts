import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_TIERS,
  lowestTierPrice,
  highestTierPrice,
  normalizeTiers,
  tierDiscountPct,
  tierForQuantity,
  tierRangeLabel,
  validateTiers,
  type PriceTier,
} from "@/lib/price-tiers";

const tiers: PriceTier[] = [
  { min_qty: 50, max_qty: 99, unit_price: 20 },
  { min_qty: 100, max_qty: 499, unit_price: 15 },
  { min_qty: 500, max_qty: null, unit_price: 10 },
];

describe("normalizeTiers", () => {
  it("ignora entradas não-array e lixo estrutural", () => {
    expect(normalizeTiers(null)).toEqual([]);
    expect(normalizeTiers("x")).toEqual([]);
    expect(normalizeTiers([null, 3, "a"])).toEqual([]);
  });

  it("converte numéricos vindos como string do PostgREST", () => {
    const out = normalizeTiers([{ min_qty: "100", max_qty: "499", unit_price: "15.50" }]);
    expect(out).toEqual([{ id: undefined, min_qty: 100, max_qty: 499, unit_price: 15.5 }]);
  });

  it("descarta faixas inválidas (qty < 1, preço negativo, NaN)", () => {
    const out = normalizeTiers([
      { min_qty: 0, unit_price: 10 },
      { min_qty: 10, unit_price: -1 },
      { min_qty: "abc", unit_price: 10 },
      { min_qty: 10, unit_price: 10 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].min_qty).toBe(10);
  });

  it("ordena por quantidade inicial e trata max_qty nulo", () => {
    const out = normalizeTiers([
      { min_qty: 500, max_qty: null, unit_price: 10 },
      { min_qty: 50, max_qty: 99, unit_price: 20 },
    ]);
    expect(out.map((t) => t.min_qty)).toEqual([50, 500]);
    expect(out[1].max_qty).toBeNull();
  });
});

describe("preço aplicável", () => {
  it("retorna null abaixo do mínimo tabelado", () => {
    expect(tierForQuantity(tiers, 10)).toBeNull();
    expect(tierForQuantity(tiers, 0)).toBeNull();
    expect(tierForQuantity([], 100)).toBeNull();
  });

  it("resolve os limites exatos de cada faixa", () => {
    expect(tierForQuantity(tiers, 50)?.unit_price).toBe(20);
    expect(tierForQuantity(tiers, 99)?.unit_price).toBe(20);
    expect(tierForQuantity(tiers, 100)?.unit_price).toBe(15);
    expect(tierForQuantity(tiers, 499)?.unit_price).toBe(15);
    expect(tierForQuantity(tiers, 500)?.unit_price).toBe(10);
    expect(tierForQuantity(tiers, 1_000_000)?.unit_price).toBe(10);
  });

  it("trunca quantidades fracionárias", () => {
    expect(tierForQuantity(tiers, 100.9)?.unit_price).toBe(15);
  });

  it("expõe menor e maior preço para o AggregateOffer", () => {
    expect(lowestTierPrice(tiers)).toBe(10);
    expect(highestTierPrice(tiers)).toBe(20);
    expect(lowestTierPrice([])).toBeNull();
    expect(highestTierPrice([])).toBeNull();
  });
});

describe("rótulos e desconto", () => {
  it("formata intervalos em pt-BR", () => {
    expect(tierRangeLabel({ min_qty: 100, max_qty: 499, unit_price: 1 })).toBe("100 – 499 un.");
    expect(tierRangeLabel({ min_qty: 1000, max_qty: null, unit_price: 1 })).toMatch(/^1.000\+ un\.$/);
  });

  it("calcula desconto em relação à primeira faixa", () => {
    expect(tierDiscountPct(tiers, tiers[0])).toBe(0);
    expect(tierDiscountPct(tiers, tiers[1])).toBe(25);
    expect(tierDiscountPct(tiers, tiers[2])).toBe(50);
  });

  it("nunca devolve desconto negativo", () => {
    expect(tierDiscountPct(tiers, { min_qty: 900, max_qty: null, unit_price: 99 })).toBe(0);
  });
});

describe("validateTiers", () => {
  it("aceita uma tabela consistente", () => {
    expect(validateTiers(tiers)).toBeNull();
  });

  it("rejeita sobreposição de faixas", () => {
    const bad = [
      { min_qty: 100, max_qty: 500, unit_price: 15 },
      { min_qty: 400, max_qty: 900, unit_price: 12 },
    ];
    expect(validateTiers(bad)).toMatch(/sobrepor/);
  });

  it("permite apenas a última faixa aberta", () => {
    const bad = [
      { min_qty: 100, max_qty: null, unit_price: 15 },
      { min_qty: 500, max_qty: 900, unit_price: 12 },
    ];
    expect(validateTiers(bad)).toMatch(/última faixa/);
  });

  it("rejeita quantidade final menor ou igual à inicial", () => {
    expect(validateTiers([{ min_qty: 100, max_qty: 100, unit_price: 5 }])).toMatch(/maior que a inicial/);
  });

  it("respeita o teto de faixas do banco", () => {
    const many = Array.from({ length: MAX_PRICE_TIERS + 1 }, (_, i) => ({
      min_qty: (i + 1) * 100,
      max_qty: (i + 1) * 100 + 50,
      unit_price: 10,
    }));
    expect(validateTiers(many)).toMatch(/Máximo/);
  });
});
