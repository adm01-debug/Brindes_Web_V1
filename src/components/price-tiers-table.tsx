import { useMemo, useState } from "react";
import { Calculator, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/portal";
import {
  type PriceTier,
  tierDiscountPct,
  tierForQuantity,
  tierRangeLabel,
} from "@/lib/price-tiers";
import { cn } from "@/lib/utils";

export type PriceTiersTableProps = {
  tiers: PriceTier[];
  /** Pedido mínimo do produto — usado como quantidade inicial da calculadora. */
  minOrderQuantity?: number | null;
  className?: string;
};

export function PriceTiersTable({ tiers, minOrderQuantity, className }: PriceTiersTableProps) {
  const initialQty = String(minOrderQuantity ?? tiers[0]?.min_qty ?? 100);
  const [qtyInput, setQtyInput] = useState(initialQty);

  const qty = Number(qtyInput.replace(/\D/g, "")) || 0;
  const applied = useMemo(() => tierForQuantity(tiers, qty), [tiers, qty]);
  const total = applied ? applied.unit_price * qty : null;

  if (tiers.length === 0) return null;

  return (
    <Card className={cn("mt-4", className)}>
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <TrendingDown className="h-4 w-4 text-primary" aria-hidden />
          Quanto mais, mais barato
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preço unitário por faixa de quantidade. Valores de referência informados pelo fornecedor.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Faixas de preço por quantidade</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Quantidade</th>
                <th scope="col" className="py-2 pr-3 font-medium">Preço unitário</th>
                <th scope="col" className="py-2 font-medium">Economia</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => {
                const pct = tierDiscountPct(tiers, tier);
                const isApplied = applied != null && applied.min_qty === tier.min_qty;
                return (
                  <tr
                    key={tier.id ?? tier.min_qty}
                    className={cn("border-b last:border-0", isApplied && "bg-primary/5")}
                  >
                    <td className="py-2 pr-3 font-medium">{tierRangeLabel(tier)}</td>
                    <td className="py-2 pr-3 text-primary">{formatBRL(tier.unit_price)}</td>
                    <td className="py-2 text-muted-foreground">
                      {pct > 0 ? `-${pct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-lg border bg-muted/40 p-4">
          <Label
            htmlFor="tier-calc-qty"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Calculator className="h-4 w-4" aria-hidden />
            Simular quantidade
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Input
              id="tier-calc-qty"
              inputMode="numeric"
              className="w-32"
              value={qtyInput}
              maxLength={9}
              onChange={(e) => setQtyInput(e.target.value.replace(/\D/g, ""))}
              aria-describedby="tier-calc-result"
            />
            <p id="tier-calc-result" className="text-sm" aria-live="polite">
              {applied && total != null ? (
                <>
                  <span className="text-muted-foreground">Unitário </span>
                  <strong className="text-primary">{formatBRL(applied.unit_price)}</strong>
                  <span className="text-muted-foreground"> · Total estimado </span>
                  <strong>{formatBRL(total)}</strong>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Informe uma quantidade a partir de {tiers[0].min_qty.toLocaleString("pt-BR")} unidades.
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
