# Tela "Visão Geral"

Arquivo: `src/features/overview/screens/OverviewScreen.tsx`

Acessada via menu lateral do `AuthenticatedLayout` (item "Visão geral").

## Estrutura

- **Card 1 — Dados sincronizados** (lê de `agent_profiles`, `offline_forms`, `offline_sync_state`):
  - Equipe
  - Grupo
  - Formulário
  - Registros de campo (badge verde com count)
- **Card 2 — Registros por situação de backoffice** (de `getRecordsByBackofficeStatus`): só renderiza se `data.backofficeGroups.length > 0`.
  - Cor do badge: `bg-blue-100` para Disponível, `bg-amber-100` para "Já preenchendo, aguardo backoffice", `bg-zinc-100` caso contrário.
  - Bolinha colorida à direita se a situação tem `statusColor`.
- **Rodapé**: timestamp da última sincronização (`lastSyncAt`).
- **Botão fixo inferior**: "Resetar tudo" (vermelho) com modal de confirmação.

## Dados

`OverviewData` (em `src/features/offline/types/offline.ts:91-100`) é montado por `getOverviewData` (`offlineQueries.ts:31-57`).

## Resetar tudo

`handleReset` (`:44-54`):
1. `clearAllOfflineData(database, session.agent.guid)` — apaga **todas** as tabelas offline (registros, rascunhos, formas, equipes, grupos, contratos, situações, perfis e `offline_sync_state`).
2. `signOut()` → volta para `Login`.

> **Não interrompe a operação uma vez iniciada**: o botão fica disabled enquanto `resetting=true`, mas o `catch` apenas libera o spinner — sem mensagem de erro para o usuário.

## Animações

- `fadeAnim` e `slideAnim`: fade + slide de 24px ao entrar. Roda apenas uma vez (após `loading` virar `false` e `data` populado).
- Modal de confirmação: fade nativo (`Modal animationType="fade"`).

## Buscas comuns

- "Card 2 não aparece" → `data.backofficeGroups.length === 0` (sem situações ou sem registros). Conferir `getRecordsByBackofficeStatus`.
- "Reset não apaga X" → ver lista de tabelas em `clearAllOfflineData` (`offlineQueries.ts:233-245`).
- "Contador de registros errado" → vem de `offline_sync_state.records_count`; atualizado em `prepareOfflineData`.
- "Data da última sincronização sumiu" → só renderiza se `data.lastSyncAt` for truthy.
