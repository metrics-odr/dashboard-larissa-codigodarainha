# Codex + Agendamentos

O repositório funciona com as duas ferramentas:

- **Claude Code** lê `CLAUDE.md` e pode continuar usando a Routine existente.
- **Codex** lê `AGENTS.md` e pode executar a mesma atualização por automação.

Não mantenha Claude e Codex atualizando o briefing no mesmo horário. Deixe
**apenas um ativo** para evitar commits concorrentes.

## Automação recomendada no Codex

- **Nome:** `Atualizar briefings Larissa`
- **Horário:** `23:59`, fuso `America/Sao_Paulo`
- **Repositório:** `eduardomezzavilla/dashboard-larissa-codigodarainha`
- **Branch:** `main`
- **Prompt:**

```text
Atualize os Briefings do Gestor deste repositório. Leia primeiro AGENTS.md,
CLAUDE.md e build/GUIA-RELATORIOS.md e cumpra integralmente o guia. Trabalhe a
partir da main atualizada. Verifique que build/relatorios_metrics.json está
fresco para a data atual em America/Sao_Paulo; se não estiver, tente disparar o
workflow gerar-relatorios-metrics.yml, aguarde e atualize a branch. Se continuar
velho, não invente dados e relate a falha. Migre o briefing anterior de hoje para
ontem e reescreva hoje e os outros sete períodos a partir das métricas. Valide
JSON, as nove chaves e todos os números, faça commit e publique a alteração.
Nunca altere as planilhas e nunca exponha secrets.
```

O workflow de métricas deve rodar antes, às 23:50 BRT. O agendamento nativo do
GitHub pode atrasar; para pontualidade, mantenha o disparo externo descrito em
`SETUP-CRON.md` também para o workflow de métricas.

## Diagnóstico

1. Confirme que a automação tem acesso de escrita ao repositório.
2. Rode-a manualmente uma vez.
3. Verifique se `build/relatorios_metrics.json` tem `hoje` igual à data atual em
   BRT e `gerado_em` recente.
4. Verifique o commit de `build/relatorios.json` e o deploy do Pages.
5. Se métricas atualizam mas o briefing não, a falha está na automação de IA
   (permissão, créditos ou execução), não na ingestão das planilhas.
6. Se nem as métricas atualizam, examine **Gerar Métricas dos Relatórios** no
   GitHub Actions e a disponibilidade dos CSVs públicos.

## Operação manual

```text
Leia AGENTS.md e atualize agora os Briefings do Gestor seguindo
build/GUIA-RELATORIOS.md. Use somente as métricas frescas já versionadas.
```

Isso não consome a API Anthropic do Worker. O Worker atende separadamente o
botão **Gerar insights** da dashboard.
