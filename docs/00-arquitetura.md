# Arquitetura · Documentação Estratégica

Documentação focada em **encontrar rápido o que precisa para corrigir, ajustar ou melhorar**. Estruturada por feature, com referências cruzadas por arquivo:linha e termos de busca.

> **Regra**: Antes de escrever código, leia `AGENTS.md` (Expo v56).

## Índice de leitura por intenção

| Você quer… | Vá para |
|---|---|
| Entender como o app liga e desliga | [01-fluxo-autenticacao.md](01-fluxo-autenticacao.md) |
| Corrigir/ajustar tela de login | [02-tela-login.md](02-tela-login.md) |
| Mexer na preparação offline / sync | [03-preparacao-offline.md](03-preparacao-offline.md) |
| Ajustar lista de registros (filtro, busca, paginação) | [04-tela-registros.md](04-tela-registros.md) |
| Adicionar/ajustar campo do formulário dinâmico | [05-formulario-dinamico.md](05-formulario-dinamico.md) |
| Tela de visão geral | [06-tela-visao-geral.md](06-tela-visao-geral.md) |
| Banco SQLite (tabelas, migrações, FTS) | [07-banco-dados.md](07-banco-dados.md) |
| API/HTTP e contratos externos | [08-api-http.md](08-api-http.md) |
| Layout autenticado (header + drawer) | [09-layout-autenticado.md](09-layout-autenticado.md) |
| Variáveis de ambiente, build, EAS | [10-build-config.md](10-build-config.md) |

## Mapa de features

```
src/
├── features/
│   ├── auth/            → Login, sessão persistida, contexto de autenticação
│   ├── home/            → Placeholder (HomeScreen); entrada após auth
│   ├── offline/         → Preparação dos dados offline + tipos compartilhados de registros
│   ├── overview/        → Tela "Visão geral" (dados sincronizados)
│   ├── records/         → Listagem/busca/filtro de registros + fluxo p/ formulário
│   └── fill-record/     → Formulário dinâmico (campos, validação, rascunho)
├── navigation/          → Stack navigator (decide Login × Preparation × Home)
├── shared/
│   ├── api/             → axios + token bearer
│   ├── components/      → UI genérica (Layout autenticado, modais, ícones SVG)
│   ├── config/          → env (lê .env via expo-constants)
│   ├── database/        → Migrações SQLite + fila de sync (legado, vide §07)
│   ├── notifications/   → Push (Expo) — opcional
│   ├── query/           → React Query client (config padrão)
│   └── utils/           → Helpers puros (CPF, mensagens de erro)
```

## Princípios arquiteturais (para respeitar ao mexer)

1. **Estado de sessão fica no `AuthContext`**. Toda tela que precisa de agente/token consome `useAuth()`. Token é injetado no `apiClient` via `setApiAccessToken` (`src/shared/api/apiClient.ts:17`).
2. **Persistência local é a única fonte de verdade em runtime**. Registros, formulários, rascunhos e estruturas ficam em SQLite (`expo-sqlite`). O backend é usado só para baixar e (futuramente) sincronizar.
3. **Tipos de domínio residem em `features/*/types/*.ts`**. Não duplique tipos em componentes.
4. **Campos do formulário são dinâmicos** — lidos de `offline_forms.raw_json` (estrutura `{ json: { campos: [...] } }`). Engine em `features/fill-record/engine/formEngine.ts`.
5. **Filtros "especiais"** (Rascunho, Preenchendo offline, Disponível) usam GUIDs-sentença em `features/records/types/records.ts:7-9` e são traduzidos no hook `useRecords`.

## Estado atual conhecido (gaps, débitos)

- `sync_queue` está criado mas **não há consumidor** que envie os itens para a API. Tudo offline-first é manual via `prepareOfflineData`.
- `notificationService` existe mas **não é chamado em lugar algum** do app.
- `queryClient` está provido, mas **nenhuma tela usa React Query** — toda chamada de API é `await` direta.
- `HomeScreen` é placeholder (apenas "Autenticado").
- Enums `FILLABLE_STATUS_GUIDS` (`features/offline/services/offlineQueries.ts:5-8`) estão hard-coded; revisar quando a API expor lista de situações preenchíveis.
- `ALLOWED_AGENT_TYPE` no login (`features/auth/screens/LoginScreen.tsx:25`) está hard-coded; trocar por config quando disponível.

## Como rodar

- `npm start` — Expo dev server
- `npm run android` — build/run nativo Android
- `npm run typecheck` — `tsc --noEmit` (rode antes de PR)
- `npm run build:apk` — build EAS remoto (perfil `apk` em `eas.json`)
- `npm run build:apk:local` — `expo prebuild` + gradle local
