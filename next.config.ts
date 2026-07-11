import type { NextConfig } from "next";

const securityHeaders = [
  {
    // HSTS: 1 ano, subdomínios, elegível pra preload list
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    // CSP mínima e segura: só bloqueia embedding por terceiros.
    // CSP completa (script-src etc.) fica pra depois — Next inline scripts
    // + reCAPTCHA + HopZone exigem nonce/allowlist cuidadosa.
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Build worker pool dá OOM em Windows com pages dinâmicas e shared
    // chunks grandes (items/npcs metadata routes). 1 worker = mais lento
    // mas estável. Reverter pra default quando Next 17+ corrigir.
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
