import Link from "next/link";
import Image from "next/image";

/**
 * 404 global — mantém o jogador dentro do funil: volta pra home ou
 * cai no Discord (onde tem gente pra ajudar). Estilo inline no dark
 * canônico do site (#0a0a0f + dourado #d4a14a) pra não depender de
 * nenhum layout de route group.
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        background:
          "radial-gradient(ellipse at top, rgba(212,161,74,0.08) 0%, transparent 45%), #0a0a0f",
        color: "#e8e6e3",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Image
        src="/images/logo.png"
        alt="L2 Impure"
        width={140}
        height={124}
        style={{ opacity: 0.9 }}
      />
      <h1
        style={{
          fontSize: "clamp(3rem, 10vw, 6rem)",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "#d4a14a",
          lineHeight: 1,
          margin: 0,
        }}
      >
        404
      </h1>
      <p style={{ fontSize: "1.125rem", maxWidth: "28rem", margin: 0 }}>
        Essa página foi teleportada pra fora do mapa. O que você procura
        pode ter mudado de lugar — ou nunca existiu.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/"
          style={{
            padding: "0.75rem 1.75rem",
            background: "#d4a14a",
            color: "#0a0a0f",
            fontWeight: 700,
            borderRadius: "0.375rem",
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Voltar pra home
        </Link>
        <a
          href="https://discord.gg/pbGXNRuWVX"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.75rem 1.75rem",
            background: "transparent",
            color: "#d4a14a",
            fontWeight: 700,
            borderRadius: "0.375rem",
            border: "1px solid rgba(212,161,74,0.5)",
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Pedir ajuda no Discord
        </a>
      </div>
    </main>
  );
}
