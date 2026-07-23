import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompanyPlan = "free" | "pro" | "premium";

export function isFeatured(plan: CompanyPlan | null | undefined, featuredUntil?: string | null) {
  if (!plan || plan === "free") return false;
  if (!featuredUntil) return true;
  return new Date(featuredUntil).getTime() > Date.now();
}

export function PlanBadge({
  plan,
  featuredUntil,
  className,
}: {
  plan: CompanyPlan | null | undefined;
  featuredUntil?: string | null;
  className?: string;
}) {
  if (!isFeatured(plan, featuredUntil)) return null;
  const isPremium = plan === "premium";
  return (
    <Badge
      className={cn(
        "gap-1 border-none shadow-sm",
        isPremium
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-500 hover:to-orange-500"
          : "bg-primary/90 text-primary-foreground",
        className,
      )}
    >
      {isPremium ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      {isPremium ? "Premium" : "Destaque"}
    </Badge>
  );
}
