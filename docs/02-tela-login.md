# Tela de Login

Arquivo principal: `src/features/auth/screens/LoginScreen.tsx`

## Visão geral

Fluxo em 3 etapas controladas pelo estado `step: 'cpf' | 'password' | 'reset-password'`. Não usa React Navigation — tudo é gerenciado internamente com `useState`.

```
[CPF] ──verificarAcesso──┐
                         ├─ liberado=false → [Reset senha] ──primeiroAcesso──┐
                         └─ liberado=true  → [Senha]    ──login──┐          │
                                                                   │          │
                                                              signIn()    Modal "Senha definida"
                                                                              │
                                                                              └─→ [Senha] (loop até login)
```

## Estado e refs principais

| Nome | Tipo | Função |
|---|---|---|
| `step` | `'cpf' \| 'password' \| 'reset-password'` | Etapa atual |
| `cpf` | `string` (só dígitos, máx 11) | Armazenado puro, formatado na exibição |
| `password` | `string` | Senha digitada |
| `agentGuid` | `string \| null` | Recebido de `verificarAcesso`, usado em `primeiroAcesso` |
| `errorMessage` | `string \| null` | Erro inline abaixo do input |
| `isLoading` | `boolean` | Trava contra duplo submit e desabilita input |
| `isBlockedModalVisible` | `boolean` | Modal "Acesso nao permitido" (tipo de agente errado) |
| `isPasswordDefinedModalVisible` | `boolean` | Modal "Senha definida" (primeiro acesso OK) |
| `fieldOpacity` / `fieldOffset` | `Animated.Value` | Animação de entrada do card (fade+slide) |

## Comportamentos críticos (linha-a-linha)

- `LoginScreen.tsx:25` — `ALLOWED_AGENT_TYPE`: GUID fixo. **Se a API criar novos perfis**, mover para config/remote-config.
- `LoginScreen.tsx:41` — `isCpfComplete = cpf.length === 11`. Aciona submit automático via `useEffect` em `:87-92`.
- `LoginScreen.tsx:62-85` — `checkAccess`: chama `verificarAcesso`. Em sucesso, decide próximo step. Erro vira `errorMessage` (vazio = não mostra banner).
- `LoginScreen.tsx:79` — `access.liberado ? 'password' : 'reset-password'`.
- `LoginScreen.tsx:94-123` — `authenticate`: se `reset-password`, chama `primeiroAcesso` e abre modal. Senão, chama `login` e `signIn`.
- `LoginScreen.tsx:130` — `submit = isCpfStep ? checkAccess : authenticate` decide qual handler.
- `LoginScreen.tsx:208-216` — máscara dinâmica: na etapa CPF filtra não-dígitos e limita a 11; nas outras aceita qualquer texto.
- `LoginScreen.tsx:234` — barra de força de senha: `'reset-password'` apenas, renderiza `<PasswordStrengthMeter password={password} />`.

## Componentes e utils extraídos (`src/features/auth/`)

| Arquivo | Responsabilidade |
|---|---|
| `utils/passwordStrength.ts` | `getPasswordStrength(password)` — calcula score 0-4 |
| `utils/useAuthLayout.ts` | Hook com `insets`, `horizontalPadding`, `contentWidth`, `modalWidth` |
| `components/PasswordStrengthMeter.tsx` | Barra de força de senha (usa `getPasswordStrength`) |
| `components/AccessBlockedModal.tsx` | Modal "Acesso não permitido" (tipo de agente errado) |
| `components/PasswordDefinedModal.tsx` | Modal "Senha definida" (primeiro acesso OK) |

## Força de senha (`getPasswordStrength`)

Score 0-4. Tabela `LEVELS` em `passwordStrength.ts:7-13`:

| Score | Label | Cor |
|---|---|---|
| 0 (vazio) | Muito fraca | `#dc2626` |
| 1 | Fraca | `#ef4444` |
| 2 | Razoável | `#f59e0b` |
| 3 | Boa | `#84cc16` |
| 4 | Forte | `#16a34a` |

Regras (`passwordStrength.ts:17-20`):
- `+1` ≥ 6 chars
- `+1` ≥ 10 chars
- `+1` minúscula + maiúscula
- `+1` dígito + caractere especial

## Validações e formatações

- **CPF**: aceita só dígitos, máximo 11. Máscara via `formatCpf` (`shared/utils/formatCpf.ts`).
- **Senha**: sem validação no front além da barra de força visual. Regras finais vêm da API.
- **Tipo de agente bloqueado**: disparado quando `access.tipo_agente !== ALLOWED_AGENT_TYPE` → modal "Acesso nao permitido", botão "Entendi" chama `resetFlow()`.

## Helpers consumidos

- `formatCpf` (`src/shared/utils/formatCpf.ts`) — máscara.
- `getErrorMessage` (`src/shared/utils/getErrorMessage.ts`) — extrai `message` de erro do axios ou usa fallback.

## Buscas comuns

- "Não avança do CPF" → checar `isCpfComplete` (`LoginScreen.tsx:41`) e o `useEffect` em `:87-92`.
- "Não mostra erro" → `errorMessage` é resetado em `resetFlow` (`:54-60`) e em `onChangeText` (`:215`).
- "Modal não fecha" → handlers em `:148-151` (`AccessBlockedModal onClose`, block) e `:156-161` (`PasswordDefinedModal onConfirm`, senha definida).
- "Login OK mas não entra" → `signIn` em `AuthContext.tsx:54-59` precisa setar sessão; conferir `setApiAccessToken`.
- "Adicionar nova etapa" → adicionar em `step` (union type), novo bloco em `submit`, novo `title`/`description` no ternário em `:131-136`.
