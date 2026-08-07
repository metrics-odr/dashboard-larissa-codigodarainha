# CLAUDE.md — Dashboard de Controle de Tráfego Pago · Larissa Topper (VSL Código da Rainha)

> Este arquivo é lido automaticamente pelo Claude Code ao abrir o repositório.
> Repositório **já configurado** para o cliente **Larissa Topper** (funil VSL
> Código da Rainha). A engine (`build/template.html`, `ia-worker/worker.js`) é
> genérica; os valores do cliente ficam em `build/build.py`.
> O Codex usa o contexto complementar em `AGENTS.md`; a automação equivalente
> às Routines está documentada em `SETUP-CODEX.md`.

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
10. [ ] **Embutir a URL do Worker no build** — copiar a URL do Worker (exibida na
    Cloudflare) para `IA_WORKER_URL` em `build/build.py` e rodar/disparar um novo
    build. Isso faz os insights aparecerem para **qualquer visitante**, em qualquer
    navegador, sem precisar configurar nada — a persistência é no Worker (KV), não
    no navegador. Na aba **IA Insights** → **⚙ Configurar**, só é preciso colar a
    senha (a mesma do secret `INSIGHTS_PASSWORD`) para poder **gerar** novos
    insights; o campo "Worker URL" ali é opcional (só para apontar a um backend
    diferente do padrão embutido).
11. [ ] **Testar** — clicar em **Gerar insights** e confirmar que os cards aparecem
    (e continuam aparecendo depois de recarregar a página em outro navegador).

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

Spreadsheet ID: `1wIKzwN2Yy32lFJCB0QHp_weF6xtX-H93f2BeZMZQo8g` (as duas abas ficam
na mesma planilha; leitura via export CSV).

| Aba | gid | Colunas usadas |
|-----|-----|----------------|
| **Meta Ads** | `1195145852` | Day · Campaign Name · Ad Set Name · Ad Name · Amount Spent · Impressions · Link Clicks · Landing Page Views · Checkouts Initiated |
| **Compradores** | `1836439885` | Produto · Nome · Email · Data · Valor · Taxas · **Faturamento** · Pagamento · utm_source · utm_medium · utm_content · utm_term · utm_campaign · Status · … |

**Particularidades da planilha deste cliente (validadas na fonte real):**
- **Receita = coluna `Faturamento`** (Valor + orderbumps por comprador), não `Valor`.
  Em `build.py` o alias de `val` prioriza `faturamento`.
- **Sem coluna de status de pagamento**: `Status` é estágio de CRM (`Aberto ADV`) e
  `Pagamento` é a bandeira do cartão. Como é lista de compradores, `COUNT_ALL_AS_PAID = True`
  conta todas as linhas como venda paga.
- **Produto** = `Código da Rainha` (prefixo `codigo da rainha`).
- **O identificador do anúncio vem do `UTM Content`** (ex. `AD01`, `AD02`...), igual ao
  campo `Ad Name` real do Meta (validado na API). O `UTM Term` carrega o **posicionamento**
  (`Instagram_Reels`/`Instagram_Feed`/`Instagram_Stories`/`Facebook_Mobile_Feed`), **não** o
  nome do anúncio. O match Meta↔venda é pela combinação **`UTM Campaign` + `UTM Content`**
  (ver "atribuição" abaixo). Confirmado em 2026-08-03.

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
- Uma venda entra no funil se: é o produto principal **OU** a combinação **`UTM Campaign`
  + `UTM Content`** (campanha + anúncio) casa com uma linha real do Meta (captura
  orderbumps/upsells que carregam a UTM do anúncio). O match exige campanha **e**
  anúncio juntos — nomes de anúncio (`AD01`, `AD02`...) se repetem entre campanhas
  diferentes, então casar só pelo nome do anúncio atribuiria a venda à campanha errada
  (era o caso da campanha "Bidcap", que recebia vendas de outras campanhas). Quando casa,
  a venda herda a campanha/conjunto **reais do Meta** (fica na mesma linha do gasto nas
  tabelas). Vendas de outros funis (UTM/produto não relacionados) ficam de fora. Só conta
  status pago.
- Se não houver coluna de Receita, não há Receita/ROAS R/Ticket R — ajuste o texto
  desta seção se o cliente novo tiver uma regra diferente.

### Imposto Meta Ads
Toggle ON aplica o `TAX_FACTOR` (definido em `build.py`) sobre os custos do Meta.

### Convenções de campanha
`Campaign Name = utm_campaign`, `Ad Set Name = utm_medium`, `Ad Name = utm_content`
(⚠️ **não** `utm_term` — essa coluna carrega o **posicionamento** do anúncio
`Instagram_Reels`/`Feed`/`Stories`, não o nome dele). O match com o Meta (campo `meta`,
usado pela aba Meta Ads) exige `utm_campaign`+`utm_content` batendo com uma linha real do
Meta; quando casa, a venda herda a campanha/conjunto reais do Meta (para o gasto e a venda
caírem na mesma linha das tabelas).

## IA Insights

Aba de análise por IA (Claude) do funil e das estruturas ativas — ver `SETUP-IA.md`
para o passo a passo completo de configuração do backend (Cloudflare Worker +
deploy automático via GitHub Actions).

