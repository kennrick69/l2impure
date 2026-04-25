"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { GoldButton } from "@/components/ui/GoldButton";
import { useToast } from "@/components/ui/Toast";
import { EmailCheckAlert } from "@/components/ui/EmailCheckAlert";
import { useRecaptcha } from "@/hooks/useRecaptcha";

export function RegisterForm() {
  const { show } = useToast();
  const recaptcha = useRecaptcha();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? undefined;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
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
      const recaptchaToken = await recaptcha.execute("register");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          recaptchaToken,
          ...(ref ? { ref } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? "Falha no cadastro", "error");
        return;
      }
      setSubmittedEmail(email);
      setDone(true);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
          Quase lá
        </h1>
        <p className="mb-6 text-sm text-white/65">
          Enviamos um email de confirmação. Clique no link pra ativar sua
          conta.
        </p>
        <EmailCheckAlert email={submittedEmail} />
        <p className="mt-6 text-sm text-white/55">
          <Link
            href="/login"
            className="font-semibold text-[color:var(--l2-text-gold)] hover:underline"
          >
            Voltar pro login
          </Link>
        </p>
      </>
    );
  }

  const disabled =
    loading || (recaptcha.status !== "ready" && recaptcha.status !== "disabled");

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Criar Conta
      </h1>
      <p className="mb-8 text-sm text-white/55">
        Cadastro grátis. Você precisará confirmar seu email.
      </p>

      {ref && (
        <div className="mb-6 rounded-md border border-l2-gold/40 bg-l2-gold/10 px-4 py-3 text-sm text-l2-gold">
          Você foi indicado por um amigo. Quando atingir level 40, vocês
          dois ganham coins!
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
          minLength={8}
          autoComplete="new-password"
          hint="Mínimo 8 caracteres"
        />
        <Input
          name="confirm"
          type="password"
          label="Confirmar senha"
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <GoldButton type="submit" size="full" disabled={disabled}>
          {loading
            ? "Criando..."
            : recaptcha.status === "loading"
              ? "Carregando..."
              : "Criar conta"}
        </GoldButton>
      </form>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
        Protegido por reCAPTCHA.{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60"
        >
          Privacidade
        </a>{" "}
        &{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/60"
        >
          Termos
        </a>{" "}
        do Google.
      </p>

      <p className="mt-8 text-center text-sm text-white/55">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-[color:var(--l2-text-gold)] hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
