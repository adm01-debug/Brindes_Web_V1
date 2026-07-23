import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageSellerButtonProps {
  companyId: string;
  companyName: string;
  productId?: string;
  productName?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function MessageSellerButton({ companyId, companyName, productId, productName, variant = "outline", className }: MessageSellerButtonProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(productName ? `Sobre: ${productName}` : "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSend() {
    const trimmed = body.trim();
    if (trimmed.length < 2) {
      toast.error("Escreva sua mensagem.");
      return;
    }
    setBusy(true);
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      setBusy(false);
      setOpen(false);
      navigate({ to: "/auth", search: { next: window.location.pathname } as never });
      return;
    }
    const { data, error } = await supabase.rpc("start_conversation", {
      _company_id: companyId,
      _product_id: productId ?? null,
      _subject: subject,
      _body: trimmed,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar", { description: error.message });
      return;
    }
    toast.success("Mensagem enviada!");
    setOpen(false);
    setBody("");
    navigate({ to: "/painel/mensagens/$id", params: { id: String(data) } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Enviar mensagem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conversar com {companyName}</DialogTitle>
          <DialogDescription>
            {productName ? `Tire dúvidas sobre "${productName}" diretamente com o vendedor.` : "Envie sua dúvida diretamente ao vendedor."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="msg-subject">Assunto (opcional)</Label>
            <Input id="msg-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="msg-body">Mensagem</Label>
            <Textarea id="msg-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} placeholder="Olá! Gostaria de saber mais sobre..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSend} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
