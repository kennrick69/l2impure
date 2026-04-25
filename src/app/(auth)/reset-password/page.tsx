"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { GoldButton } from "@/components/ui/GoldButton";
import { useToast } from "@/components/ui/Toast";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <>
        <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
          Link Inválido
        </h1>
        <p className="mb-6 text-sm text-white/65">
          Este link de reset não tem token. Solicite um novo.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-[color:var(--l2-text-gold)] hover:underline"
        >
          Pedir novo link
        </Link>
      </>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password !== confirm) {
      show("As senhas não coincidem", "error");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      show("A senha deve ter no mínimo 8 caracteres", "error");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }
      show("Senha redefinida! Faça login.", "success");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Nova Senha
      </h1>
      <p className="mb-8 text-sm text-white/55">
        Defina uma nova senha pra sua conta.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          name="password"
          type="password"
          label="Nova senha"
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete="new-password"
          hint="Mínimo 8 caracteres"
        />
        <Input
          name="confirm"
          type="password"
          label="Confirmar nova senha"
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <GoldButton type="submit" size="full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </GoldButton>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetForm />
    </Suspense>
  );
}
