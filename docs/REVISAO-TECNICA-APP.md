# Revisão Técnica — Deep Agente Alpha (app mobile)

> Auditoria de código focada em **erros, crashes, travamentos, perda de dados, lógica errada e otimização**, com ênfase no eixo de **alto volume** do app: preenchimento de formulários e atividades do agente (monitoramento/sincronização).
>
> **Escopo:** leitura integral de `src/` (103 arquivos TS/TSX, ~10,1k linhas) + configuração (`App.tsx`, `app.json`, `app.config.ts`, migrações de banco).
> **Data:** 2026-06-16 · **Plataforma:** Android (Expo SDK 56, React Native 0.85, React 19) · **Persistência:** SQLite (expo-sqlite, WAL) · **Rede:** axios + react-query.
> **Importante:** a revisão original era somente análise. **As correções foram implementadas em 2026-06-16** — ver [Status de implementação](#status-de-implementação) e o [Anexo A](#anexo-a--proposta-de-endpoint-multipartform-data-para-a-api) com a proposta de endpoint para a API.

---

## Sumário executivo

A base é, no geral, **bem arquitetada e defensiva**: há `ErrorBoundary`, handler global de erros, captura de crash em disco, FTS5 para busca, paginação keyset, autosave de rascunho com versionamento monotônico, deduplicação por `client_id` nas atividades e tratamento "tudo-ou-nada" no envio. O time claramente já apanhou de várias situações e deixou comentários explicando decisões.

Porém, no caminho de **alto volume de mídia** (o que mais importa aqui) existem **riscos reais de crash e travamento** que se manifestam justamente quando o agente trabalha pesado: muitos formulários com muitas fotos/assinaturas, e longos períodos offline. Os pontos mais graves:

1. **OOM no envio** — todas as imagens de um preenchimento são convertidas para base64 e mantidas em memória de uma vez (§H1).
2. **"Concluir" pode travar para sempre** — captura de GPS sem timeout no fim do preenchimento (§H2).
3. **Duplo toque em "Concluir"** sem trava de reentrância (§H3).
4. **Crash nativo do FTS5 no logout/reset** — `DELETE` sem suspender triggers (§H4).
5. **Migração de banco pode "tijolar" o app** no cold start se falhar no meio (§H5).

A seção [Plano de ação priorizado](#plano-de-ação-priorizado) no fim resume a ordem recomendada.

---

## Status de implementação

> Atualizado em **2026-06-16** — correções aplicadas no app (lado cliente) e validadas com `npm run typecheck`.

**Aplicado ✅:** H2, H3, H4, H5, M1, M2, M3, M4, M5, M6, M8 e L7 (mensagens de erro mais precisas, reauth enviando `device_id`, comentário do tracker corrigido, guard de unmount no carregamento do formulário).

**Aplicado parcialmente ⚠️:**
- **H1** — trava de segurança contra OOM no cliente (`MAX_TOTAL_UPLOAD_BYTES = 35 MB` em `syncService.ts`): converte o crash em uma falha tratada (mantém o rascunho). A correção **definitiva** depende do endpoint **multipart/form-data** na API — ver [Anexo A](#anexo-a--proposta-de-endpoint-multipartform-data-para-a-api).
- **M7** — as strings de fio (`rastreiamento`, `/agente-ativdades-mobile`) foram **mantidas** por serem contrato com o backend; apenas documentadas no código. Corrigir a grafia exige mudança coordenada nos dois lados.

**Adiado (com justificativa) ⏭️:**
- **L1** (O(N²) em forms grandes) — aceitável hoje; só compensa otimizar se os formulários crescerem muito.
- **L2** (assinatura → arquivo) — refactor que toca o armazenamento da assinatura + envio + regra tudo-ou-nada; melhor fazer junto com o multipart (Anexo A).
- **L3** (download paginado) — depende de paginação na API.
- **L4** (cancelar sync/preparação) — feature de UI (AbortController) a planejar.
- **L5** (token no SecureStore) — exige nova dependência (`expo-secure-store`) e migração do storage de sessão.
- **L6** (rastrear promise rejection) — **não aplicado de propósito:** gravaria rejeições não-fatais no mesmo arquivo de crash, fazendo o aviso "o app fechou inesperadamente" aparecer para erros que não fecharam o app. Melhor tratar com um canal de log separado.

---

## Legenda de severidade

| Nível | Significado |
|------|-------------|
| 🔴 **ALTA** | Crash, travamento indefinido, OOM, perda de dados ou app que não abre. Corrigir antes de subir volume. |
| 🟠 **MÉDIA** | Lógica incorreta, dados saindo errados, UX quebrada, defasagem de estado. |
| 🟡 **BAIXA** | Robustez, performance em escala, manutenção, segurança em profundidade. |

---

## Índice rápido de achados

| # | Sev | Área | Achado |
|---|-----|------|--------|
| H1 | 🔴 | Sync | OOM: todas as imagens em base64 na memória no envio |
| H2 | 🔴 | Form/Localização | `getCurrentCoordinates` sem timeout trava "Concluir" |
| H3 | 🔴 | Form | "Concluir" sem trava anti-duplo-clique |
| H4 | 🔴 | Banco/FTS | `clearAllOfflineData` deleta registros sem suspender triggers FTS (crash nativo) |
| H5 | 🔴 | Migração | Migração não-transacional + `ADD COLUMN` não-reentrante pode impedir o app de abrir |
| M1 | 🟠 | Form | `parseFields` sem try/catch (schema malformado) |
| M2 | 🟠 | Form | `saveSituacaoDeCampo` usa INSERT cru (viola PK em retry) |
| M3 | 🟠 | Dashboards | Home/Overview ficam defasados (sem refetch on focus) |
| M4 | 🟠 | Form/Data | DateTimeField grava fuso inconsistente (UTC vs local) |
| M5 | 🟠 | Atividades | `IN (...)` com todos os ids + POST com timeout de 15s (escala offline) |
| M6 | 🟠 | Upload | Arquivos órfãos quando seleção > limite; filtro de 10 MB ignora `fileSize` ausente |
| M7 | 🟠 | Contrato | Typos `rastreiamento` e `/agente-ativdades-mobile` viram contrato com backend |
| M8 | 🟠 | Produção | `Alert.alert('Debug push token')` deixado no login |
| L1 | 🟡 | Perf | `getEffectiveValues` é O(N²) em forms grandes |
| L2 | 🟡 | Perf | Assinatura base64 inline re-serializada a cada autosave |
| L3 | 🟡 | Memória | Download consolidado carrega tudo em memória |
| L4 | 🟡 | UX | Sem cancelamento de sync/preparação longos |
| L5 | 🟡 | Segurança | Token de sessão em texto puro no SQLite |
| L6 | 🟡 | Diagnóstico | Promise rejection tracker declarado mas nunca ativado |
| L7 | 🟡 | Diversos | Itens menores (erros mascarados, DRY, maxSelect, reauth sem device_id, etc.) |

---

## 🔴 Achados de severidade ALTA

### H1 — OOM: todas as imagens de um preenchimento viram base64 na memória ao sincronizar
**Arquivo:** [`src/features/sync/services/syncService.ts:100`](src/features/sync/services/syncService.ts) (`buildUploads`, laço de base64 nas linhas 115–122) e payload em 278–295.

O envio lê cada arquivo de campo `upload` com `new File(uri).base64()` e **acumula todas as strings base64** no array `uploads`. Esse array inteiro entra no `payload`, que o axios serializa em **uma única string JSON** para o POST. A assinatura (§L2) e a foto de situação de campo (linhas 260–268) também entram em base64 no mesmo corpo.

Por que é crítico aqui: este é exatamente o cenário de "alto volume" descrito. O próprio comentário do código admite "várias imagens por preenchimento" e o `MAX_FILE_SIZE` por arquivo é **10 MB**. Base64 infla ~33%. Um preenchimento com, digamos, 15–30 fotos pode somar **dezenas a >100 MB** mantidos simultaneamente em memória — e ainda **duplicados** quando o axios serializa o corpo. Em aparelho Android de campo (entrada/intermediário), isso é um **OOM/crash** clássico. O comentário "lidos um de cada vez (sequencial) para evitar picos de memória" **não resolve**: a leitura é sequencial, mas **tudo permanece retido** para o único POST.

Direção sugerida (sem implementar aqui): trocar base64-em-JSON por **multipart/form-data** com streaming a partir do `uri` (sem carregar em JS), ou enviar **um arquivo por requisição** liberando memória entre eles, ou ao menos impor um teto agregado por preenchimento e comprimir/reduzir resolução antes de persistir. Esta é a mudança de maior impacto do documento.

---

### H2 — `getCurrentCoordinates` sem timeout: "Concluir" pode travar indefinidamente
**Arquivos:** [`src/features/form-fill/services/locationService.ts:27`](src/features/form-fill/services/locationService.ts) · usado em [`DynamicForm.tsx:151`](src/features/form-fill/components/DynamicForm.tsx) e [`SituacaoDeCampoFlow.tsx:87`](src/features/form-fill/components/SituacaoDeCampoFlow.tsx).

```
const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
```

Diferente de `getTrackingCoordinates`/`getTrackingFix`, que usam `withTimeout(...)`, esta função **não tem timeout**. `Accuracy.High` em ambiente fechado, túnel, prédio ou com GPS frio pode demorar dezenas de segundos **ou nunca resolver**. Como a conclusão do preenchimento e o salvar da situação de campo **aguardam** essa promise:

- No formulário (`DynamicForm.submit`), o botão "Concluir" **não tem indicador de carregamento nem fica desabilitado** durante a espera → app parece "travado".
- Na situação de campo, o spinner `saving` gira **para sempre** sem nunca concluir nem dar erro.
- O mesmo padrão sem timeout aparece em [`MultiCaptureField.tsx:46`](src/features/form-fill/components/fields/MultiCaptureField.tsx) (a captura fica presa e, por causa do guard `if (busyId) return`, **bloqueia as demais capturas**).

Direção: aplicar o mesmo `withTimeout` já existente (com fallback para `getLastKnownPositionAsync`) e, na falha, mostrar o alerta de "localização necessária" — que já existe no código, mas hoje pode nunca ser alcançado.

---

### H3 — "Concluir preenchimento offline" sem trava de reentrância (duplo-submit)
**Arquivo:** [`DynamicForm.tsx:267`](src/features/form-fill/components/DynamicForm.tsx) (botão) e `submit` em 130–203.

O `Pressable` de concluir **não tem `disabled` nem flag de "enviando"**. Combinado com §H2 (a espera de GPS pode ser longa), o usuário tende a tocar várias vezes. Cada toque dispara `submit` de novo → múltiplos `getCurrentCoordinates`, múltiplos `persistDraft` e **múltiplos `logRecordClose`** (eventos de "encerramento" duplicados na fila de atividades), além de possível empilhamento de `AlertModal`. O UPSERT de rascunho com base dedup o salvamento, mas os **eventos de atividade duplicados** poluem o monitoramento e o duplo GPS agrava o travamento.

Observação: o fluxo de Situação de Campo **faz certo** (`disabled={saving}` em [`SituacaoDeCampoFlow.tsx:166`](src/features/form-fill/components/SituacaoDeCampoFlow.tsx)). O formulário principal deveria seguir o mesmo padrão (estado `isSubmitting` + `disabled`).

---

### H4 — Crash nativo do FTS5 no logout/reset: `DELETE` sem suspender triggers
**Arquivo:** [`offlineQueries.ts:244`](src/features/consolidated-data/services/offlineQueries.ts) (`clearAllOfflineData`, `DELETE FROM offline_records` na linha 247).

O próprio código de **ingestão** já documenta e protege esse risco. Veja o comentário em [`offlineSync.ts:54`](src/features/consolidated-data/services/offlineSync.ts):

> "…o `DELETE FROM offline_records` dispara o trigger de delete do FTS linha a linha sobre o índice externo; se o índice estiver inconsistente (ex.: troca de um dataset com base para sem base), o FTS5 levanta **um erro nativo que o try/catch do JS não captura e que ENCERRA o app**."

Por isso `saveRecords` e `saveBaselessRecord` chamam `suspendRecordsSearchIndex` antes e `rebuildRecordsSearchIndex` depois. **Mas `clearAllOfflineData` não faz isso** — apaga `offline_records` com os triggers ativos. E ele é chamado nos caminhos mais comuns:
- `AuthContext.signOut` ([`AuthContext.tsx:82`](src/features/auth/context/AuthContext.tsx))
- "Resetar tudo" e "Recarregar dados" ([`OverviewScreen.tsx:119` e `:135`](src/features/overview/screens/OverviewScreen.tsx))
- "Sair da equipe" ([`TeamScreen.tsx:53`](src/features/team/screens/TeamScreen.tsx))
- "Ingressar na equipe" ([`JoinTeamScreen.tsx:47`](src/features/auth/screens/JoinTeamScreen.tsx))

Ou seja: se o índice FTS estiver inconsistente (cenário que o próprio time mapeou como possível), o **logout/reset fecha o app** — e o `try/catch` em volta **não protege**, porque o erro é nativo. Direção: aplicar em `clearAllOfflineData` o mesmo suspender/reconstruir triggers usado na ingestão (ou usar `withExclusiveTransactionAsync` com triggers suspensos).

---

### H5 — Migração de banco não-transacional + `ADD COLUMN` não-reentrante
**Arquivo:** [`migrations.ts:36`](src/shared/database/migrations.ts) (ex.: `ALTER TABLE ... ADD COLUMN` nas linhas 260–264, 283, 298–300, 345–346).

`migrateDatabase` é o `onInit` do `SQLiteProvider`. Ele roda os passos **fora de uma transação** e só grava `PRAGMA user_version` no fim (linha 400). Se uma migração falhar **no meio** (app morto pelo SO, erro de I/O, etc.) depois de já ter aplicado algum `ALTER TABLE ADD COLUMN`, o `user_version` **não avança**. No próximo boot, a migração **re-executa do mesmo ponto** e o `ADD COLUMN` falha (SQLite não suporta `ADD COLUMN IF NOT EXISTS`) → `onInit` lança → **o app não abre** (loop de crash no cold start, sem tela de login).

Probabilidade baixa, mas **impacto total** (aparelho inutilizável até "limpar dados"/reinstalar, o que apaga rascunhos pendentes — perda de trabalho de campo). Direção: envolver cada passo de versão em transação e/ou tornar os `ADD COLUMN` idempotentes (checar `PRAGMA table_info` antes), garantindo que `user_version` só avance junto com o schema.

---

## 🟠 Achados de severidade MÉDIA

### M1 — `parseFields` sem try/catch
**Arquivo:** [`fillRecordService.ts:129`](src/features/form-fill/services/fillRecordService.ts) (também usado em `syncService.ts:246`).

Faz `JSON.parse(rawJson)` e, possivelmente, um segundo `JSON.parse(form.json)` **sem proteção**. As funções irmãs `parseDraftValues` e `parseRecordData` têm try/catch; esta não. Um schema de formulário malformado (vindo do backend) faz `getFillRecordData` rejeitar. No `FillRecordScreen` há um `.catch` que mostra mensagem genérica (não crasha), mas no `syncDraft` vira falha do item. Recomenda-se padronizar com try/catch e mensagem específica ("formulário corrompido").

### M2 — `saveSituacaoDeCampo` usa INSERT cru (não UPSERT)
**Arquivo:** [`fillRecordService.ts:298`](src/features/form-fill/services/fillRecordService.ts).

Enquanto `saveFillRecordDraft` usa `INSERT ... ON CONFLICT(id) DO UPDATE`, esta função faz `INSERT` puro. Hoje o `draftId` é um uuid novo por montagem + guard `saving`, então raramente colide; mas qualquer reentrada com o mesmo `draftId` viola a PRIMARY KEY e lança. É um ponto frágil — preferível UPSERT por consistência.

### M3 — Dashboards Home e Overview ficam defasados
**Arquivos:** [`HomeScreen.tsx:111`](src/features/home/screens/HomeScreen.tsx) (react-query `staleTime: 0`, só refaz no mount) · [`OverviewScreen.tsx:90`](src/features/overview/screens/OverviewScreen.tsx) (`useEffect([load])` no mount).

A navegação usa `navigate` ([`navigationState.ts:58`](src/navigation/navigationState.ts)), que **não remonta** telas já existentes no stack. Nem Home nem Overview usam `useFocusEffect`/refetch ao reganhar foco. Resultado: depois de **preencher** (que muda `pendingSync`, `available`, etc.) ou **sincronizar**, voltar para a Home mostra **números velhos** até reabrir o app. A tela de Sync faz o correto com `useFocusEffect` ([`SyncScreen.tsx:93`](src/features/sync/screens/SyncScreen.tsx)) — Home/Overview deveriam fazer igual.

### M4 — DateTimeField grava fuso horário inconsistente
**Arquivo:** [`DateTimeField.tsx:27`](src/features/form-fill/components/fields/DateTimeField.tsx) (`formatValue`).

`type === 'datetime'` usa `date.toISOString().slice(0,16)` → **UTC**; `type === 'time'` usa `date.toTimeString().slice(0,5)` → **local**. Em UTC−3 (Brasil), um datetime escolhido como 14:00 é gravado como `17:00Z`, e datas em borda de meia-noite podem **deslocar 1 dia** no round-trip (`parseValue(new Date("YYYY-MM-DD"))` interpreta como UTC). Para um app que captura **dados temporais de campo**, isso gera horários/datas com fuso errado no envio. Recomenda-se padronizar: formatar sempre em horário local (ou sempre em UTC com offset explícito), de forma consistente entre `parseValue`/`formatValue`.

### M5 — Fila de atividades: `IN (...)` com todos os ids + POST com timeout default
**Arquivos:** [`activityRepository.ts:65`](src/features/activity-tracking/services/activityRepository.ts) (`deleteActivities`) · [`activitySync.ts:36`](src/features/activity-tracking/services/activitySync.ts) (`flushActivities`).

O `deleteActivities` monta `DELETE ... WHERE id IN (?,?,…)` com **todos** os ids da leitura. Após um período longo offline (muitas aberturas/encerramentos de registro), o número de linhas pode passar do limite de variáveis do SQLite (`SQLITE_MAX_VARIABLE_NUMBER`) → o DELETE lança, é **engolido** pelo try/catch do flush, as linhas não são apagadas e tudo é **reenviado** no próximo flush (o servidor dedup por `client_id`, mas pode virar loop de reenvio). Além disso, `flushActivities` usa o **timeout default de 15 s** do `apiClient` (não os 300 s do sync) e envia tudo num POST — payload grande pode estourar. Direção: apagar em lotes e/ou paginar o envio.

### M6 — Upload: arquivos órfãos e filtro de 10 MB falho
**Arquivo:** [`UploadField.tsx:115`](src/features/form-fill/components/fields/UploadField.tsx).

- `openGallery` (e `openDocument`) persistem **todas** as imagens selecionadas via `persistDraftFiles`, mas só `slice(0, remainingFiles)` entra no valor (linha 97). As excedentes ficam **órfãs no disco** do rascunho (vazamento de armazenamento, copia desnecessária).
- O filtro de tamanho `!asset.fileSize || asset.fileSize <= MAX_FILE_SIZE` **deixa passar** arquivos com `fileSize` indefinido — comum em fotos de câmera no Android — burlando o limite de 10 MB e alimentando o problema de memória do §H1.

### M7 — Typos viram contrato com o backend
**Arquivos:** `tipo: 'rastreiamento'` em [`activityRepository.ts:8`](src/features/activity-tracking/services/activityRepository.ts) / [`useLocationTracking.ts:54`](src/features/activity-tracking/hooks/useLocationTracking.ts); endpoint `'/agente-ativdades-mobile'` em [`activitySync.ts:53`](src/features/activity-tracking/services/activitySync.ts).

"rastreiamento" (deveria ser *rastreamento*) e "ativdades" (deveria ser *atividades*) são erros de digitação **enviados ao servidor**. Se o backend espera a grafia correta, o tipo de atividade e/ou a rota não casam (atividades nunca sincronizam = 404). A memória do projeto registra a rota com o typo como contrato acordado — então pode ser intencional, mas **vale confirmar explicitamente** com o backend, pois é o tipo de coisa que silenciosamente quebra o monitoramento.

### M8 — Código de debug deixado no login de produção
**Arquivo:** [`LoginScreen.tsx:119`](src/features/auth/screens/LoginScreen.tsx).

```
Alert.alert('Debug push token', getErrorMessage(pushError, 'Falha desconhecida ao registrar push.'));
```

O próprio comentário diz "TEMPORARIO (debug)… Remover após confirmar". Hoje, **qualquer** falha de registro de push (permissão negada, emulador, etc.) mostra um alerta "Debug push token" para o **usuário final** a cada login. Remover antes de distribuir.

---

## 🟡 Achados de severidade BAIXA / Observações

### L1 — `getEffectiveValues` é O(N²) em formulários grandes
[`formEngine.ts:161`](src/features/form-fill/engine/formEngine.ts): laço de até `ids.length` iterações, cada uma varrendo **todos** os campos e rodando jsonLogic. Há `break` antecipado e `useDeferredValue` ([`useDynamicForm.ts:19`](src/features/form-fill/hooks/useDynamicForm.ts)) mitigando o jank, mas em formulários muito grandes (100+ campos com condicionais encadeadas) o custo por recálculo cresce quadraticamente. Aceitável hoje; ponto de atenção se os formulários crescerem. O motor json-logic em si ([`vendor/json-logic.js`](src/features/form-fill/vendor/json-logic.js)) é a biblioteca padrão, segura (sem `eval`) e barata por avaliação — o custo é a **quantidade** de avaliações.

### L2 — Assinatura base64 inline é re-serializada a cada autosave
[`SignatureField.tsx:78`](src/features/form-fill/components/fields/SignatureField.tsx) guarda o PNG em **base64 dentro do valor do campo**. Diferente do upload (que guarda URI no disco e só o nome em `dados`), a assinatura vive em `values` e em `dados_json`, sendo re-serializada (`JSON.stringify`) **a cada autosave de 500 ms** e inflando o payload de envio. Considerar persistir a assinatura como arquivo (igual upload) e referenciar pelo nome.

### L3 — Download consolidado carrega tudo em memória
[`offlineApi.ts:24`](src/features/consolidated-data/services/offlineApi.ts) (`fetchConsolidatedData`) traz **todos** os registros num único JSON; o axios bufferiza o corpo inteiro, faz `JSON.parse` e o array fica retido durante todo o `saveRecords`. A gravação em si é bem feita (lotes de 100, triggers FTS suspensos, `setTimeout(0)` para ceder à UI — [`offlineSync.ts:150`](src/features/consolidated-data/services/offlineSync.ts)), mas para datasets muito grandes o **pico de memória do download** é uma limitação. Idealmente paginar/streamar do backend.

### L4 — Sem cancelamento de operações longas
Sync (até 5 min por item — [`syncService.ts:48`](src/features/sync/services/syncService.ts)) e preparação offline não têm botão de cancelar; o usuário fica preso na tela. Uma preparação interrompida (app morto no meio do batch) pode deixar `offline_sync_state` em `preparing` e o índice FTS parcial até nova preparação (recuperável, mas sem feedback claro).

### L5 — Token de sessão em texto puro no SQLite
[`sessionStorage.ts:42`](src/features/auth/services/sessionStorage.ts) grava o bearer token sem criptografia. Em aparelho comprometido/rooteado, o token fica exposto. Para um app de campo, considerar `expo-secure-store` para o token (o resto do perfil pode seguir no SQLite).

### L6 — Promise rejection tracker declarado mas nunca ativado
[`installGlobalErrorHandler.ts:21`](src/shared/diagnostics/installGlobalErrorHandler.ts) declara o tipo `HermesInternal.enablePromiseRejectionTracker`, e `crashLog` tem o `origin: 'unhandledRejection'`, mas **nada chama o tracker** — rejeições de promise não tratadas não são gravadas. Lacuna de diagnóstico (não é bug funcional), mas dado o foco em "fechamentos sem rastro", vale ativar.

### L7 — Itens menores
- **Erros de servidor mascarados:** [`getErrorMessage.ts:5`](src/shared/utils/getErrorMessage.ts) retorna "Não foi possível conectar com a API" para qualquer axios error com resposta (ex.: 500 sem `message`) — enganoso, pois houve conexão.
- **`submitReauth` sem `device_id`/push:** [`AuthContext.tsx:131`](src/features/auth/context/AuthContext.tsx) chama `login({cpf, senha})` sem os campos que o login normal envia ([`LoginScreen.tsx:133`](src/features/auth/screens/LoginScreen.tsx)). Confirmar se o backend exige `mobile_app_device_id` em todo login.
- **`ChoiceField` overflow de `maxSelect`:** [`ChoiceField.tsx:32`](src/features/form-fill/components/fields/ChoiceField.tsx) — ao atingir o máximo e tocar em nova opção, **substitui toda a seleção** por 1 item, em vez de bloquear/avisar. UX incomum.
- **DRY:** `uuidv4` duplicado ([`draftFileService.ts:11`](src/features/form-fill/services/draftFileService.ts) e [`deviceIdentity.ts:5`](src/shared/device/deviceIdentity.ts)); lógica de salvar situações duplicada inline em [`OfflinePreparationScreen.tsx:62`](src/features/consolidated-data/screens/OfflinePreparationScreen.tsx) vs `saveSituacoes`.
- **`FillRecordScreen` sem guard de unmount:** [`FillRecordScreen.tsx:20`](src/features/form-fill/screens/FillRecordScreen.tsx) — troca rápida de registro pode setar estado de resposta antiga (baixo impacto).
- **`localState` nunca limpo:** [`RecordsListContext.tsx:14`](src/navigation/RecordsListContext.tsx) — pode reaplicar update otimista antigo em remontagens (idempotente).
- **Comentário desatualizado:** [`LocationTracker.tsx:8`](src/features/activity-tracking/components/LocationTracker.tsx) diz "1 min", mas o tick é de 10 min e a captura é 1×/hora.
- **Sem mínimo de senha no cliente:** [`passwordStrength.ts`](src/features/auth/utils/passwordStrength.ts) é só visual; `primeiroAcesso` envia qualquer senha (validação depende do backend).
- **Deep link `records/:recordGuid`:** [`linking.ts:23`](src/navigation/linking.ts) abre o Fill direto; com guid inexistente cai no erro tratado (sem crash), mas pula o `logRecordOpen`. Baixo risco.

---

## Observações de alto volume (visão de arquitetura)

Como o foco é **volume de dados gerado/recebido**, vale consolidar os pontos estruturais (já citados acima) que definem o teto de escala do app:

1. **Saída de mídia (o gargalo principal):** o modelo "base64 dentro de um JSON único" (§H1, §L2) não escala com muitas fotos/assinaturas. É o item nº 1 a repensar (multipart/streaming, 1 arquivo por requisição, compressão na captura).
2. **Entrada de dados consolidados (§L3):** download monolítico em memória. Funciona para datasets médios; para grandes, precisa de paginação no backend.
3. **Fila de atividades (§M5):** robusta no conceito (fire-and-forget, dedup por `client_id`, flush único), mas o `IN (...)` e o timeout de 15 s limitam o cenário "muito tempo offline".
4. **Banco local:** WAL + `busy_timeout` + índices + FTS5 estão bem configurados; os riscos são **operacionais** (triggers FTS no DELETE §H4, migração §H5), não de modelagem.
5. **Defasagem de UI (§M3):** contadores derivados de SQL não são invalidados após escrita — falta um mecanismo de "refetch on focus" consistente.

---

## O que está bem feito (para preservar)

- `ErrorBoundary` + handler global + **captura de crash em disco síncrona** ([`crashLog.ts`](src/shared/diagnostics/crashLog.ts)) e aviso na reabertura ([`LastCrashNotice.tsx`](src/shared/components/LastCrashNotice.tsx)) — excelente para "app fechou sozinho".
- Autosave de rascunho com **versão monotônica** e `ON CONFLICT ... WHERE updated_at_ms >= ...` evitando que saves fora de ordem sobrescrevam dados mais novos ([`fillRecordService.ts:222`](src/features/form-fill/services/fillRecordService.ts)).
- **Tudo-ou-nada** no envio de uploads (não envia lista parcial desalinhada) e verificação de integridade pós-salvar (`isDraftReadyForSync`).
- Ingestão de registros em **lotes com triggers FTS suspensos** e checkpoint WAL ([`offlineSync.ts`](src/features/consolidated-data/services/offlineSync.ts)).
- Paginação **keyset** + FTS5 com sanitização de termos ([`offlineQueries.ts:128`](src/features/consolidated-data/services/offlineQueries.ts)) e `FlatList` bem configurada ([`RecordsScreen.tsx:162`](src/features/records/screens/records/RecordsScreen.tsx)).
- Reauth com **single-flight** no interceptor 401 ([`apiClient.ts:65`](src/shared/api/apiClient.ts)) sem perder a requisição original.
- `useDeferredValue` + `memo` com comparação O(1) via mapa de visibilidade ([`DynamicFieldRenderer.tsx:133`](src/features/form-fill/components/DynamicFieldRenderer.tsx)) — digitação fluida mesmo com recálculo pesado.

---

## Plano de ação priorizado

**Antes de aumentar volume de campo (bloqueadores):**
1. **H1** — repensar o envio de mídia (multipart/streaming ou 1 arquivo por requisição + compressão). *Maior impacto.*
2. **H2** — timeout em `getCurrentCoordinates` (reusar `withTimeout` existente) + estado de loading no "Concluir".
3. **H3** — trava de reentrância (`isSubmitting` + `disabled`) no botão "Concluir".
4. **H4** — suspender/reconstruir triggers FTS em `clearAllOfflineData` (logout/reset/sair-da-equipe).
5. **H5** — migrações idempotentes e/ou transacionais.

**Logo em seguida (correção/dados):**
6. **M7/M8** — confirmar typos de contrato com backend; remover alerta de debug do login.
7. **M4** — padronizar fuso em datas/horas.
8. **M3** — refetch on focus em Home/Overview.
9. **M1, M2, M5, M6** — robustez de parsing, UPSERT na situação, lotes na fila de atividades, limpeza de órfãos e filtro de tamanho.

**Quando houver folga (qualidade/escala):**
10. **L1–L7** — performance de forms grandes, assinatura como arquivo, paginação do download, SecureStore para token, ativar promise-rejection tracker e limpezas menores.

---

---

## Anexo A — Proposta de endpoint multipart/form-data (para a API)

Hoje o envio de preenchimentos (`POST /campo-visitas/registro`) recebe **todos os anexos em base64 dentro de um JSON único**. É isso que gera o risco de OOM (§H1): o app mantém todas as imagens em memória, em base64 (~+33%), e o axios ainda duplica ao serializar o corpo. O cliente já tem a trava temporária `MAX_TOTAL_UPLOAD_BYTES` (35 MB) que bloqueia envios grandes em vez de crashar — mas a correção real é **trocar para `multipart/form-data`**, enviando os arquivos como binário em streaming, sem carregar tudo em memória.

### Endpoint proposto

`POST /campo-visitas/registro` aceitando `Content-Type: multipart/form-data` com as partes:

| Parte (campo) | Tipo | Descrição |
|---|---|---|
| `payload` | texto (JSON) | O mesmo objeto de hoje, **sem** o array `uploads` e **sem** a assinatura base64: `contrato_id`, `base_dados_guid`, `equipe_id`, `agente_id`, `form_id`, `dados`, `latitude`, `longitude`, `registro_campo_guid`, `form_base_dados`, `situacao_campo_id`, `created_at`. |
| `file_<field_id>_<index>` | binário | Cada arquivo de um campo `upload`. `field_id` = id do campo; `index` = posição (0-based). O servidor casa por `field_id` + índice, igual a hoje. O `filename` da parte = o nome único (UUID) já presente em `dados[field_id][index]`. |
| `file_<situacao_guid>_0` | binário | Foto da Situação de Campo (quando houver), com `situacao_guid` = `situacao_campo_id`. |
| `signature_<field_id>` | binário (PNG) | Assinatura como arquivo, em vez de base64 inline em `dados`. |

### Regras (preservar as garantias atuais)
- **Sucesso:** continuar retornando `{ codigo: 200, status: "sucesso", ... }` — o cliente só apaga o rascunho/arquivos nesse caso.
- **Tudo-ou-nada:** se qualquer arquivo referenciado em `dados` não chegar, rejeitar o preenchimento inteiro (não persistir parcial). O cliente mantém o rascunho para reenvio.
- **Idempotência:** um reenvio (resposta perdida) não deve duplicar. Hoje não há chave de idempotência no envio de preenchimento — considerar aceitar um `client_draft_id` para dedup (análogo ao `client_id` das atividades).
- **Limites:** definir limite por arquivo e total no servidor (ex.: 10 MB/arquivo) e responder erro claro — o cliente já valida 10 MB/arquivo na captura.

### O que muda no app quando o endpoint existir
- `buildUploads` deixa de gerar base64 e passa a anexar `FormData` com os `uri` (o RN faz streaming do arquivo, sem carregar em JS).
- A assinatura passa a ser salva como arquivo (resolve §L2 de quebra).
- A trava `MAX_TOTAL_UPLOAD_BYTES` pode ser removida (ou muito elevada).

> O lado do app é uma troca localizada em `syncService.ts` — posso implementar assim que o endpoint estiver disponível.

---

*Documento gerado por revisão estática de leitura integral. Recomenda-se validar §H1, §H2 e §H4 com um teste de carga real (preenchimento com 20–30 fotos de 5–10 MB em aparelho de entrada, e um ciclo de logout com base grande) para reproduzir e medir antes/depois das correções.*
