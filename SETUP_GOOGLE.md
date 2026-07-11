# Google Search Console + GA4 — setup de 15 minutos

> Bloqueado por login Google (só você tem a conta). O site já está
> pronto do lado técnico: sitemap.xml, robots.txt, meta tags e JSON-LD
> no ar. Falta só registrar nas ferramentas.

## 1. Google Search Console (~5 min) — fazer primeiro

1. https://search.google.com/search-console → **Adicionar propriedade**
   → tipo **Domínio** → `l2impure.com`.
2. Verificação por DNS: o GSC dá um registro TXT → colar no Cloudflare
   (DNS → Add record → TXT, nome `@`) → voltar e clicar Verificar
   (propaga em ~1 min).
3. Depois de verificado: **Sitemaps** (menu lateral) → adicionar
   `https://l2impure.com/sitemap.xml` → Enviar.
4. Pronto. Em 2-7 dias as páginas começam a aparecer em
   Indexação → Páginas. Nada mais a fazer.

**Por que agora:** indexação leva semanas; registrando em julho, quando
alguém buscar "L2 Interlude x10 híbridos" em setembro o site já rankeia.

## 2. Google Analytics 4 (~10 min)

1. https://analytics.google.com → Admin → **Criar propriedade**
   → nome `L2 Impure`, fuso `(GMT-03:00) São Paulo`, moeda BRL.
2. Fluxo de dados → **Web** → `https://l2impure.com` → criar.
3. Copiar o **ID da métrica** (formato `G-XXXXXXXXXX`).
4. No Railway → serviço do site → Variables → adicionar:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
5. Avisar a squad (ou abrir issue): "GA_ID no ar, plugar o snippet".
   O snippet é 10 linhas no `src/app/layout.tsx` (Script strategy
   afterInteractive) — a squad faz em 15 min com a env já presente.
   *(Não foi pré-plugado de propósito: snippet com ID vazio suja o
   console e o CSP sem necessidade.)*

## 3. Vincular GSC ↔ GA4 (1 min, opcional)

GA4 Admin → Vinculações do produto → Search Console → vincular à
propriedade do passo 1. Junta dado de busca com comportamento no site.

## O que NÃO precisa fazer

- Google Tag Manager: overkill pra um site de servidor de jogo.
- Google Ads: só se decidir pagar tráfego (o plano diz nano-influencer BR
  primeiro — mais barato e mais qualificado).
