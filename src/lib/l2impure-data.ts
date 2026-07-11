import type {
  DownloadBlock,
  FeatureCard,
  FooterColumn,
  Language,
  NavItem,
  NewsItem,
  ServerCard,
  StatisticsServer,
} from "@/types/l2impure";

export const siteConfig = {
  name: "L2 Impure",
  tagline:
    "O único servidor de Lineage 2 do mundo com Sistema de Híbridos — Interlude x10, brasileiro, sem pay-to-win",
  description:
    "O único Lineage 2 do mundo onde você funde 2 classes em 1 personagem. Interlude x10 BR com Auto-Farm justo, Olympiad Dupla e eventos 24/7.",
  copyright: "© 2026 L2 Impure. Este servidor não é afiliado à NCSoft.",
  discordUrl: "https://discord.gg/pbGXNRuWVX",
};

export const navItems: NavItem[] = [
  {
    label: "Sobre o Servidor",
    dropdown: [
      { label: "Sistema de Híbridos [ÚNICO]", href: "/hibridos" },
      { label: "Rates e Features", href: "/#features" },
      { label: "Roadmap até o Launch", href: "/roadmap" },
      { label: "Regras", href: "/regras" },
      { label: "Sobre / Manifesto", href: "/sobre" },
    ],
  },
  {
    label: "Comunidade",
    dropdown: [
      {
        label: "Discord",
        href: "https://discord.gg/pbGXNRuWVX",
        external: true,
      },
      { label: "FAQ", href: "/faq" },
      { label: "Suporte", href: "/support" },
    ],
  },
  { label: "Híbridos", href: "/hibridos" },
  { label: "Download", href: "/download" },
  { label: "Doações", href: "/dashboard" },
];

