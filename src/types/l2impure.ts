export type NavDropdownItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type NavItem = {
  label: string;
  href?: string;
  dropdown?: NavDropdownItem[];
  external?: boolean;
};

export type Language = {
  code: "pt" | "en" | "es";
  label: string;
};

export type ServerCard = {
  rate: string;
  name: string;
  description: string;
  status: "coming-soon" | "online" | "offline";
  statusText: string;
  accent?: "gold" | "discord";
  href?: string;
};

export type NewsItem = {
  icon: string;
  html: string;
};

export type FeatureCard = {
  icon: string;
  title: string;
  description: string;
  highlight?: boolean;
};

export type TopRow = {
  rank: number;
  name: string;
  clanDot?: "blue" | "purple" | "red" | "gold";
  value: number | string;
};

export type TopCard = {
  title: string;
  valueLabel: string;
  rows: TopRow[];
};

export type StatisticsServer = {
  id: string;
  label: string;
  cards: TopCard[];
};

export type FooterColumn = {
  heading: string;
  links: { label: string; href: string }[];
};

export type DownloadBlock = {
  title: string;
  subtitle: string;
  links: { label: string; href: string; icon: string }[];
};
