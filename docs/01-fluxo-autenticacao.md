# Fluxo de Autenticação

Cobre: `AuthContext`, `AppNavigator`, ciclo login → preparação → home, logout, validação de sessão persistida.

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `src/features/auth/context/AuthContext.tsx` | Estado de sessão, efeito de bootstrap, login/logout, gating de "offline pronto" |
| `src/features/auth/services/authService.ts` | Chamadas HTTP de login/verificação/primeiro acesso |
| `src/features/auth/services/sessionStorage.ts` | Persistência de 1 linha em `auth_session` (SQLite) |
| `src/features/auth/types/auth.ts` | Tipos `AuthSession`, `AuthenticatedAgent`, requests/responses |
| `src/navigation/AppNavigator.tsx` | Decide entre `Login` × `Preparation` × `Home` com base no estado de auth |

## Estado exposto por `useAuth()`

```ts
{
  isLoading: boolean,          // bootstrap inicial (carrega sessão do DB)
  isOfflineReady: boolean,     // preparation já concluída nesta sessão
  session: AuthSession | null,
  markOfflineReady: () => void,
  signIn: (session) => Promise<void>,
  signOut: () => Promise<void>,
}
```

## Máquina de estados (AppNavigator)

```
                ┌───────────────────────────────────────────┐
                ▼                                           │
   [bootstrap]  isLoading=true  → LoadingScreen             │
                │                                           │
        ┌───────┴────────┐                                  │
   session=null      session!=null                          │
        │                │                                  │
     [Login]      isOfflineReady=false                      │
                    OU  prepDone=false (estado local)        │
                       │                                    │
                   [Preparation] ──onAdvance──┐              │
                                             ▼              │
                                       prepDone=true        │
                                             │              │
                                  isOfflineReady?           │
                                   ├─ false → [Preparation] │
                                   └─ true  → [Home]        │
                                                             
   signOut() → session=null → volta para [Login]
```

Detalhes:
- `prepDone` é estado **em memória** do `AppNavigator` (não persiste). Foi proposital: após `signOut` a tela de preparação reaparece para novo agente.
- `isOfflineReady` é flag no `AuthContext` resetada em `signIn`/`signOut` (estado em memória).
- A persistência real de "preparado" está em `offline_sync_state.status = 'ready'` (checada em `isOfflineDataReady`).

## Bootstrap (efeito único ao montar)

`AuthContext.tsx:26-46`:
1. `loadSession(database)` → lê `auth_session WHERE id=1`.
2. Se houver: aplica token no `apiClient` e faz ping em `/campo-agentes/{guid}`.
3. Se o ping falhar: `clearSession` + zera token + sessão = `null` (logout silencioso).
4. Se passar: seta sessão e checa `isOfflineDataReady` para definir `isOfflineReady`.
5. `setIsLoading(false)`.

> **Atenção**: Token expirado = sessão é apagada sem aviso. Se precisar de UX diferente, mexa nesse bloco.

## Login (ver `02-tela-login.md` para UI)

`signIn(session)` faz: `saveSession` → `setApiAccessToken` → `isOfflineDataReady` → `setSession`. Token só é persistido **após** login válido.

## Logout

`signOut()` faz: `clearSession` → `setApiAccessToken(null)` → reseta `isOfflineReady` → `setSession(null)`. O `AppNavigator` re-renderiza para `Login`.

## Endpoints consumidos

| Rota | authService.ts | Notas |
|---|---|---|
| `POST /auth/verificar-acesso` | `verificarAcesso` | Pré-checagem por CPF. Retorna `liberado` + `guid` + `tipo_agente`. |
| `POST /auth/primeiro-acesso/{guid}?navegador=true` | `primeiroAcesso` | Cria senha no primeiro acesso. |
| `POST /auth/login` | `login` | Retorna `{ token, agente }`. |

> O interceptor de axios adiciona `?app_service=v2&mobile=true` automaticamente (`apiClient.ts:7-10`). Bearer token é injetado por `setApiAccessToken`.

## Buscas comuns

- "Login não funciona / não entra" → ver `02-tela-login.md` + checar `ALLOWED_AGENT_TYPE` em `LoginScreen.tsx:25`.
- "Sessao expirou e app nao desloga" → bootstrap em `AuthContext.tsx:26`.
- "Após login vai direto pra home sem preparar offline" → `markOfflineReady` em `AppNavigator.tsx:34` e flag `prepDone`.
