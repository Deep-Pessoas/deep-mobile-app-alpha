# Tela de Registros (lista, busca, filtro)

Caminho: Home → menu "Registros" → `RecordsScreen` (via `RecordsFlow`).

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `src/features/records/RecordsFlow.tsx` | Orquestra alternância entre lista e formulário de preenchimento |
| `src/features/records/screens/records/RecordsScreen.tsx` | UI da lista (toolbar, flatlist, modal de filtro) |
| `src/features/records/hooks/useRecords.ts` | Estado, paginação, debounce de busca, mapeamento de filtros |
| `src/features/records/components/RecordsToolbar.tsx` | Input de busca + botão "Filtro" |
| `src/features/records/components/FilterModal.tsx` | Modal com lista de status (rascunho, disponíveis, situações) |
| `src/features/records/components/RecordCardItem.tsx` | Card de cada registro (memoizado) |
| `src/features/records/components/StatusBadge.tsx` | Badge colorido por status |
| `src/features/records/types/records.ts` | `StatusFilter` e GUIDs-sentença |
| `src/features/offline/services/offlineQueries.ts` (já descrito) | Provider dos dados (`getRecordsWithFilter`, `getBackofficeStatuses`) |
| `src/features/offline/types/offline.ts` | `RecordCard` |

## Fluxo

```
AppNavigator → AuthenticatedLayout (currentScreen='records')
  └─ RecordsFlow (active=true, onTitleChange)
       ├─ selectedRecordGuid=null → RecordsScreen
       │                              ├─ useRecords → statuses + page
       │                              ├─ Toolbar (busca + filtro)
       │                              ├─ FlatList de RecordCardItem
       │                              └─ FilterModal
       └─ selectedRecordGuid=guid  → FillRecordScreen
                                       └─ onBack() → setSelectedRecordGuid(null)
```

`onTitleChange` é chamado quando `active` muda; usado pelo `AuthenticatedLayout` para mostrar "Registros" ou "Preencher registro" no header.

## `useRecords` — ponto-chave de manutenção

`src/features/records/hooks/useRecords.ts`:

- **`requestId` ref** (`:14`): ignora respostas atrasadas quando o usuário troca filtro/busca rapidamente.
- **refs de loading** (`isLoadingRef`, `isLoadingMoreRef`, `hasMoreRef`): evitam chamadas duplicadas; state correspondente é para UI.
- **Mapeamento de filtro** (`:32-38`): converte `AVAILABLE_STATUS_GUID`/`OFFLINE_DRAFT_STATUS_GUID`/`OFFLINE_FILLING_STATUS_GUID` para sentinelas internas (`__available__`, etc.) antes de chamar `getRecordsWithFilter`.
- **Debounce** (`:118-130`): 250ms só se `search` não-vazio. Filtro de status não tem debounce.
- **`resetToken`**: bump força re-fetch (usado por `clearFilters`).
- **`markOfflineDraft(recordGuid, status)`** (`:137-160`): atualização otimista do card após salvar rascunho no formulário. Se o filtro ativo é incompatível com o novo status, o card é **removido** da lista em vez de atualizado.
- **`loadMore`**: append; passa `nextCursor.current` se houver.

### Status cards derivados

- `hasOfflineDraft` + `localStatus` (`Preenchendo offline` ou `Rascunho`) → exibidos com cores fixas (`#f59e0b` e `#71717a`).
- `canFill = hasOfflineDraft || !statusGuid || FILLABLE_STATUS_GUIDS.includes(statusGuid)` — decide se o botão "Preencher/Continuar" aparece (`offlineQueries.ts:200`).
- "Ja preenchendo, aguardo backoffice" aparece quando backoffice = "Pendente" sem rascunho.

## Busca (FTS5)

- Implementada em SQLite via tabela virtual `offline_records_fts` (criada na migração v6, índices na v5).
- `createRecordsSearchQuery` (`offlineQueries.ts:117-121`) quebra o input em tokens Unicode alfanuméricos e monta `MATCH "termo1"* AND "termo2"*`.
- Busca casa com `name`, `address`, `street`, `customer_code`.
- Triggers mantêm a FTS sincronizada (vide `migrations.ts:17-32` e `offlineSync.ts:9-26`).
- A busca é **case-insensitive** e ignora acentos (`tokenize = 'unicode61 remove_diacritics 2'`).

## Paginação

- Cursor = `offline_records.rowid` (monotônico). `getRecordsWithFilter` retorna `{ hasMore, nextCursor, records }`.
- `pageSize = 40` (`useRecords.ts:10`).
- `onEndReachedThreshold = 0.5` — dispara quando falta meia página.

## UI

- `RecordsScreen` mostra ActivityIndicator em tela cheia só na primeira carga; depois indicador discreto no `ListFooterComponent`.
- `scrollOffset` é salvo em ref para restaurar ao voltar da tela de formulário (`:42-52`).
- `removeClippedSubviews` é forçado `true` no Android (ganho de memória em listas longas).
- `FilterModal`: limpa seleção com botão "Limpar" e fecha com "Fechar".

## Buscas comuns

- "Busca não acha nada" → conferir se `offline_records_fts` existe (`PRAGMA table_info`). Tokens com hífen/underscore viram termos vazios (`createRecordsSearchQuery`).
- "Filtro de status não filtra" → conferir mapeamento em `useRecords.ts:32-38` e sentinelas em `records.ts:7-9`.
- "Card some ao salvar rascunho" → comportamento esperado de `markOfflineDraft` quando o filtro é incompatível.
- "Paginação duplica registros" → checar `requestId` em `useRecords.ts:14`; respostas antigas são descartadas.
- "Lista vazia mesmo com registros" → conferi `offline_records` foi populado na preparação; ver `saveRecords` em `offlineSync.ts:90-144`.
