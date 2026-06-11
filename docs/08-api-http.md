# API / HTTP

Cliente único: `src/shared/api/apiClient.ts` (axios).

## Configuração

- `baseURL`: `env.apiUrl` (lido de `extra.apiUrl` em `app.config.ts` → `.env`).
- `params.default`: `{ app_service: 'v2', mobile: true }` — adicionado em **toda** requisição.
- `headers.default.Content-Type`: `application/json`.
- `timeout.default`: `15s` (sobrescrito em endpoints pesados).

## Auth

`setApiAccessToken(token | null)`:
- Se token: `Authorization: Bearer <token>` em `apiClient.defaults.headers.common`.
- Se null: remove o header.

Chamado por:
- `AuthContext` em `signIn` (após `saveSession`) e `signOut` (antes de limpar sessão).
- `AuthContext` no bootstrap após `loadSession`.

> O axios é **singleton**: não há interceptor de refresh token. Sessão expirada = próximo request falha com 401, mas **o `AppNavigator` não tem listener de 401** (vide [01-fluxo-autenticacao.md](01-fluxo-autenticacao.md) — apenas o ping em `/campo-agentes/{guid}` no bootstrap detecta sessão morta).

## Contrato comum das respostas

```ts
{
  code: number,        // 200 = OK; outros = erro de negócio
  status: boolean,     // redundante com code
  message: string,     // mensagem pt-BR para mostrar ao usuário
  data: T,             // payload
}
```

> **Sempre conferir `code === 200 && status === true`** (vide `authService.ts:14-18`, `offlineApi.ts:19`, `offlineApi.ts:28`, `offlineApi.ts:34`, `offlineApi.ts:40`). Tratar `data` como **indisponível** se code != 200.

## Endpoints em uso

| Método | Endpoint | Onde | Timeout | Notas |
|---|---|---|---|---|
| POST | `/auth/verificar-acesso` | `authService.verificarAcesso` | 15s | Body: `{ cpf }` |
| POST | `/auth/primeiro-acesso/{guid}?navegador=true` | `authService.primeiroAcesso` | 15s | Body: `{ senha }` |
| POST | `/auth/login` | `authService.login` | 15s | Body: `{ cpf, senha }` |
| GET | `/campo-agentes/{guid}` | `AuthContext` (bootstrap), `offlineApi.fetchAgentWorkData` | 15s / 60s | Ping de sessão e fetch do agente |
| GET | `/mobile/dados-consolidados/{groupGuid}` | `offlineApi.fetchConsolidatedData` | 300s (5min) | Payload grande: `equipe + formulario + registros[]` |
| GET | `/situacao-campo` | `offlineApi.fetchSituacoesCampo` | 30s | Catálogo |
| GET | `/situacao-backoffice` | `offlineApi.fetchSituacoesBackoffice` | 30s | Catálogo |

> Adicionar/alterar endpoint: criar função em `authService` ou `offlineApi`, validar `code/status`, tratar `data` como parcial se ausente.

## Tratamento de erro

Helper padrão: `src/shared/utils/getErrorMessage.ts`:
- `axios.isAxiosError` → `error.response?.data?.message` ou fallback `'Nao foi possivel conectar com a API.'`.
- `Error` → `error.message`.
- Qualquer outro → `fallback` (segundo parâmetro).

## Buscas comuns

- "Request falha com erro genérico" → API não retorna `{message}` ou está fora de `data`; o helper cai no fallback.
- "Token não vai no header" → conferir `setApiAccessToken` foi chamado após `signIn`; em dev, `console.log(apiClient.defaults.headers.common)`.
- "Sessão fica viva após 401" → falta listener de resposta. Implementar interceptor de axios (proposta; vide §01 sobre débitos).
- "Param extra sumiu" → `params` no request sobrescreve os default. Sempre espelhar `app_service` e `mobile` se montar params manualmente.
