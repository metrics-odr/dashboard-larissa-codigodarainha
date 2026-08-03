# Larissa Topper — Dashboard de Controle de Tráfego Pago (VSL/Tráfego Direto)

> Este repositório é um **template**. Antes de usar, siga o **CHECKLIST DE NOVO
> CLIENTE** no topo do `CLAUDE.md`.

Dashboard de BI estática (HTML/CSS/JS + Chart.js) publicada no **GitHub Pages**,
atualizada a cada ~30 min (GitHub Actions + cron-job.org), **somente leitura** das
planilhas. Funil **VSL / tráfego direto** cruzando **Meta Ads × Compradores**.

## Como funciona (resumo)

1. `build/build.py` lê 2 abas da planilha (Meta Ads + Compradores) via export CSV
   público e emite os registros brutos no HTML.
2. Toda a lógica (KPIs, filtros, gráficos, heatmap, imposto, tema) roda no navegador
   (`build/template.html`).
3. Commit → `main`. O GitHub Actions builda e publica no Pages.
4. O `cron-job.org` dispara o build a cada 30 min (ver `SETUP-CRON.md`).

Teste local:
```bash
python build/build.py --meta-file meta.csv --sales-file sales.csv --out dist/index.html
```

**URL pública:** `https://eduardomezzavilla.github.io/dashboard-larissa-codigodarainha/`

## Métricas do funil VSL

Gasto · Impressões · **CPM** · Cliques · **CPC** · **CTR** · Page Views · **CPV** ·
**CR** (Cliques/Page Views) · Checkouts · **CPIC** · **VisCHK** (Checkouts/Page Views) ·
Vendas · **CAC** (Gasto/Vendas) · **ConvCHK** (Vendas/Checkouts) · Faturamento ·
**ROAS** (Faturamento/Gasto) · **Ticket Médio** (Faturamento/Vendas).

- **Produto principal** (base de Vendas / CAC / ConvCHK / Ticket): `Código da Rainha`.
  Configurável em `MAIN_PRODUCT_PREFIX` (`build/build.py`).
- **Faturamento / ROAS**: consideram **todos os produtos** do funil (orderbumps e
  upsells inclusos), atribuídos ao tráfego rastreado.
- **Imposto Meta**: toggle ON aplica o fator configurado em `TAX_FACTOR`.

## O que a dashboard mostra

- **Aba 1 — Visão Geral:** KPIs principais/secundários do funil VSL, gráfico combinado
  diário (Vendas/Checkouts + Gasto/Faturamento/CAC), barras por campanha/anúncio/produto
  e tabela diária com heatmap.
- **Aba 2 — Meta Ads:** funil em etapas, combinado diário, faturamento por
  anúncio, tabela diária e 3 tabelas hierárquicas (Campanha → Conjunto → Anúncio) com
  **filtro cruzado**, além da lista de compradores.
- **Aba 3 — IA Insights:** análise por IA (Claude) do funil e das estruturas ativas,
  com detecção de tendência/saturação e recomendações de verba. Ver `SETUP-IA.md`.

Recursos: filtro global de data + presets, toggle de imposto, tema claro/escuro,
tabelas com ordenação/redimensionamento/multi-seleção, cache-bust.

## Arquivos

- `build/template.html` — a **engine** (CSS + JS). Não editar por cliente.
- `build/build.py` — leitura das planilhas + config do cliente (Spreadsheet IDs,
  gids, imposto, produto principal e rótulos).
- `.github/workflows/deploy.yml` — build + deploy no Pages.
- `.github/workflows/deploy-worker.yml` — deploy automático do Worker da IA Insights.
- `ia-worker/worker.js` — backend da aba IA Insights (engine, genérico).
- `ia-worker/wrangler.toml` — nome do Worker (preencher por cliente).
- `GUIA-REPLICACAO.md` — arquitetura, CSS/JS e solução dos problemas de publicação.
- `CLAUDE.md` — contexto do projeto + checklist de novo cliente.
- `SETUP-CRON.md` — configuração do cron-job.org.
- `SETUP-IA.md` — configuração da aba IA Insights (Cloudflare Worker).

## Privacidade

O e‑mail dos compradores é **mascarado** no build (a página é pública). Para exibir
contatos completos, use repositório/Pages **privado**.
