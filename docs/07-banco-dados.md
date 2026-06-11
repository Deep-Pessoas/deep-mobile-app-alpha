# Banco de Dados (SQLite)

Provider: `expo-sqlite`. Database: `deep-agente.db`. Migrações controladas por `user_version` (PRAGMA) em `src/shared/database/migrations.ts`.

## Versão atual: **9**

| Versão | Mudança |
|---|---|
| 1 | `sync_queue` |
| 2 | `auth_session` (1 linha, `id=1`) |
| 3 | `agent_profiles`, `offline_sync_state`, `offline_contracts`, `offline_groups`, `offline_teams`, `offline_forms`, `offline_records`, `offline_backoffice` + índices |
| 4 | `offline_situacoes_campo`, `offline_situacoes_backoffice` |
| 5 | Índices em `offline_records.name`, `address`, `customer_code`, `street` |
| 6 | FTS5 `offline_records_fts` + triggers (insert/update/delete) + rebuild inicial |
| 7 | `offline_form_drafts` (PK composta) |
| 8 | `offline_form_drafts`: adiciona `state_json`, `dados_json`, `status`, `updated_at_ms` + backfill |
| 9 | Índice `idx_offline_form_drafts_status_record` |

## Pragma global (`migrations.ts:37-42`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Aplicado em todo bootstrap.

## Tabelas principais (resumo)

- `auth_session` (1 linha) — token + agente logado. Schema em `migrations.ts:66-80`.
- `agent_profiles` — perfil do agente + `team_guid`, `group_guid`, `contract_guid`. Schema em `:82-97`.
- `offline_sync_state` — `agent_guid` PK, `status` (`preparing`/`ready`/`error`), `records_count`, `error_message`.
- `offline_contracts` / `offline_groups` / `offline_teams` / `offline_forms` — estruturas da área de trabalho. Todos guardam `raw_json` para forward-compat.
- `offline_records` — registros de campo. Colunas planas + `raw_json`. FK para `offline_backoffice` via `record_guid`.
- `offline_backoffice` — eventos de backoffice de cada registro (1:N).
- `offline_situacoes_campo` / `offline_situacoes_backoffice` — catálogos.
- `offline_records_fts` (FTS5) — índice de busca textual; mantido por triggers.
- `offline_form_drafts` — `(record_guid, form_guid)` PK, `state_json` (valores crus), `dados_json` (payload normalizado `{ dados: {...} }`), `status` (`Rascunho`|`Preenchendo offline`), `updated_at_ms` (monotônico).
- `sync_queue` — estrutura criada mas **sem consumidor**. Campos: `id`, `method`, `endpoint`, `payload`, `created_at`, `attempts`, `last_error`.

## Triggers de FTS

Criadas em `ensureRecordsSearchTriggers` (`migrations.ts:5-34`) e **também inline em `offlineSync.ts:9-26` (`RECORDS_FTS_TRIGGERS_SQL`)**. A função `suspendRecordsSearchIndex` (`offlineSync.ts:28-34`) dropa e `rebuildRecordsSearchIndex` (`offlineSync.ts:36-41`) reconstrói.

> A reconstrução via `INSERT INTO offline_records_fts(offline_records_fts) VALUES ('rebuild')` reindexa a partir da tabela `offline_records` (a FTS é "contentless" apontando para `offline_records`). Roda **após** o import em batch.

## Como adicionar migração

1. Incrementar `DATABASE_VERSION` em `migrations.ts:3`.
2. Adicionar bloco `if (currentVersion < N) { ... }` com a DDL.
3. Idempotente quando possível: usar `IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN` (SQLite ≥ 3.35).
4. Após adicionar, re-rodar `ensureRecordsSearchTriggers(database)` (já é feito no fim).
5. Atualizar este documento.

## Como adicionar coluna nova em tabela populada

- Preferir `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT ...` (SQLite não permite `NOT NULL` sem default em tabela com dados). Definir default seguro.
- Adicionar bloco `if (currentVersion < N)` apenas com essa migração; manter migrações anteriores intactas.

## Consumidores importantes

- `offlineSync` (preparação/escrita): `saveStructures`, `saveRecords`, `saveSituacoes`, `prepareOfflineData`.
- `offlineQueries` (leitura): `getRecordsWithFilter`, `getOverviewData`, `getSummaryData`, `getRecordsByBackofficeStatus`, `getBackofficeStatuses`, `clearAllOfflineData`, `isOfflineDataReady`.
- `offlineApi` (HTTP): `fetchAgentWorkData`, `fetchConsolidatedData`, `fetchSituacoesCampo`, `fetchSituacoesBackoffice`.
- `fillRecordService`: `getFillRecordData` (lê `offline_records` + `offline_forms` + `offline_form_drafts`), `saveFillRecordDraft`, `clearFillRecordDraft`.
- `sessionStorage`: `loadSession` / `saveSession` / `clearSession` em `auth_session`.

## Fila de sync (`sync_queueRepository`)

Funções prontas: `enqueueRequest`, `listPendingRequests`, `removePendingRequest`, `markRequestFailure`. **Nenhum ponto do app chama `enqueueRequest`** ainda. Use quando for implementar sync online (diferencial: hoje, todo preenchimento é local-first; uploads ficarão enfileirados).

## Buscas comuns

- "Erro de migração após update" → conferir `user_version` (PRAGMA) e logs de SQLite. Apagar DB e reinstalar é aceitável apenas em dev.
- "Busca não retorna" → FTS pode estar dessincronizada. Rodar `INSERT INTO offline_records_fts(offline_records_fts) VALUES ('rebuild');` (vide `rebuildRecordsSearchIndex`).
- "Rascunho não aparece" → conferir PK `(record_guid, form_guid)`; um registro só tem um rascunho.
- "Insert travando" → `busy_timeout=5000` dá 5s; ver se há transação aberta.
