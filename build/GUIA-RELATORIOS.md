# GUIA — Geração diária dos Briefings do Gestor (aba Relatórios)

> Lido pela **Routine diária (7h)** do Claude Code que regenera
> `build/relatorios.json`. **Não usa a API paga da Anthropic** — roda na
> assinatura do Claude Code (sem consumir créditos). Toda a matemática vem do
> script `build/gerar_relatorios.py`; o Claude só **redige os textos**.

## O que a Routine faz (passo a passo)

1. **Checkout / pull** da branch de produção (`main`) já atualizada.
2. **Baixar os dados** da planilha central via **Google Drive MCP**
   (`download_file_content`, `fileId = 1wIKzwN2Yy32lFJCB0QHp_weF6xtX-H93f2BeZMZQo8g`,
   `exportMimeType = application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
   O conteúdo vem em base64 (pode ser salvo em arquivo se for grande) — decodifique
   para `central.xlsx`.
3. **Calcular as métricas** de todos os períodos:
   ```
   python build/gerar_relatorios.py --xlsx central.xlsx --out build/relatorios_metrics.json
   ```
   (ou `--meta-file meta.csv --sales-file sales.csv` se já tiver os CSVs).
   Isso NÃO escreve texto — só números. Períodos: `hoje, ontem, 3d, 7d, 14d,
   30d, mes, mespass, todo`.
4. **Redigir os 9 briefings** lendo `build/relatorios_metrics.json` + o
   **Guia de interpretação** abaixo, e gravar em `build/relatorios.json`
   (formato na última seção). Atualize `generated_at` para a data/hora BRT atual.
5. **Commit + push** de `build/relatorios.json` na `main`. O deploy automático
   (~30 min) embute o arquivo no site; a aba passa a exibir o texto novo.

> Se algum passo falhar, **não** apague o `relatorios.json` existente — a página
> continua mostrando a última geração válida.

## Guia de interpretação (resumo — funil VSL)

Trate cada métrica como **diagnóstico probabilístico**, nunca como regra
absoluta. **Sempre** leia junto com a etapa anterior e a posterior. Ordem do
funil: `Gasto → Impressões → Cliques → Page Views → Checkouts → Vendas → Faturamento`.

- **CTR** (Cliques/Impressões): interesse do criativo. Baixo *pode ser bom* se
  CAC baixo e ROAS/ConvCHK altos (anúncio qualifica melhor). Só é problema se
  vier junto de CAC alto / ROAS ruim.
- **Connect Rate / CR** (Page Views/Cliques): saúde da ponte anúncio→página.
  Baixo (< ~60%) → investigar **velocidade da página, pixel/CAPI, atribuição
  (iOS/adblock/LGPD)** — mas se CAC e ROAS seguem saudáveis, provavelmente é
  mensuração, não gargalo real.
- **VisCHK** (Checkouts/Page Views): poder de convencimento da VSL/oferta.
  Costuma ser a principal alavanca. Cai naturalmente em escala / público mais
  frio — compare com o ganho de volume antes de chamar de gargalo.
- **ConvCHK** (Vendas/Checkouts): eficiência do checkout. Baixo → checkout/
  pagamento/gateway, OU **atraso natural de compra** (inicia hoje, paga amanhã —
  comum em ticket alto). Leia com Ticket, CAC e o dia seguinte.
- **CAC**: quase sempre **efeito**, não causa. CAC alto → achar a etapa anterior
  que perdeu eficiência. Pode ser saudável se Ticket/LTV subiram e ROAS segue bom.
- **ROAS**: consequência de CAC × Ticket × conversão. Não otimizar isoladamente.
  ROAS menor pode ser aceitável em fase de escala/teste.
- **Ticket**: valor por venda (com order bumps/upsells). Baixo pode ser proposital.

Heurísticas: CTR baixo + ROAS/CAC bons = anúncio qualifica (não mexer). CR baixo
+ ROAS/CAC estáveis = mensuração, não página. VisCHK cai geral = VSL/página/pixel;
cai só num conjunto = público daquele conjunto. Volume baixo = ruído: não corte
estrutura por 1–2 dias ruins; priorize tendência sobre valor absoluto.

## Metas e código de cor (só CAC e ROAS)

Metas em `build/build.py` (`CAC_TARGET`, `ROAS_TARGET`); vêm no metrics JSON em
`metas`. Desempenho: ROAS `valor/meta`; CAC `meta/valor`. Faixas: `<0,70`
vermelho · `0,70–0,99` amarelo · `1,00–1,29` verde · `≥1,30` ciano. **Não repita
o código de cor no texto** — ele já aparece nos cards/tabelas; o briefing
interpreta *por que* e *o que fazer*.

## Tom e conteúdo esperado

Português, **profundo mas sem enrolação**, pouco técnico (explique quando
necessário). Para cada período: o que aconteceu com as campanhas, leitura do
funil (cruzando métricas), e **sugestões de corte/escala** de campanhas,
conjuntos ou anúncios (ex.: "copiar os TOP Ads para uma CBO de escala",
"pausar anúncio X após ~1 CAC sem venda", "escalar +20% no conjunto Y").
Não invente números que não estejam no metrics JSON.

## Formato de `build/relatorios.json`

```json
{
  "generated_at": "DD/MM/AAAA HH:MM",
  "fonte": "Gerado automaticamente a partir dos dados do funil (Meta Ads × Compradores).",
  "periodos": {
    "hoje":    {"html": "<h3>Resumo do período</h3><p>…</p><h3>Leitura do funil</h3><p>…</p><h3>Estruturas — escalar, cortar e observar</h3><ul>…</ul><h3>Recomendações do gestor</h3><p>…</p>"},
    "ontem":   {"html": "…"},
    "3d":      {"html": "…"},
    "7d":      {"html": "…"},
    "14d":     {"html": "…"},
    "30d":     {"html": "…"},
    "mes":     {"html": "…"},
    "mespass": {"html": "…"},
    "todo":    {"html": "…"}
  }
}
```

- As **chaves de período são fixas** (mesmos ids dos botões da topbar). Todas as 9
  devem existir.
- HTML permitido no `html`: `<h3> <p> <ul> <li> <b>` e
  `<span class="tag escala|corte|observar">…</span>` (chips coloridos de ação).
- Se um período não tiver dados (ex.: `mespass` sem vendas no mês anterior),
  escreva um `html` curto dizendo que não houve investimento/vendas no período.
