# AGENTS.md — Dashboard Larissa Topper

Este é o contexto principal para o **Codex**. O `CLAUDE.md` continua existindo
para o Claude Code; as duas ferramentas devem preservar a mesma arquitetura e
as mesmas regras de negócio.

## Antes de alterar qualquer coisa

1. Leia `CLAUDE.md` para o contexto completo do cliente, fontes de dados,
   atribuição e arquitetura.
2. Leia o guia da tarefa: `build/GUIA-RELATORIOS.md` para briefings,
   `SETUP-IA.md` para o Worker e `SETUP-CRON.md` para deploy.
3. Rode `git status --short --branch` e não sobrescreva alterações do usuário.

## Regras que não podem ser quebradas

- A dashboard é somente leitura. Nunca escreva na planilha Google.
- Receita usa `Faturamento`; todas as linhas de compradores contam como pagas.
- Produto principal: `Código da Rainha` (`codigo da rainha` normalizado).
- Atribuição Meta↔venda exige **UTM Campaign + UTM Content**. `UTM Content` é o
  anúncio; `UTM Term` é posicionamento. Nunca faça match apenas pelo anúncio,
  pois nomes como `AD01` se repetem em campanhas diferentes.
- Nunca commite tokens, senhas, chaves, CSVs, `dist/` ou dados pessoais não
  mascarados.
- Configuração do cliente fica em `build/build.py`; visual em
  `build/identidade-visual.css`; layout em `build/estilos.css`; comportamento em
  `build/app.js`.
- Ao citar um anúncio em briefing, informe também campanha e, quando útil,
  conjunto.

## Atualização agendada dos briefings

1. GitHub Actions executa `.github/workflows/gerar-relatorios-metrics.yml` às
   23:50 BRT, lê os CSVs públicos e commita `build/relatorios_metrics.json`.
2. Uma automação do **Codex** ou Routine do **Claude Code**, às 23:59 BRT, lê as
   métricas frescas e atualiza `build/relatorios.json` conforme
   `build/GUIA-RELATORIOS.md`.

Para configurar o Codex, use `SETUP-CODEX.md`. Não rode
`build/gerar_relatorios.py` na automação se o acesso ao Google Sheets estiver
bloqueado; use o JSON commitado pelo Actions.

## Validação mínima

- `python -m py_compile build/build.py build/gerar_relatorios.py`
- `node --check build/app.js && node --check ia-worker/worker.js`
- `python -m json.tool build/relatorios.json >/dev/null` e o mesmo para
  `build/relatorios_metrics.json`.

Para briefings, confirme as 9 chaves de período, `generated_at`, frescor de
`gerado_em`/`hoje`, HTML permitido e ausência de números inventados.
