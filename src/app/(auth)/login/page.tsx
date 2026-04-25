"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { GoldButton } from "@/components/ui/GoldButton";
import { useToast } from "@/components/ui/Toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const verified = params.get("verified");
  const reset = params.get("reset");
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? "Falha no login", "error");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Entrar
      </h1>
      <p className="mb-8 text-sm text-white/55">
        Acesse sua conta L2 Impure.
      </p>

      {verified && (
        <div className="mb-6 rounded-md border border-[color:var(--l2-green)]/40 bg-[color:var(--l2-green)]/10 px-4 py-3 text-sm text-[color:var(--l2-green)]">
          Email confirmado com sucesso! Faça login pra continuar.
        </div>
      )}

      {reset && (
        <div className="mb-6 rounded-md border border-[color:var(--l2-green)]/40 bg-[color:var(--l2-green)]/10 px-4 py-3 text-sm text-[color:var(--l2-green)]">
          Senha redefinida! Entre com a nova senha.
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-white/55 transition hover:text-[color:var(--l2-text-gold)]"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <GoldButton type="submit" size="full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </GoldButton>
      </form>

      <p className="mt-8 text-center text-sm text-white/55">
        Ainda não tem conta?{" "}
        <Link
          href="/register"
          className="font-semibold text-[color:var(--l2-text-gold)] hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginForm />
    </Suspense>
  );
}
