import { useRouter } from "@tanstack/react-router";
import { Bell, Check, MessageSquare, Sparkles, Star, Trash2, Package, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications, type NotificationKind } from "@/hooks/use-notifications";

const ICONS: Record<NotificationKind, typeof Bell> = {
  lead: Package,
  question: MessageSquare,
  answer: Sparkles,
  review: Star,
  system: Info,
};

export function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3" /> Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = ICONS[n.kind] ?? Bell;
                const unread = !n.read_at;
                const content = (
                  <div className="flex gap-3 px-3 py-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        unread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium text-muted-foreground")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remover notificação"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void remove(n.id);
                      }}
                      className="self-start rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
                return (
                  <li key={n.id} className="group">
                    {n.url ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (unread) void markRead(n.id);
                          router.navigate({ to: n.url! });
                        }}
                        className={cn("block w-full text-left hover:bg-muted/50", unread && "bg-primary/[0.03]")}
                      >
                        {content}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => unread && void markRead(n.id)}
                        className={cn("block w-full text-left hover:bg-muted/50", unread && "bg-primary/[0.03]")}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
