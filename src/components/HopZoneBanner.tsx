/**
 * Banner fixo de voto HopZone (canto inferior direito).
 * Server-id 107350 (l2.hopzone.net/site/vote/107350/1).
 * Usado nas telas públicas — não aparece no painel logado.
 */
export function HopZoneBanner() {
  return (
    <a
      href="https://l2.hopzone.net/site/vote/107350/1"
      target="_blank"
      rel="noopener noreferrer"
      title="L2.HOPZONE.NET — Lineage 2 Servers ranking"
      className="fixed bottom-0 right-0 z-[99] block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://l2.hopzone.net/assets/img/banners/vote_banners/banner_2.png"
        alt="Vote for L2 IMPURE"
        width={140}
        height={120}
        className="block border-0"
        style={{ width: 140, height: 120 }}
      />
    </a>
  );
}
