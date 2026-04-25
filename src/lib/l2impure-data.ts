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
  tagline: "Servidor brasileiro de Lineage 2 Interlude",
  description:
    "Servidor Interlude x10 com Auto-Farm, Olympiad e Eventos 24/7.",
  copyright: "© 2026 L2 Impure. Este servidor não é afiliado à NCSoft.",
};

export const navItems: NavItem[] = [
  {
    label: "Sobre o Servidor",
    dropdown: [
      { label: "Interlude x10 [NOVO]", href: "#sobre-x10" },
      { label: "Rates e Features", href: "#features" },
    ],
  },
  {
    label: "Comunidade",
    dropdown: [
      { label: "Fórum", href: "#", external: true },
      { label: "Telegram", href: "#", external: true },
      { label: "Discord", href: "#", external: true },
      { label: "Instagram", href: "#", external: true },
      { label: "YouTube", href: "#", external: true },
    ],
  },
  { label: "Promoções", href: "#promocoes" },
  { label: "Doações", href: "/dashboard" },
];

export const languages: Language[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export const heroContent = {
  title: "INTERLUDE X10",
  subtitle: "EM BREVE",
  features: [
    "⚔️ BETA ABERTO — DATA A DEFINIR",
    "🔥 AUTO-FARM, OLYMPIAD, TORNEIOS 1V1",
  ],
  ctaTitle: "JOGAR DE GRAÇA",
  ctaSubtitle: "ARQUIVOS E REGISTRO",
};

export const serverCards: ServerCard[] = [
  {
    rate: "X10",
    name: "INTERLUDE (NOVO)",
    description: "Servidor brasileiro",
    status: "coming-soon",
    statusText: "EM BREVE",
    accent: "gold",
  },
  {
    rate: "DISCORD",
    name: "DISCORD",
    description: "Comunidade L2 Impure",
    status: "online",
    statusText: "ONLINE",
    accent: "discord",
    href: "#",
  },
];

export const newsItems: NewsItem[] = [
  {
    icon: "🔥",
    html: "<strong>L2IMPURE.COM</strong> – Servidor brasileiro de Lineage 2 Interlude x10 – Em Breve!",
  },
  {
    icon: "⚔️",
    html: "Beta aberto em breve — registre sua conta e fique pronto pro lançamento.",
  },
  { icon: "💎", html: "Auto-Farm integrado direto no cliente." },
  { icon: "🏆", html: "Olympiad clássica com torneios 1v1 semanais." },
  { icon: "🎮", html: "Eventos 24/7 — DeathMatch, TvT e CTF automáticos." },
  {
    icon: "😊",
    html: 'Confira as informações e <a href="#" class="underline text-[color:var(--l2-text-gold)]">junte-se à comunidade!</a>',
  },
];

export const featureCards: FeatureCard[] = [
  {
    icon: "⚔️",
    title: "Rates x10",
    description: "XP, SP, Drop e Adena x10. Spoil x10. Raids x5.",
    highlight: true,
  },
  {
    icon: "🤖",
    title: "Auto-Farm",
    description: "Sistema de farm automático integrado no cliente.",
  },
  {
    icon: "🏆",
    title: "Olympiad",
    description: "Torneios 1v1 semanais com prêmios in-game.",
  },
  {
    icon: "🎮",
    title: "Eventos 24/7",
    description: "DeathMatch, TvT, CTF e muito mais!",
  },
  {
    icon: "🔄",
    title: "Rebirth System",
    description: "Level 81 → Rebirth com +3 stats. Máximo 3x!",
  },
  {
    icon: "🇧🇷",
    title: "Comunidade BR",
    description: "Suporte em português, Discord ativo e staff brasileira.",
  },
];

export const statisticsServers: StatisticsServer[] = [
  {
    id: "x10-new",
    label: "INTERLUDE X10 (NOVO)",
    cards: [
      {
        title: "TOP-5 CLÃS",
        valueLabel: "Reputação",
        rows: [
          { rank: 1, name: "Freedom", value: 3475 },
          { rank: 2, name: "Syndicate", clanDot: "blue", value: 1350 },
          { rank: 3, name: "Warriors", value: 1250 },
          { rank: 4, name: "DEFAYUMOS", clanDot: "purple", value: 365 },
          { rank: 5, name: "PERECHIN", value: 230 },
        ],
      },
      {
        title: "TOP-5 PVP",
        valueLabel: "PVP",
        rows: [
          { rank: 1, name: "DenteL", clanDot: "blue", value: 145 },
          { rank: 2, name: "(*)", value: 137 },
          { rank: 3, name: "4EPTOBKA", value: 132 },
          { rank: 4, name: "KPAKEH", clanDot: "red", value: 119 },
          { rank: 5, name: "#host", clanDot: "purple", value: 118 },
        ],
      },
      {
        title: "TOP-5 PK",
        valueLabel: "PK",
        rows: [
          { rank: 1, name: "4EPTOBKA", value: 24 },
          { rank: 2, name: "#@cxz@#d", value: 21 },
          { rank: 3, name: "YavUZ", value: 21 },
          { rank: 4, name: "Hy6oTPAX", value: 16 },
          { rank: 5, name: "durable", value: 15 },
        ],
      },
    ],
  },
];

export const joinSection = {
  subtitle: "FAÇA PARTE",
  title: "DA L2 IMPURE",
  text: "Todos os dias, milhares de jogadores em todo o mundo jogam sua classe favorita do Lineage 2 no L2 Impure - sozinhos, em um grupo ou com um clã. Junte-se a eles para obter uma tonelada de emoções do jogo.",
  cta: "COMECE A JOGAR",
};

export const footerColumns: FooterColumn[] = [
  {
    heading: "Servidor",
    links: [
      { label: "Sobre", href: "#" },
      { label: "Download", href: "#" },
      { label: "Regras", href: "#" },
    ],
  },
  {
    heading: "Comunidade",
    links: [
      { label: "Discord", href: "#" },
      { label: "Fórum", href: "#" },
      { label: "Instagram", href: "#" },
    ],
  },
  {
    heading: "Suporte",
    links: [
      { label: "FAQ", href: "#" },
      { label: "Contato", href: "#" },
      { label: "Tickets", href: "#" },
    ],
  },
];

export const footerLegal = [
  { label: "Termos de Serviço", href: "#" },
  { label: "Política de Privacidade", href: "#" },
];

export const downloadBlocks: DownloadBlock[] = [
  {
    title: "ATUALIZADOR",
    subtitle: "AUTO-BAIXAR",
    links: [
      { label: "DO SITE", href: "#", icon: "📁" },
      { label: "DE GOOGLE", href: "#", icon: "☁️" },
      { label: "DE MEGA", href: "#", icon: "📦" },
    ],
  },
  {
    title: "CLIENTE",
    subtitle: "CLIENTE + PATCH",
    links: [
      { label: "DO SITE", href: "#", icon: "📁" },
      { label: "DE GOOGLE", href: "#", icon: "☁️" },
      { label: "DE MEGA", href: "#", icon: "📦" },
    ],
  },
  {
    title: "PATCH",
    subtitle: "MOVER PARA CLIENTE",
    links: [
      { label: "DO SITE", href: "#", icon: "📁" },
      { label: "DE GOOGLE", href: "#", icon: "☁️" },
      { label: "DE MEGA", href: "#", icon: "📦" },
    ],
  },
];