export const languages: Language[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export const heroContent = {
  title: "INTERLUDE X10",
  subtitle: "SISTEMA DE HÍBRIDOS",
  features: [
    "🧬 FUNDA 2 CLASSES EM 1 PERSONAGEM — ÚNICO NO MUNDO",
    "⚔️ LANÇAMENTO: OUTUBRO DE 2026 · PRÉ-REGISTRO ABERTO",
    "🔥 AUTO-FARM JUSTO · OLYMPIAD DUPLA · SEM PAY-TO-WIN",
  ],
  ctaTitle: "JOGAR DE GRAÇA",
  ctaSubtitle: "GARANTA O TÍTULO DE FUNDADOR",
};

export const serverCards: ServerCard[] = [
  {
    rate: "X10",
    name: "INTERLUDE (NOVO)",
    description: "Servidor brasileiro",
    status: "coming-soon",
    statusText: "OUTUBRO 2026",
    accent: "gold",
    href: "/roadmap",
  },
  {
    rate: "DISCORD",
    name: "DISCORD",
    description: "Comunidade L2 Impure",
    status: "online",
    statusText: "ONLINE",
    accent: "discord",
    href: "https://discord.gg/pbGXNRuWVX",
  },
];

export const newsItems: NewsItem[] = [
  {
    icon: "🧬",
    html: '<strong>SISTEMA DE HÍBRIDOS</strong> — o único L2 do mundo onde você funde 2 classes em 1 personagem. <a href="/hibridos" class="underline text-[color:var(--l2-text-gold)]">Entenda como funciona</a>.',
  },
  {
    icon: "🏅",
    html: "<strong>FUNDADORES:</strong> toda conta criada antes do launch ganha título permanente exclusivo. Nunca mais disponível depois.",
  },
  {
    icon: "⚔️",
    html: 'Lançamento previsto pra <strong>outubro de 2026</strong> — acompanhe o <a href="/roadmap" class="underline text-[color:var(--l2-text-gold)]">roadmap público</a>.',
  },
  { icon: "💎", html: "Auto-Farm integrado no cliente — farm justo e igual pra todos, de graça." },
  { icon: "🏆", html: "Olympiad Dupla: competição Normal e Híbrida separadas." },
  {
    icon: "🦄",
    html: 'Confira as informações e <a href="https://discord.gg/pbGXNRuWVX" target="_blank" rel="noopener noreferrer" class="underline text-[color:var(--l2-text-gold)]">junte-se à comunidade no Discord!</a>',
  },
];

export const featureCards: FeatureCard[] = [
  {
    icon: "🧬",
    title: "Sistema de Híbridos",
    description:
      "Combine 2 personagens level 78 num Híbrido com as skills das duas classes. Único no mundo — e o primeiro Híbrido é grátis.",
    highlight: true,
  },
  {
    icon: "⚔️",
    title: "Rates x10",
    description: "XP, SP, Drop e Adena x10. Spoil x10. Raids x5.",
  },
  {
    icon: "🤖",
    title: "Auto-Farm Justo",
    description:
      "Farm automático integrado no cliente, grátis pra todos. Aqui ninguém precisa de bot — e bot de verdade é ban permanente.",
  },
  {
    icon: "🏆",
    title: "Olympiad Dupla",
    description:
      "Duas Olympiads separadas: a Normal (classes clássicas) e a Híbrida. Torneios 1v1 semanais com prêmios in-game.",
  },
  {
    icon: "🎮",
    title: "Eventos 24/7 + Rebirth",
    description:
      "DeathMatch, TvT e CTF automáticos. No endgame, Rebirth no level 81 com +3 stats (máximo 3x).",
  },
  {
    icon: "🇧🇷",
    title: "BR de verdade, sem P2W",
    description:
      "Ping ~30ms, staff brasileira presente e loja só de cosméticos. Poder aqui não se compra — se conquista.",
  },
];

// Pré-launch: rows vazias fazem o StatisticsSection renderizar o estado
// "seja o primeiro nome aqui". Após o launch, plugar nos rankings reais
// da bridge (GET /rankings/pvp|pk|clans).
export const statisticsServers: StatisticsServer[] = [
  {
    id: "x10-new",
    label: "INTERLUDE X10 (NOVO)",
    cards: [
      { title: "TOP-5 CLÃS", valueLabel: "Reputação", rows: [] },
      { title: "TOP-5 PVP", valueLabel: "PVP", rows: [] },
      { title: "TOP-5 PK", valueLabel: "PK", rows: [] },
    ],
  },
];

export const joinSection = {
  subtitle: "SEJA FUNDADOR",
  title: "DA L2 IMPURE",
  text: "O servidor abre em outubro — e quem chegar antes entra pra história. Toda conta criada antes do launch ganha o título permanente de Fundador, exclusivo e nunca mais disponível. Crie sua conta, entre no Discord e garanta seu lugar no dia 1.",
  cta: "CRIAR CONTA GRÁTIS",
};

export const footerColumns: FooterColumn[] = [
  {
    heading: "Servidor",
    links: [
      { label: "Sobre / Manifesto", href: "/sobre" },
      { label: "Sistema de Híbridos", href: "/hibridos" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "Download", href: "/download" },
      { label: "Regras", href: "/regras" },
    ],
  },
  {
    heading: "Comunidade",
    links: [
      { label: "Discord", href: "https://discord.gg/pbGXNRuWVX" },
      { label: "Criar conta", href: "/register" },
      { label: "Rankings", href: "/rankings" },
    ],
  },
  {
    heading: "Suporte",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contato", href: "mailto:admin@l2impure.com" },
      { label: "Tickets (Discord)", href: "https://discord.gg/pbGXNRuWVX" },
    ],
  },
];

export const footerLegal = [
  { label: "Termos de Serviço", href: "/termos" },
  { label: "Política de Privacidade", href: "/privacidade" },
];

// Client ainda não hospedado — todos os blocos levam pra página /download,
// que explica o status e captura o registro. Quando os mirrors existirem,
// voltar a apontar os links diretos aqui.
export const downloadBlocks: DownloadBlock[] = [
  {
    title: "CLIENTE",
    subtitle: "DISPONÍVEL NO BETA",
    links: [{ label: "VER PÁGINA DE DOWNLOAD", href: "/download", icon: "📁" }],
  },
  {
    title: "PATCH",
    subtitle: "DISPONÍVEL NO BETA",
    links: [{ label: "VER PÁGINA DE DOWNLOAD", href: "/download", icon: "📦" }],
  },
  {
    title: "SEJA AVISADO",
    subtitle: "REGISTRE-SE GRÁTIS",
    links: [
      { label: "CRIAR CONTA", href: "/register", icon: "🏅" },
      { label: "ENTRAR NO DISCORD", href: "https://discord.gg/pbGXNRuWVX", icon: "🦄" },
    ],
  },
];
