import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package2, Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  next: z.string().startsWith("/").max(500).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar sua empresa — BrindesHub" },
      {
        name: "description",
        content: "Acesse o painel da sua empresa ou cadastre-se gratuitamente no BrindesHub.",
      },
    ],
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: (search.next as "/painel") ?? "/painel" });
  },
  component: AuthPage,
});

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo de 8 caracteres").max(72);

type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
  hints: string[];
};

function evaluatePasswordStrength(pwd: string): PasswordStrength {
  const hints: string[] = [];
  let raw = 0;
  if (pwd.length >= 8) raw++; else hints.push("pelo menos 8 caracteres");
  if (pwd.length >= 12) raw++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) raw++; else hints.push("letras maiúsculas e minúsculas");
  if (/\d/.test(pwd)) raw++; else hints.push("um número");
  if (/[^A-Za-z0-9]/.test(pwd)) raw++; else hints.push("um símbolo");
  const score = Math.min(raw, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  return { score, label: labels[score], colorClass: colors[score], hints };
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("pwned") || m.includes("compromised") || m.includes("leaked") || m.includes("haveibeenpwned"))
    return "Esta senha apareceu em vazamentos públicos conhecidos. Escolha uma senha diferente e exclusiva.";
  if (m.includes("weak") || m.includes("password should")) return "Senha muito fraca. Combine letras, números e símbolos.";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("user already")) return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  return message;
}

function AuthPage() {
  const { mode, next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const goNext = () => navigate({ to: (next as "/painel") ?? "/painel" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const strength = evaluatePasswordStrength(signupPassword);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(form.get("email"));
    const password = passwordSchema.safeParse(form.get("password"));
    if (!email.success) return toast.error(email.error.issues[0].message);
    if (!password.success) return toast.error(password.error.issues[0].message);

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Bem-vindo!");
    goNext();
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const companyName = String(form.get("company_name") ?? "").trim();
    if (companyName.length < 2) return toast.error("Informe o nome da empresa");
    const email = emailSchema.safeParse(form.get("email"));
    const password = passwordSchema.safeParse(form.get("password"));
    if (!email.success) return toast.error(email.error.issues[0].message);
    if (!password.success) return toast.error(password.error.issues[0].message);

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { company_name: companyName },
      },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Cadastro criado! Você já está no ar.");
    goNext();
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error("Falha no login com Google");
      return;
    }
    if (result.redirected) return;
    goNext();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package2 className="h-5 w-5" />
          </div>
          <span className="text-xl tracking-tight">BrindesHub</span>
        </Link>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
            <CardDescription>
              Entre ou cadastre sua empresa de brindes gratuitamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={mode === "signup" ? "signup" : "signin"}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="mr-2 h-4 w-4" />
                  )}
                  Continuar com Google
                </Button>
                <Separator label="ou com e-mail" />
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="signin-email">E-mail</Label>
                    <Input id="signin-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input id="signin-password" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="mr-2 h-4 w-4" />
                  )}
                  Cadastrar com Google
                </Button>
                <Separator label="ou preencha abaixo" />
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="signup-company">Nome da empresa</Label>
                    <Input id="signup-company" name="company_name" required maxLength={120} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={8}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                    {signupPassword.length > 0 ? (
                      <div className="space-y-1 pt-1" aria-live="polite">
                        <div className="flex gap-1" aria-hidden="true">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i < strength.score ? strength.colorClass : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{strength.label}</span>
                          {strength.hints.length > 0 && ` — adicione ${strength.hints.slice(0, 2).join(" e ")}`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 8 caracteres. Evite senhas reutilizadas em outros sites.
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}

function Separator({ label }: { label: string }) {
  return (
    <div className="relative flex items-center">
      <div className="flex-grow border-t" />
      <span className="mx-3 flex-shrink text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex-grow border-t" />
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
