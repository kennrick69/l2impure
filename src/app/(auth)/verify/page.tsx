import Link from "next/link";

type SearchParams = { error?: string; token?: string };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const error = sp.error;

  if (error) {
    const msg =
      error === "missing"
        ? "Link inválido — token ausente."
        : "Token inválido ou já usado.";
    return (
      <>
        <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
          Falha na Verificação
        </h1>
        <p className="mb-6 text-sm text-white/65">{msg}</p>
        <p className="text-sm text-white/55">
          Se o link expirou, você pode pedir{" "}
          <Link
            href="/login"
            className="font-semibold text-[color:var(--l2-text-gold)] hover:underline"
          >
            um novo email
          </Link>{" "}
          após tentar entrar.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Confirme seu Email
      </h1>
      <p className="mb-4 text-sm text-white/65">
        Verifique sua caixa de entrada e clique no link que enviamos. Em alguns minutos.
      </p>
      <p className="text-sm text-white/45">
        Se você acabou de clicar no link e está vendo essa página, recarregue
        ou volte pra{" "}
        <Link
          href="/login"
          className="font-semibold text-[color:var(--l2-text-gold)] hover:underline"
        >
          tela de login
        </Link>
        .
      </p>
    </>
  );
}