**Persistência:** o último resultado gerado fica salvo no **Worker (KV namespace
`INSIGHTS_KV`)**, não no navegador — por isso qualquer visitante, em qualquer
navegador, vê os mesmos insights sem precisar gerar de novo. A URL do Worker vem
embutida no build (`IA_WORKER_URL` em `build.py`); a senha (`INSIGHTS_PASSWORD`)
só é exigida para **gerar** novos insights (POST), não para ler os já gerados
(GET, público). O workflow `deploy-worker.yml` cria o KV namespace sozinho no
primeiro deploy; se o `CLOUDFLARE_API_TOKEN` não tiver a permissão "Workers KV
Storage: Edit", ele publica o Worker sem persistência (volta ao comportamento
antigo, sem quebrar o deploy) e avisa no log do Actions.

## Arquitetura / arquivos

A dashboard é montada a partir de **arquivos separados** (visual x lógica), costurados
pelo `build.py` no `render()` — assim dá para mexer só em cor/layout sem tocar na lógica:

```
build/build.py             # lê os 2 CSVs (read-only), emite meta[]/sales[] e COSTURA os arquivos abaixo
build/template.html        # esqueleto HTML (placeholders __STYLES__ / __APP_JS__ / __DATA_JSON__)
build/identidade-visual.css # ⭐ TODAS as cores (temas claro/escuro, paleta de gráficos, heatmap). Edite AQUI p/ mexer só em cor.
build/estilos.css          # layout/componentes (CSS não-cor)
build/app.js               # lógica + renderização (gráficos/heatmap leem as cores via CSS vars)
.github/workflows/deploy.yml         # roda build.py e publica no Pages
.github/workflows/deploy-worker.yml  # publica o Worker da IA Insights (Cloudflare)
.github/workflows/gerar-relatorios-metrics.yml # 23:50 BRT: busca as planilhas e commita relatorios_metrics.json
ia-worker/worker.js    # backend da aba IA Insights (ENGINE — não editar por cliente)
ia-worker/wrangler.toml # nome do Worker (larissa-codigodarainha-ia-insights)
build/relatorios.json  # briefings do Gestor por período (aba Relatórios) — VERSIONADO
build/relatorios_metrics.json # números por período (gerado pelo Actions, lido pela Routine) — VERSIONADO
build/gerar_relatorios.py # calcula as métricas por período (rodado pelo Actions, não pela Routine)
build/GUIA-RELATORIOS.md  # passo a passo da Routine que regenera os briefings
dist/index.html        # saída gerada (gitignored; o Actions reconstrói)
GUIA-REPLICACAO.md     # engine explicada + solução dos problemas de publicação
SETUP-CRON.md          # valores do cron-job.org (owner/repo já preenchidos)
SETUP-IA.md            # passo a passo da aba IA Insights
```

### Aba Relatórios (relatórios automáticos do funil)
Aba entre **Meta Ads** e **IA Insights**. Reaproveita os filtros de data da topbar
e os dados já embutidos (`meta[]`/`sales[]`) — tudo calculado no navegador (custo
zero): cards **Visão Geral Total** (todas as vendas) e **Tráfego** (só Meta Ads),
tabela diária resumida (Total | Ads), visão por campanha, **Top 5 / Piores 5
anúncios** (com link do criativo via coluna *Creative Instagram Permalink* →
`ad_links`). **Código de cor** (vermelho/amarelo/verde/ciano) só em **CAC** e
**ROAS**, conforme `CAC_TARGET`/`ROAS_TARGET` em `build.py` (desempenho =
ROAS `valor/meta`, CAC `meta/valor`).

O **Briefing do Gestor** (texto interpretativo por período) é **pré-gerado por IA**
e lido de `build/relatorios.json` — **sem chamada de API no navegador nem créditos
da Anthropic**. Regeneração em **2 etapas diárias** (o sandbox do agente não alcança
o Google Sheets, só o runner do GitHub Actions — ver "problemas conhecidos" #4):
**23:50 BRT** o workflow `gerar-relatorios-metrics.yml` busca as planilhas e commita
`build/relatorios_metrics.json` (só números); **23:59 BRT** uma **Routine do
Claude Code** lê esse arquivo, migra o texto que estava em "hoje" para "ontem" e
redige os 9 briefings do zero seguindo `build/GUIA-RELATORIOS.md`, commitando
`relatorios.json`. Essa etapa pode ser executada por uma automação do **Codex**
ou pela Routine do Claude Code. Rodar no fim do dia (não de manhã) garante
que "hoje" seja
analisado com o dia quase completo. Se o JSON não existir, a aba mostra tudo
menos o briefing (cards/tabelas seguem funcionando).

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
7. **Insights "somem":** se estiverem salvos só no navegador (versões antigas do
   template), limpar dados do navegador apaga tudo. A partir desta versão a
   persistência é no Worker (KV) — ver seção "IA Insights" acima; confirme que
   `IA_WORKER_URL` está preenchido em `build.py` e que o log do deploy do Worker
   não mostrou o aviso de KV sem permissão.
8. **Venda não aparece na aba Meta Ads (ou aparece na campanha errada):** o
   identificador do anúncio real do Meta (`Ad Name` = `AD01`, `AD02`...) vem do
   **`UTM Content`** desta planilha — o `UTM Term` carrega o **posicionamento**
   (`Instagram_Reels`/`Feed`/`Stories`). Casar pelo `UTM Term` zera as atribuições
   (não bate com o `Ad Name`). Além disso, nomes de anúncio se repetem entre campanhas
   diferentes — o match precisa ser **campanha+anúncio juntos** (`UTM Campaign`+`UTM
   Content`), senão a venda é atribuída à campanha errada (ex.: caía na "Bidcap").
   Confira o valor real do `Ad Name` na API/painel do Meta e compare com as colunas
   UTM antes de mexer no alias.
