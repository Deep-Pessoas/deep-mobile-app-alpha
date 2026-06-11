# Preparação Offline

Cobre a primeira sincronização dos dados do agente (estruturas + registros + situações) e a atualização das situações de campo/backoffice.

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `src/features/offline/screens/OfflinePreparationScreen.tsx` | UI de progresso + resumo + retry |
| `src/features/offline/services/offlineApi.ts` | Chamadas HTTP (busca dados do agente, consolidados, situações) |
| `src/features/offline/services/offlineSync.ts` | Gravação no SQLite (`prepareOfflineData` e helpers de escrita) |
| `src/features/offline/services/offlineQueries.ts` | Leituras (resumo, visão geral, listagem/filtro de registros) |
| `src/features/offline/types/offline.ts` | Tipos de domínio (registros, situações, status, summary) |

## Máquina de estados da preparação

`PreparationStep = 'agent' | 'download' | 'structures' | 'records' | 'situacoes' | 'finish'`

Cada `step` corresponde a um marcador visual na lista da tela. O `current`/`total` em `PreparationProgress` é usado **apenas** em `step === 'records'`.

```
useEffect (mount) → runPreparation()
                    │
                    ├── isOfflineDataReady?
                    │     ├─ SIM → atualiza só situações (situacoes) → finish → showSummary
                    │     └─ NÃO → prepareOfflineData (full) → showSummary
                    │
                    └── erro → setErrorMessage → botão "Tentar novamente"
```

## Passos de `prepareOfflineData` (`offlineSync.ts:182-231`)

1. **State**: insere linha em `offline_sync_state` com `status='preparing'`. ON CONFLICT sobrescreve.
2. **agent** (`agent`): `GET /campo-agentes/{guid}` (60s, `offlineApi.ts:17-22`). `requireWorkReferences` (`offlineApi.ts:11-15`) valida `contrato_id`, equipe, `grupo_equipe_guid`.
3. **download** (`download`): `GET /mobile/dados-consolidados/{grupo_equipe_guid}` (5min, `offlineApi.ts:24-30`). Retorna `{ equipe, formulario, registros_quantidade, registros[] }`.
4. **structures** (`structures`): `saveStructures` (`offlineSync.ts:53-88`) grava `agent_profiles`, `offline_contracts`, `offline_groups`, `offline_teams`, `offline_forms`. Cada um guarda `raw_json` + `updated_at`.
5. **records** (`records`): `saveRecords` (`offlineSync.ts:90-144`) — loop em batches de 100 (`RECORDS_BATCH_SIZE = 100`), em transação exclusiva. Suspende triggers de FTS antes, reconstrói no fim. Detalhe em `saveRecords` (vide "Performance" abaixo).
6. **situacoes** (`situacoes`): `GET /situacao-campo` e `GET /situacao-backoffice` em paralelo (`offlineApi.ts:32-43`). `saveSituacoes` (`offlineSync.ts:165-180`) substitui tudo (`DELETE` + `INSERT`).
7. **State final**: `status='ready'`, `records_count=total`.
8. Em **erro**: marca `status='error'`, salva `error_message` na própria `offline_sync_state` e relança.

> `saveStructures` usa `equipe_guid ?? equipe_id` como team_guid. Se os dois forem nulos, quebra — mas `requireWorkReferences` em `offlineApi.ts:11-15` já exige um dos dois.

## Reuso do `OfflinePreparationScreen` para atualização

Quando `isOfflineDataReady` é `true`, o componente faz **apenas o refresh de situações** (`situacoes_campo` + `situacoes_backoffice`), reaproveitando o mesmo sumário. Cria as tabelas com `CREATE TABLE IF NOT EXISTS` localmente (espelha as migrações v4) — vide `OfflinePreparationScreen.tsx:59-67`.

> Atenção: se você alterar o schema de `offline_situacoes_*`, sincronize a migração em `migrations.ts` e o SQL inline em `OfflinePreparationScreen.tsx:60-67`.

## Resumo exibido (`getSummaryData`)

