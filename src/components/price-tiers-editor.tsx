import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_PRICE_TIERS, validateTiers, type PriceTier } from "@/lib/price-tiers";

/**
 * Linha em edição: mantemos strings para não brigar com input parcialmente
 * digitado ("1", "10", "100"). A conversão para número acontece no submit.
 */
export type PriceTierDraft = {
  key: string;
  min_qty: string;
  max_qty: string;
  unit_price: string;
};

export function newTierDraft(): PriceTierDraft {
  return { key: crypto.randomUUID(), min_qty: "", max_qty: "", unit_price: "" };
}

export function draftsToTiers(drafts: PriceTierDraft[]): PriceTier[] {
  return drafts
    .filter((d) => d.min_qty.trim() !== "" || d.unit_price.trim() !== "")
    .map((d) => ({
      min_qty: Number(d.min_qty.replace(/\D/g, "")),
      max_qty: d.max_qty.trim() === "" ? null : Number(d.max_qty.replace(/\D/g, "")),
      unit_price: Number(d.unit_price.replace(",", ".").trim()),
    }));
}

export function PriceTiersEditor({
  drafts,
  onChange,
}: {
  drafts: PriceTierDraft[];
  onChange: (next: PriceTierDraft[]) => void;
}) {
  const tiers = draftsToTiers(drafts);
  const structuralError = tiers.length > 0 ? validateTiers(tiers) : null;

  // Aviso (não bloqueia): preço deveria cair conforme a quantidade sobe.
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const notDecreasing = sorted.some((t, i) => i > 0 && t.unit_price > sorted[i - 1].unit_price);

  const update = (key: string, patch: Partial<PriceTierDraft>) =>
    onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Faixas de preço por quantidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Opcional. Mostre ao comprador que o preço unitário cai conforme a quantidade sobe.
          Deixe a quantidade final vazia na última faixa para indicar &quot;acima de&quot;.
          Máximo de {MAX_PRICE_TIERS} faixas.
        </p>

        {drafts.length > 0 && (
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <div key={d.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <div className="space-y-1.5">
                  {i === 0 && <Label htmlFor={`tier-min-${d.key}`} className="text-xs">De (un.)</Label>}
                  <Input
                    id={`tier-min-${d.key}`}
                    inputMode="numeric"
                    placeholder="100"
                    value={d.min_qty}
                    onChange={(e) => update(d.key, { min_qty: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div className="space-y-1.5">
                  {i === 0 && <Label htmlFor={`tier-max-${d.key}`} className="text-xs">Até (un.)</Label>}
                  <Input
                    id={`tier-max-${d.key}`}
                    inputMode="numeric"
                    placeholder="499"
                    value={d.max_qty}
                    onChange={(e) => update(d.key, { max_qty: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div className="space-y-1.5">
                  {i === 0 && <Label htmlFor={`tier-price-${d.key}`} className="text-xs">Preço un. (R$)</Label>}
                  <Input
                    id={`tier-price-${d.key}`}
                    inputMode="decimal"
                    placeholder="12.90"
                    value={d.unit_price}
                    onChange={(e) => update(d.key, { unit_price: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover faixa ${i + 1}`}
                  onClick={() => onChange(drafts.filter((x) => x.key !== d.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {structuralError && <p className="text-xs text-destructive">{structuralError}</p>}
        {!structuralError && notDecreasing && (
          <p className="text-xs text-muted-foreground">
            Atenção: o preço unitário não está diminuindo conforme a quantidade aumenta. Isso é permitido, mas incomum.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={drafts.length >= MAX_PRICE_TIERS}
          onClick={() => onChange([...drafts, newTierDraft()])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar faixa
        </Button>
      </CardContent>
    </Card>
  );
}
