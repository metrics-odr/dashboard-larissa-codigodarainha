# CLAUDE.md — Dashboard de Controle de Tráfego Pago · Larissa Topper (VSL Código da Rainha)

> Este arquivo é lido automaticamente pelo Claude Code ao abrir o repositório.
> Repositório **já configurado** para o cliente **Larissa Topper** (funil VSL
> Código da Rainha). A engine (`build/template.html`, `ia-worker/worker.js`) é
> genérica; os valores do cliente ficam em `build/build.py`.

---

## ✅ CHECKLIST DE NOVO CLIENTE (já concluído para este cliente)

> Mantido como referência da engine. Para o cliente **Larissa Topper** os itens
> 1–6 já estão preenchidos/publicados; a aba **IA Insights** (itens 7–11) depende
> dos 4 secrets da Cloudflare/Anthropic (ver `SETUP-IA.md`).

Ordem para colocar um cliente novo no ar. Cada item aponta o arquivo e o marcador.

1. [ ] **Planilha do cliente** — em `build/build.py`, preencher:
   - `SPREADSHEET_ID` (ID da planilha Google Sheets)
   - `GID_META` (gid da aba Meta Ads)
   - `GID_SALES` (gid da aba Compradores)
2. [ ] **Regras de negócio** — em `build/build.py`, preencher:
   - `TAX_FACTOR` (fator de imposto Meta; `1.0` se não houver)
   - `MAIN_PRODUCT_PREFIX` (prefixo do produto principal, minúsculo e sem acento)
   - `CLIENT_NAME`, `CLIENT_SUB`, `TAX_LABEL`, `MAIN_PRODUCT`
3. [ ] **Este arquivo (`CLAUDE.md`)** — preencher: URL pública, nome do
   cliente/projeto, Spreadsheet ID e tabela de abas/colunas (seção "Fontes de dados"),
   regra de atribuição/produto principal se diferente do padrão do template.
4. [ ] **`README.md`** — preencher: título, URL pública, nome do produto principal.
5. [ ] **`SETUP-CRON.md`** — preencher: owner/repo do GitHub, URL do Pages
   (aparecem em 3 lugares no arquivo); gerar um **token fine-grained novo**
   (GitHub → Settings → Developer settings → Fine-grained tokens) escopado só
   para esse repositório, permissão Actions: Read and write; cadastrar no
   cron-job.org (nunca commitar o token).
6. [ ] **GitHub Pages** — confirmar que o workflow `.github/workflows/deploy.yml`
   está na branch `main` e que o Pages foi habilitado (ele se autoconfigura na
   1ª execução via `actions/configure-pages`).
7. [ ] **Worker da IA Insights** — criar um Worker novo na Cloudflare (nome
   próprio do cliente) e ajustar `ia-worker/wrangler.toml` (`name = "..."`).
   Passo a passo completo em `SETUP-IA.md`.
8. [ ] **4 Secrets do repositório no GitHub** (Settings → Secrets and variables →
   Actions → New repository secret):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `ANTHROPIC_API_KEY`
   - `INSIGHTS_PASSWORD`
9. [ ] **Disparar o primeiro deploy do Worker** — um commit tocando qualquer
   arquivo dentro de `ia-worker/` já dispara `.github/workflows/deploy-worker.yml`
   automaticamente (ou rode manualmente pela aba Actions, se o workflow tiver
   `workflow_dispatch`).
10. [ ] **Configurar o dashboard** — na aba **IA Insights** → **⚙ Configurar**,
    colar a URL do Worker (copiada na Cloudflare) e a mesma senha do secret
    `INSIGHTS_PASSWORD`, e clicar em **Salvar**.
11. [ ] **Testar** — clicar em **Gerar insights** e confirmar que os cards aparecem.

Cliente configurado: **Larissa Topper** — dados preenchidos em `build/build.py`
e publicação ativa no GitHub Pages.

---

## O que é

Dashboard de **Controle de Tráfego Pago** — app de BI estático (HTML/CSS/JS + Chart.js
via CDN) publicado no **GitHub Pages**, que cruza o gerenciador **Meta Ads** com a lista
de **Compradores** e se atualiza a cada ~30 min (build na nuvem via GitHub Actions,
disparado pelo cron-job.org). **Somente leitura** das planilhas.

- **URL pública:** `https://eduardomezzavilla.github.io/dashboard-larissa-codigodarainha/`
- **Cliente/projeto:** `Larissa Topper` — VSL Código da Rainha (funil VSL/tráfego direto)
- **Tipo de funil:** VSL / tráfego direto (não há etapa de Leads/MQL)

## Fontes de dados (Google Sheets)

Neste cliente **Meta Ads e Compradores estão em planilhas separadas** (IDs
distintos), configurados em `build.py` como `SPREADSHEET_ID_META` e
`SPREADSHEET_ID_SALES` (leitura via export CSV).

