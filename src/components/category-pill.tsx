import { Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";

export function CategoryPill({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      to="/categoria/$slug"
      params={{ slug }}
      className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <Tag className="h-3.5 w-3.5" />
      {name}
    </Link>
  );
}
