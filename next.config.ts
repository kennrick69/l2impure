import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Build worker pool dá OOM em Windows com pages dinâmicas e shared
    // chunks grandes (items/npcs metadata routes). 1 worker = mais lento
    // mas estável. Reverter pra default quando Next 17+ corrigir.
    cpus: 1,
  },
};

export default nextConfig;