| Aba | Spreadsheet ID | gid | Colunas usadas |
|-----|----------------|-----|----------------|
| **Meta Ads** | `1pHqlsebgC-Or0rg9jRJZ46CKcvVc7z-q14FRmYLzEAA` | `1195145852` | Day · Campaign Name · Ad Set Name · Ad Name · Amount Spent · Impressions · Link Clicks · Landing Page Views · Checkouts Initiated |
| **Compradores** | `1wIKzwN2Yy32lFJCB0QHp_weF6xtX-H93f2BeZMZQo8g` | `1836439885` | Data de Criação · Cliente / Nome · Cliente / E-mail · Produto · Valor da Venda · UTM Content · UTM Campaign · UTM Medium · Status |

URL de export CSV: `https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>`

### Métricas do funil VSL (`build.py` + `template.html`)
`Gasto → Impressões → Cliques → Page Views → Checkouts → Vendas → Faturamento`

Gasto · Impressões · CPM · Cliques · CPC · CTR · Page Views · CPV · CR (Cliques/PageViews) ·
Checkouts · CPIC · VisCHK (Checkouts/PageViews) · Vendas · CAC (Gasto/Vendas) ·
ConvCHK (Vendas/Checkouts) · Faturamento · ROAS (Faturamento/Gasto) · Ticket (Faturamento/Vendas).

### Produto principal / atribuição
- **Produto principal** = `MAIN_PRODUCT_PREFIX` (definido em `build.py`). Base de
  **Vendas / CAC / ConvCHK / Ticket**.
- **Faturamento / ROAS** = soma de **todos os produtos** do funil (orderbumps/upsells).
- Uma venda entra no funil se: é o produto principal **OU** seu `UTM Content` casa com
  um `Ad Name` do Meta (captura orderbumps/upsells que carregam a UTM do anúncio). Vendas
  de outros funis (UTM/produto não relacionados) ficam de fora. Só conta status pago.
- Se não houver coluna de Receita, não há Receita/ROAS R/Ticket R — ajuste o texto
  desta seção se o cliente novo tiver uma regra diferente.

### Imposto Meta Ads
Toggle ON aplica o `TAX_FACTOR` (definido em `build.py`) sobre os custos do Meta.

### Convenções de campanha
`Campaign Name = utm_campaign`, `Ad Set Name = utm_medium`, `Ad Name = utm_content`.
As vendas são atribuídas à campanha/conjunto pelo `Ad Name` correspondente no Meta.

## IA Insights

Aba de análise por IA (Claude) do funil e das estruturas ativas — ver `SETUP-IA.md`
para o passo a passo completo de configuração do backend (Cloudflare Worker +
deploy automático via GitHub Actions).

## Arquitetura / arquivos

```
build/build.py        # lê os 2 CSVs (read-only), emite REGISTROS BRUTOS (meta[]/sales[]) no HTML
build/template.html   # o app inteiro: CSS + JS (ENGINE — não editar por cliente)
.github/workflows/deploy.yml         # roda build.py e publica no Pages
.github/workflows/deploy-worker.yml  # publica o Worker da IA Insights (Cloudflare)
ia-worker/worker.js    # backend da aba IA Insights (ENGINE — não editar por cliente)
ia-worker/wrangler.toml # nome do Worker (larissa-codigodarainha-ia-insights)
dist/index.html        # saída gerada (gitignored; o Actions reconstrói)
GUIA-REPLICACAO.md     # engine explicada + solução dos problemas de publicação
SETUP-CRON.md          # valores do cron-job.org (owner/repo já preenchidos)
SETUP-IA.md            # passo a passo da aba IA Insights
```

O `build.py` **não agrega**: exporta as linhas cruas e toda a lógica (filtros, KPIs,
tabelas, gráficos, heatmap, imposto, tema) roda no navegador.

Teste local:
`python build/build.py --meta-file meta.csv --sales-file sales.csv --out dist/index.html`

## Publicação — problemas conhecidos e soluções

1. **Push com integração somente‑leitura:** se `git push`/MCP derem `403 Resource not
   accessible by integration`, faça push com o **PAT do usuário** direto ao github.com
   (`git push https://x-access-token:<TOKEN>@github.com/<owner>/<repo>.git main:main`).
   **Nunca** grave o token no `.git/config` (use a URL efêmera).
2. **cron-job.org só funciona na `main`:** `workflow_dispatch` só existe na branch padrão.
3. **Pages liga sozinho:** `actions/configure-pages@v5` com `enablement: true`
   (+ `permissions: {pages: write, id-token: write}`).
4. **Proxy do sandbox:** o agente NÃO alcança `docs.google.com`, `*.github.io` nem a API
   REST de Actions/Pages e nem `api.cloudflare.com` — mas o runner do Actions alcança
   tudo. Teste dados com CSV local; deploys da Cloudflare passam pelo GitHub Actions.
5. **Token exposto no chat:** revogar e gerar um novo (fine‑grained, só Actions: r/w no repo).
6. **"Senha incorreta" na aba IA Insights após um deploy:** normalmente indica que os
   secrets `ANTHROPIC_API_KEY`/`INSIGHTS_PASSWORD` não estão cadastrados como Secrets
   do repositório no GitHub — o workflow `deploy-worker.yml` os reaplica no Worker a
   cada deploy; sem eles cadastrados, o Worker fica sem senha válida.
