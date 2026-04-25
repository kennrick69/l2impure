"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { GoldButton } from "@/components/ui/GoldButton";
import { useToast } from "@/components/ui/Toast";
import { EmailCheckAlert } from "@/components/ui/EmailCheckAlert";
import { useRecaptcha } from "@/hooks/useRecaptcha";

export default function ForgotPasswordPage() {
  const { show } = useToast();
  const recaptcha = useRecaptcha();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    try {
      const recaptchaToken = await recaptcha.execute("forgot");
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          recaptchaToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
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
          Email Enviado
        </h1>
        <p className="mb-6 text-sm text-white/65">
          Se este email existe na nossa base, você receberá um link em alguns
          minutos.
        </p>
        <EmailCheckAlert email={submittedEmail} />
        <p className="mt-6 text-sm">
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

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Esqueci a Senha
      </h1>
      <p className="mb-8 text-sm text-white/55">
        Digite seu email e enviaremos um link pra redefinir a senha.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />
        <GoldButton
          type="submit"
          size="full"
          disabled={
            loading ||
            (recaptcha.status !== "ready" && recaptcha.status !== "disabled")
          }
        >
          {loading
            ? "Enviando..."
            : recaptcha.status === "loading"
              ? "Carregando..."
              : "Enviar link"}
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
        Lembrou da senha?{" "}
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
