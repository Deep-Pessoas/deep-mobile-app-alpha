# Formulário Dinâmico (preenchimento offline)

Tela: `FillRecordScreen`. Acessada por `RecordsFlow` ao tocar em "Preencher/Continuar".

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `src/features/fill-record/screens/FillRecordScreen.tsx` | Wrapper fino: carrega `FillRecordData` (`getFillRecordData`) e mostra loading/erro; delega render ao `DynamicForm` |
| `src/features/fill-record/components/DynamicForm.tsx` | Componente principal do formulário: tabs, BackHandler, prompt de rascunho, `submit`, render dos campos |
| `src/features/fill-record/hooks/useDraftAutosave.ts` | Hook que centraliza autosave (debounce 500ms), save no unmount e `startFresh` (recomeçar rascunho) |
| `src/features/fill-record/utils/findFieldLabel.ts` | Busca recursiva do `label` de um campo pelo `id` (inclui `group.children`) |
| `src/features/fill-record/components/DynamicFieldRenderer.tsx` | Switch por `field.type` → componente do campo |
| `src/features/fill-record/components/FillRecordTabs.tsx` | Tabs `form` / `record` / `actions` |
| `src/features/fill-record/components/RecordDataTab.tsx` | Lista `key/value` do `record.rawData` (filtra chaves terminadas em `id`/`guid`) |
| `src/features/fill-record/components/SelectionSheet.tsx` | Bottom-sheet único compartilhado para `SelectField` |
| `src/features/fill-record/components/fields/FieldContainer.tsx` | Label + helper + error padronizados |
| `src/features/fill-record/hooks/useDynamicForm.ts` | Estado de valores, validação, coleta, draft data |
| `src/features/fill-record/engine/formEngine.ts` | Regras puras: visibilidade, valores efetivos, validação, coleta, draft |
| `src/features/fill-record/engine/valueValidation.ts` | Detecção/formatação de CPF/CNPJ/telefone/CEP + `isValidCpf` |
| `src/features/fill-record/services/fillRecordService.ts` | I/O: `getFillRecordData`, `saveFillRecordDraft`, `clearFillRecordDraft` |
| `src/features/fill-record/services/draftFileService.ts` | Copia/exclui arquivos físicos do rascunho |
| `src/features/fill-record/types/form.ts` | Tipos: `DynamicField`, `OfflineDynamicForm`, `FormValue`, `FillRecordLocalStatus` |
| `src/features/fill-record/vendor/json-logic.js` | Engine JSONLogic (legado) usado para condições |

## Modelo de campo

```ts
DynamicField = {
  id: string;
  type: string;        // 'text' | 'number' | 'datetime' | 'textarea' | 'select' |
                       // 'radio' | 'checkbox' | 'title' | 'divider' |
                       // 'group' | 'mult_capturas' | 'signature' | 'upload'
  visibility?: boolean;
  config: {
    label?, name?, placeholder?, required?, defaultValue?, description?,
    conditions?: LegacyConditions,    // visibility rules
    options?: {label,value}[],
    maxSelect?, maxFiles?, fileType?, rows?, titleText?,
    capturas?: {id,label}[],
    dateType?: 'date'|'datetime'|'time',
    children?: DynamicField[],        // para 'group'
  };
}
```

`NON_VALUE_FIELDS = {'divider', 'group', 'title'}` (`formEngine.ts:11`). Esses tipos não acumulam valor; só `group` desce recursivamente para `children`.

## Engine (`formEngine.ts`) — funções públicas

| Função | O que faz | Onde é usada |
|---|---|---|
| `isFieldVisible(field, values, parentVisible)` | Avalia `conditions` (JSONLogic) + `visibility` + herança do parent | `DynamicFieldRenderer`, `validateVisibleRequiredFields`, `collectVisibleFormValues`, `getEffectiveValues` |
| `getEffectiveValues(fields, values)` | Itera até estabilizar: para cada campo invisível zera o valor com `emptyForField` | `DynamicFieldRenderer` (passado para `isFieldVisible` na avaliação de filhos) |
| `getInitialFormValues(fields)` | Cria `FormValues` com defaults (arrays para `checkbox`/`mult_capturas`/`upload`, vazio para outros) | `useDynamicForm`, `reset` |
| `validateVisibleRequiredFields(fields, values)` | Erros: required vazio, mult_capturas incompleta, CPF inválido | `useDynamicForm.validate` |
| `collectVisibleFormValues(fields, values)` | Somente campos visíveis com valor | `useDynamicForm.collectValues` (envio) |
| `createOfflineDraftData(fields, values)` | Igual ao collect, mas normaliza `upload` para nome de arquivo | `useDynamicForm.createDraftData` (rascunho) |

### Condições legadas → JSONLogic

`conditionToJsonLogic` (`formEngine.ts:19-45`):
- `contains` / `notContains` → `in: [esperado, var]`
- `equals` / `notEquals` → `==` / `!=`
- `isEmpty` / `isNotEmpty` → `!!` / `!{!!}`
- `tipo='OR'` envolve em `{or: [...]}`; padrão é `{and: [...]}`.
- `action='hide'` inverte o resultado; padrão é `show`.

> O JSONLogic é um bundle vendorizado em `src/features/fill-record/vendor/json-logic.js`. Não atualizar do npm — é fork interno.

## Hook `useDynamicForm`

