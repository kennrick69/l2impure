type Props = {
  icon: string;
  title: string;
  description: string;
};

export function Placeholder({ icon, title, description }: Props) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-12 text-center">
      <div className="mb-4 text-5xl opacity-40">{icon}</div>
      <h2 className="mb-2 font-display text-xl font-bold uppercase tracking-wider text-white">
        {title}
      </h2>
      <p className="mx-auto max-w-md text-sm text-white/55">{description}</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--l2-border-gold)]/40 px-4 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-[color:var(--l2-text-gold)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--l2-text-gold)]" />
        Em construção
      </div>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-white/55">{subtitle}</p>
      )}
    </div>
  );
}
