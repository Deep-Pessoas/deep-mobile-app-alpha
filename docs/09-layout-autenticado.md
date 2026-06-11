# Layout Autenticado (Header + Drawer)

Arquivo: `src/shared/components/AuthenticatedLayout.tsx`

Wrapper aplicado em **toda tela após login** (ver `AppNavigator.tsx:43-45`). Gerencia header, drawer e roteamento interno entre `home` / `overview` / `records`.

## Estado interno

| Nome | Função |
|---|---|
| `currentScreen` | `'home' \| 'overview' \| 'records'` — controle do conteúdo renderizado |
| `pageTitle` | Texto exibido no header (pode ser sobrescrito por filhos, ex.: `RecordsFlow` chama `onTitleChange`) |
| `isMenuOpen` | Drawer lateral visível |
| `menuTranslate`, `overlayOpacity` | Animações do drawer (slide-in da esquerda + fade do overlay) |

`AppScreen = 'home' | 'overview' | 'records'` exportado.

## Header (linha superior)

- Botão "Abrir menu" (esquerda): `MenuIcon` em `bg-primary-500` quadrado 12×12.
- Centro: nome do agente (linha 1) + tipo (linha 2).
- Direita: `pageTitle` em `text-primary-600`.

`onTitleChange` é exposto via `currentScreen === 'records'` para que `RecordsFlow` altere o título quando entra no `FillRecordScreen` ("Preencher registro" vs "Registros").

## Drawer (menu lateral)

- Largura: `Math.min(width * 0.88, 360)`.
- Animações em `useNativeDriver: true` (transform + opacity).
- Estrutura: header (logo + botão fechar) → card do agente (avatar com iniciais + nome + tipo) → lista de `MenuItem` (Inicio, Registros, Visão geral) → rodapé com "Sair deste aparelho" (`signOut`).
- Fecha por: overlay preto, botão X, ou seleção de item (`closeMenu` é chamado por `navigateTo`).
- Para fechar via gesture de "voltar" do Android: `onRequestClose` (animação reverte).

## Conteúdo (renderização condicional)

```tsx
<View className="flex-1 overflow-hidden rounded-t-3xl bg-primary-50">
  {currentScreen === 'home' && children}      // children é o <HomeScreen> passado pelo AppNavigator
  {currentScreen === 'overview' && <OverviewScreen />}
  <View className={`flex-1 ${currentScreen === 'records' ? '' : 'hidden'}`}>
    <RecordsFlow active={...} onTitleChange={...} />
  </View>
</View>
```

- `home` recebe `children` (mantido pelo `AppNavigator` para permitir tela custom).
- `overview` e `records` são auto-suficientes.
- `records` usa `hidden` (não desmonta) para preservar estado/posição de scroll entre navegações.

## Avatar (iniciais)

```ts
session.agent.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
```

Pode dar `"M"` para "Maria", `"MS"` para "Maria Silva". Para `"José da Silva"` vira `"JD"`.

## Componentes auxiliares

- `MenuIcon` (`src/shared/components/MenuIcon.tsx`): três linhas horizontais (hamburger) com variante `dark` para o botão de fechar dentro do drawer.
- `MenuItem` (`src/shared/components/MenuItem.tsx`): linha com quadrado + símbolo (1 letra) + label. `active` muda fundo para `bg-primary-500`.

## Navegação para RecordsFlow

- `RecordsFlow` aceita `active` para suspender queries fora de foco (boas práticas: hooks com `enabled: active`).
- `onTitleChange` é callback estável (`useCallback([])` em `AuthenticatedLayout:81`) — não dispara re-render do `RecordsFlow` por mudança de identidade.

## Buscas comuns

- "Drawer não fecha" → `onRequestClose` ou overlay. Se nem a animação roda, conferir `menuTranslate`/`overlayOpacity` refs.
- "Título do header não muda ao abrir registro" → `onTitleChange` só é chamado quando `active` muda; ver `RecordsFlow.tsx:18-21`.
- "Item de menu fica marcado errado" → `active` em `MenuItem` é `currentScreen === '<screen>'`.
- "Sair não funciona" → `signOut` em `AuthContext.tsx:60-65` precisa estar disponível; o `useAuth()` é chamado no `AuthenticatedLayout`.