- Estado: `values`, `errors`, `isDirty`.
- `setValue`: limpa erro do próprio campo automaticamente.
- `validate`: retorna `true` se válido, popula `errors`.
- `createDraftData` / `collectValues`: funções puras via engine.
- `reset(nextDraftValues)`: volta ao estado inicial mesclado com `nextDraftValues`.

## Tela (`FillRecordScreen` + `DynamicForm`)

1. `FillRecordScreen.tsx` (49 linhas): chama `getFillRecordData(database, recordGuid)` → `FillRecordData` ou `null`.
   - Lê `offline_records` + `offline_forms` (principal: `ORDER BY is_main DESC, rowid LIMIT 1`) + `offline_form_drafts`.
   - Extrai `campos` do `form.raw_json` (formato `{ json: string | { campos: [] } }`).
   - Mostra `ActivityIndicator` enquanto carrega, mensagem de erro se `null`, ou `<DynamicForm data={...} />` quando pronto.
2. `DynamicForm.tsx` (componente principal):
   - `useEffect` na montagem (`:69-82`), se `data.hasDraft`: abre `AlertModal` "Rascunho encontrado" (Continuar/Recomeçar).
   - Recomeçar (`onCancel`) chama `startFresh()` (de `useDraftAutosave`).
   - `submit` (`:84-120`): valida via `findFieldLabel` para listar campos faltantes; se passar, marca `localStatus='Preenchendo offline'` via `persistDraft` e mostra alert com total de respostas.
   - BackHandler (`:60-67`): `onBack` no botão físico de voltar (Android).
3. `useDraftAutosave.ts` (hook, 136 linhas) — toda a persistência do rascunho:
   - Autosave com debounce 500ms (`:122-133`), disparado por `changeVersion`/`isDirty`/`draftPromptHandled`.
   - `persistDraft(state, dados, status, savedVersion?)` (`:68-81`) salva via `saveFillRecordDraft` e atualiza `saveState`.
   - Cleanup no unmount (`:83-94`): se houver mudanças pendentes, salva antes de desmontar.
   - `startFresh` (`:96-115`): apaga arquivos de `form-drafts/{recordGuid}/{formGuid}` (via `Directory`/`Paths` do `expo-file-system`), chama `clearFillRecordDraft` e `reset()`.
4. Tabs (`form` / `record` / `actions`): `actions` é placeholder (View vazia).
5. `AlertModal` é o único modal; usado também para erros de validação e confirmação de salvamento.

## Validação por tipo

- `text` / `number` / `textarea`: usa `valueValidation` para detectar CPF/CNPJ/telefone/CEP pelo `name`/`label`; aplica máscara no `onChangeText` e valida CPF no `onBlur` (`TextField.tsx`).
- `number` é apenas um wrapper de `TextField` com `keyboardType='numeric'`.
- `datetime` usa `@react-native-community/datetimepicker`. Suporta `date`/`time`/`datetime` (este em 2 passos no Android).
- `select` → abre `SelectionSheet` (bottom-sheet com busca). Single-select; "Limpar seleção" se não-required.
- `radio` / `checkbox` → `ChoiceField` com `multiple` controlado.
- `group` → renderiza recursivamente em card.
- `mult_capturas` → cada captura pede permissão de localização e grava `{ id, label, latitude, longitude }` (validação exige `capturas.length` completas).
- `signature` → `PanResponder` + `react-native-svg`; serializa como path SVG (`M x y L x y ...`).
- `upload` → arquivos em `form-drafts/{record}/{form}/{field}`; aceita imagem (câmera/galeria) ou documento (PDF/all). Limite 10MB/arquivo. `maxFiles` define quantidade.

## Persistência de rascunho

- Tabela: `offline_form_drafts` (PK composta `record_guid+form_guid`).
- Colunas: `values_json`, `state_json`, `dados_json`, `status`, `updated_at`, `updated_at_ms`.
- Versão: contador monotonicamente crescente em `lastDraftVersion` (`fillRecordService.ts:20-25`).
- `ON CONFLICT … WHERE excluded.updated_at_ms >= offline_form_drafts.updated_at_ms` — **evita salvar versão antiga** (importante no auto-save com debounce).
- `status`: `'Rascunho'` (default ao editar) ou `'Preenchendo offline'` (após "Concluir").

## `SelectionSheet`

Provider único por tela. `useSelectionSheet()` retorna `{ openSelection }`. `SelectField` é o único consumidor atual.

## Buscas comuns

- "Campo não aparece" → conferir `visibility` e `conditions` no JSON. Testar `isFieldVisible` isolado.
- "Validação não dispara" → `validateVisibleRequiredFields` só vê campos visíveis; conferir `getEffectiveValues`.
- "Auto-save não salva" → `isDirty` precisa virar `true`; `setValue` faz isso. Mas se `draftPromptHandled=false`, o auto-save é bloqueado.
- "Rascunho aparece duas vezes" → conferir PK em `offline_form_drafts`; chave é `record_guid+form_guid`.
- "CPF aceita inválido" → `isValidCpf` está em `valueValidation.ts:38-51`. Máscara só formata, validação só no `onBlur` do `TextField`.
- "Adicionar novo tipo de campo" → registrar no switch de `DynamicFieldRenderer`; criar arquivo em `components/fields/`; tipar em `form.ts` se for `FormValue` novo; ajustar `NON_VALUE_FIELDS` se estrutural; ajustar `getInitialFormValues` e `validateVisibleRequiredFields` se aplicável.