`offlineQueries.ts:10-29` lê:
- `agent_profiles` → `team_name`, `group_name`
- `offline_forms LIMIT 1` → `form_name` (assume apenas um formulário principal)
- `offline_sync_state` → `records_count`

Retorna `SummaryData`. Valores nulos caem para `'—'`.

## Funções exportadas

| Função | Arquivo | Quando usar |
|---|---|---|
| `isOfflineDataReady(db, guid)` | `offlineQueries.ts:247-253` | Checar se o agente já preparou antes de levar à tela de preparação |
| `prepareOfflineData(db, guid, onProgress)` | `offlineSync.ts:182-231` | Sync completa; callback recebe `PreparationProgress` |
| `getSummaryData(db, guid)` | `offlineQueries.ts:10-29` | Dados para tela de resumo |
| `getOverviewData(db, guid)` | `offlineQueries.ts:31-57` | Dados para a tela "Visão geral" |
| `getRecordsByBackofficeStatus(db)` | `offlineQueries.ts:59-109` | Agrupamento de registros por situação de backoffice |
| `getBackofficeStatuses(db)` | `offlineQueries.ts:111-115` | Lista as situações (cor + nome) para o modal de filtro |
| `getRecordsWithFilter(db, search, statusGuid, cursor, pageSize)` | `offlineQueries.ts:123-231` | Paginação cursor-based (40/página) |
| `clearAllOfflineData(db, guid)` | `offlineQueries.ts:233-245` | Wipe total (chamado por "Resetar tudo" no Overview) |

### `getRecordsWithFilter` — pseudocódigo de filtros

`statusGuid` é o GUID real da situação OU uma das "sentinelas":
- `'__available__'` → `backoffice_status_guid IS NULL` e **sem** rascunho
- `'__offline_draft__'` → existe `offline_form_drafts` com `status='Rascunho'`
- `'__offline_filling__'` → existe `offline_form_drafts` com `status='Preenchendo offline'`

`search` vira `MATCH "termo"*` em FTS5 (vide `createRecordsSearchQuery` em `offlineQueries.ts:117-121`).

`FILLABLE_STATUS_GUIDS` (`offlineQueries.ts:5-8`) define quais situações backoffice são **preenchíveis** sem rascunho prévio. Se a API mudar, ajuste.

## Performance — pontos sensíveis

- **FTS triggers** (`offlineSync.ts:9-41`, `suspendRecordsSearchIndex` `:28-34` / `rebuildRecordsSearchIndex` `:36-41`): dropar triggers antes de inserir 100k+ registros e reconstruir no fim é o que torna o import rápido.
- **Transação exclusiva por batch** (`withExclusiveTransactionAsync`): garante atomicidade e velocidade.
- **PRAGMA wal_checkpoint(PASSIVE)** ao final: força flush do WAL para reduzir inodes/bloqueios.
- **Loop sequencial em `saveSituacoes`**: pode ser otimizado com `withExclusiveTransactionAsync` se a lista crescer.

## UI — `OfflinePreparationScreen`

- Header com chip "Primeira preparacao" e barra de progresso animada.
- Lista de 6 steps com check (✓) / número / estado neutro.
- Mensagem detalhada aparece **só** no step atual.
- `showSummary=true` troca toda a tela para o card de resumo + botão "Avançar".
- Erro vira card vermelho com botão "Tentar novamente" (chama `runPreparation` de novo).
- Animações (`fieldOpacity`, `summaryFade`) usam `useNativeDriver: true` exceto a barra de progresso (precisa de `false` para animar `width`).

## Buscas comuns

- "Preparação trava em X%" → conferi step atual; se for `records`, olhar `saveRecords` e logs do batch.
- "Resumo mostra '—'" → `agent_profiles` ou `offline_forms` não populados; rerun.
- "Não volta para tela de preparação depois de reset" → `isOfflineDataReady` é em memória; `signOut` zera.
- "Adicionar novo step" → estender `PreparationStep` em `offline.ts:75`, adicionar item em `steps[]` (`:16-23`), novo trecho em `prepareOfflineData`.
- "Situação nova não aparece no filtro" → `saveSituacoes` precisa rodar; conferir `getBackofficeStatuses`.
