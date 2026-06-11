# Build, Configuração e Ambiente

## Variáveis de ambiente

Lidas em `src/shared/config/env.ts` via `expo-constants.extra`:

```ts
const apiUrl = Constants.expoConfig?.extra?.apiUrl;
if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
  throw new Error('API_URL nao foi configurada no arquivo .env.');
}
```

Configurar `.env`:
```
API_URL=https://sua.api
```

> O `.env` é lido por `app.config.ts` (e `eas.json` para builds) e exposto em `expoConfig.extra`. **Falha de inicialização** se ausente — o app nem abre.

## Scripts (`package.json`)

| Script | Função |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` | Build + run nativo Android |
| `npm run typecheck` | `tsc --noEmit` (rode antes de PR) |
| `npm run build:apk` | EAS build remoto, perfil `apk` |
| `npm run build:apk:eas` | Idem (alias) |
| `npm run build:apk:local` | `expo prebuild` + `gradlew.bat assembleRelease` |

## EAS (`eas.json`)

- Perfil `apk` deve estar configurado em `eas.json` (não lido nesta documentação — abra o arquivo).
- `notificationService` exige `easConfig.projectId` (lê de `expo-constants`).

## Provider tree (`App.tsx`)

```
SafeAreaProvider
└─ SQLiteProvider (databaseName="deep-agente.db", onInit=migrateDatabase)
   └─ QueryClientProvider (queryClient)
      └─ AuthProvider
         └─ NavigationContainer
            └─ AppNavigator
```

Ordem importa: SQLite precisa estar pronto antes do `AuthContext` (que chama `useSQLiteContext`). Query client é independente — atualmente **não está sendo usado** por nenhuma tela (débitos conhecidos).

## Estilização

- **NativeWind** (Tailwind no React Native) — `nativewind`, `tailwindcss`.
- Classes utilitárias em quase todos os componentes. Paleta padrão:
  - `primary-500`, `primary-600` (laranja) — cor de marca
  - `zinc-*` — neutros
  - `green-*`, `red-*`, `amber-*` — feedback
- Tokens em `tailwind.config.js` (não documentados em detalhe; abrir arquivo para valores).

## Stack e libs principais

- **React 19.2.3 / React Native 0.85.3 / Expo ~56.0.9**.
- **React Navigation 7** (`@react-navigation/native-stack`).
- **TanStack Query 5** (configurado, vide débitos).
- **Axios** (HTTP).
- **expo-sqlite** (DB local).
- **expo-file-system** (rascunhos de upload).
- **expo-image-picker**, **expo-document-picker** (upload).
- **expo-location** (mult_capturas).
- **expo-notifications** (push, vide débitos).
- **@react-native-community/datetimepicker**.
- **react-native-svg** (signature, ícones).

> **Regra Expo v56**: leia `docs/AGENTS.md` antes de usar APIs de Expo novas. Algumas APIs mudaram de import path/forma.

## Pontos de atenção

- **Expo Go**: push notifications não funcionam (`notificationService.ts:6-8`). É necessário **development build** (`eas build` ou `expo prebuild`).
- **Build local Android**: o script `build:apk:local` faz prebuild e tenta `cd android && gradlew.bat assembleRelease` (assume Windows; em outros SOs trocar pelo script do Gradle).
- **Hot reload**: `npm start`; limpar cache com `expo start -c` se algo estiver estranho.
- **Typecheck**: a única validação estática. Não há ESLint/Prettier configurado neste projeto.

## Buscas comuns

- "App não abre" → `API_URL` não configurada; veja erro de inicialização.
- "Build local falha" → rodar `expo prebuild --clean` e revisar `eas.json` / `gradle.properties`.
- "Push não funciona" → não está em Expo Go; precisa de dev build.
- "Tela branca" → provavelmente problema de provider (ordem em `App.tsx`); conferir console.
