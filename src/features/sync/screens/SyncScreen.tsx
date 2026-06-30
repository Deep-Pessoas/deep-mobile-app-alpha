import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/context/AuthContext';
import { useNetwork } from '../../../shared/context/NetworkContext';
import { RefreshIcon } from '../../../shared/components/Icon';
import { flushActivities } from '../../activity-tracking/services/activitySync';
import { getSyncableDrafts, syncAll } from '../services/syncService';
import { SyncProgressRing } from '../components/SyncProgressRing';
import type { SyncableDraft, SyncResult } from '../types/sync';

type SyncPhase = 'idle' | 'syncing' | 'done';

function draftKey(d: SyncableDraft) {
  return d.draftId;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function StatusDot({ result, isSyncing }: { result?: SyncResult; isSyncing: boolean }) {
  if (isSyncing && !result) {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-100">
        <ActivityIndicator color="#8b5cf6" size="small" />
      </View>
    );
  }
  if (result?.success) {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-green-100">
        <Text className="text-base">✅</Text>
      </View>
    );
  }
  if (result && !result.success) {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-red-100">
        <Text className="text-base">❌</Text>
      </View>
    );
  }
  return <View className="h-2.5 w-2.5 rounded-full bg-zinc-300" />;
}

export function SyncScreen() {
  const database = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { requestFullRefresh, session } = useAuth();
  const { isOnline, checkNow } = useNetwork();

  const [drafts, setDrafts] = useState<SyncableDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [resultsByKey, setResultsByKey] = useState<Record<string, SyncResult>>({});
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [uploadRatio, setUploadRatio] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const headerScale = useRef(new Animated.Value(0.96)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const loadDrafts = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const result = await getSyncableDrafts(database);
      setDrafts(result);
    } catch {
      setLoadError('Não foi possível carregar os formulários preenchidos.');
    } finally {
      setIsLoading(false);
    }
  }, [database]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { duration: 380, toValue: 1, useNativeDriver: true }),
      Animated.spring(headerScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega a lista toda vez que a tela ganha foco (e nao so no mount). Sem isso, ao voltar
  // para a Sync — cuja instancia o stack reaproveita — um preenchimento concluido depois da
  // primeira visita nao apareceria ate um refresh manual. So recarrega quando ocioso, para nao
  // apagar o resultado de um envio em andamento/concluido.
  useFocusEffect(
    useCallback(() => {
      if (phase === 'idle') void loadDrafts();
    }, [loadDrafts, phase]),
  );

  const handleSync = async () => {
    if (!session || drafts.length === 0 || phase === 'syncing') return;

    await checkNow();
    if (!isOnline) return;

    setPhase('syncing');
    setResultsByKey({});
    setSuccessCount(0);
    setFailureCount(0);
    setUploadRatio(0);
    setProgress({ completed: 0, total: drafts.length });

    // Primeira requisicao: monta todas as atividades num array e envia (POST
    // /agente-ativdades-mobile). Ao receber code=200, as linhas sao apagadas do banco. Depois
    // segue o fluxo normal de envio dos preenchimentos. Best-effort: nao bloqueia o sync.
    await flushActivities(database, session.agent.guid);

    const results = await syncAll(
      database,
      session.agent.guid,
      drafts,
      (result, completed, total) => {
        setResultsByKey((prev) => ({ ...prev, [result.draftId]: result }));
        setProgress({ completed, total });
        setUploadRatio(1); // item concluído: anel interno cheio antes de zerar no próximo
      },
      (ratio) => setUploadRatio(ratio),
    );

    const failures = results.filter((r) => !r.success);
    setSuccessCount(results.length - failures.length);
    setFailureCount(failures.length);
    setPhase('done');
    setProgress(null);

    // Não recarrega a lista aqui de propósito: os itens enviados com sucesso já foram
    // apagados do banco, e recarregar agora os faria sumir da tela no instante em que o
    // envio termina — antes do usuário conseguir ver a confirmação. A lista só é
    // atualizada quando o usuário sai da tela de resultado (handleDone).
  };

  const handleDone = () => {
    // Feedback imediato: o botão entra em estado "Atualizando..." na hora do toque.
    // requestFullRefresh navega para a tela de preparação (que tem seu próprio
    // progresso), então NÃO recarregamos a lista aqui — isso evitava a sensação de
    // "Concluir travado" (a navegação acontecia sem nenhum sinal visível no botão).
    if (isFinishing) return;
    setIsFinishing(true);
    setResultsByKey({});
    requestFullRefresh();
  };

  const isSyncing = phase === 'syncing';
  const isDone = phase === 'done';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-primary-50">
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-primary-50 px-6">
        <Text className="text-center text-base text-red-700">{loadError}</Text>
        <Pressable
          className="mt-4 min-h-11 items-center justify-center rounded-2xl bg-primary-500 px-6"
          onPress={loadDrafts}
        >
          <Text className="text-sm font-semibold text-white">Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary-50">

      {/* Cabeçalho com card de stats */}
      <Animated.View
        className="mx-4 mt-4 overflow-hidden rounded-2xl bg-primary-500"
        style={{ opacity: headerOpacity, transform: [{ scale: headerScale }] }}
      >
        {/* Alerta offline sobrepõe o card */}
        {!isOnline ? (
          <View className="absolute inset-0 z-10 items-center justify-center rounded-3xl bg-amber-500 px-5 py-4">
            <Text className="text-center text-sm font-bold text-white">Sem conexão com a internet</Text>
            <Text className="mt-0.5 text-center text-xs text-amber-100">
              Aguarde a conexão para sincronizar.
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-semibold uppercase tracking-widest text-primary-200">
              {isDone ? (failureCount > 0 ? 'Envio incompleto' : 'Envio confirmado') : isSyncing ? 'Enviando' : 'Pronto para enviar'}
            </Text>
            <Text className="mt-0.5 text-2xl font-bold text-white">
              {isDone
                ? `${successCount} enviado${successCount === 1 ? '' : 's'}`
                : `${drafts.length} formulário${drafts.length === 1 ? '' : 's'}`}
            </Text>
            {isDone && failureCount > 0 ? (
              <Text className="mt-0.5 text-xs font-medium text-red-100">
                {failureCount === 1 ? '1 não enviado — salvo para reenvio' : `${failureCount} não enviados — salvos para reenvio`}
              </Text>
            ) : isDone ? (
              <Text className="mt-0.5 text-xs font-medium text-green-200">Tudo enviado com sucesso ✅</Text>
            ) : null}
          </View>

          {isSyncing && progress ? (
            <SyncProgressRing completed={progress.completed} total={progress.total} inFlightRatio={uploadRatio} />
          ) : isDone ? (
            // Mantém o MESMO anel no fim, cheio e mostrando o total (ex.: 2/2) — em vez de
            // sumir e dar a sensação de que pulou o "2/2". O status (✅/❌) já está no texto
            // à esquerda ("Envio confirmado" / "Envio incompleto").
            <SyncProgressRing completed={successCount} total={successCount + failureCount} />
          ) : (
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-400 active:bg-primary-300 disabled:opacity-40"
              disabled={isSyncing}
              onPress={loadDrafts}
            >
              <RefreshIcon color="#fff" size={18} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Lista de itens */}
      {drafts.length === 0 && !isDone ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100">
            <Text className="text-3xl">✅</Text>
          </View>
          <Text className="mt-4 text-center text-base font-semibold text-zinc-700">Tudo sincronizado</Text>
          <Text className="mt-1 text-center text-sm text-zinc-400">Nenhum formulário pendente de envio.</Text>
        </View>
      ) : (
        <FlatList
          className="mt-3 flex-1"
          contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 16 }}
          data={drafts}
          keyExtractor={draftKey}
          renderItem={({ item }) => {
            const key = draftKey(item);
            const result = resultsByKey[key];
            const isSuccess = result?.success === true;
            const isError = result?.success === false;

            return (
              <View
                className={`mb-2.5 overflow-hidden rounded-xl border-l-4 bg-white ${
                  isSuccess ? 'border-l-green-400' : isError ? 'border-l-red-400' : 'border-l-primary-300'
                }`}
                style={{ elevation: 1 }}
              >
                <View className="flex-row items-start px-4 py-3.5">
                  <View className="flex-1 pr-3">
                    {/* Nome do registro — linha própria, pode ser longo (até 2 linhas) */}
                    <Text
                      className={`text-sm font-semibold ${isError ? 'text-red-800' : 'text-zinc-900'}`}
                      numberOfLines={2}
                    >
                      {item.recordName || `Registro ${item.recordGuid.slice(0, 8)}`}
                    </Text>

                    {/* Badges: tipo (base) + situação, abaixo do nome */}
                    <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
                      <View className={`rounded-full px-2 py-0.5 ${item.isBaseless ? 'bg-zinc-100' : 'bg-blue-50'}`}>
                        <Text className={`text-xs font-medium ${item.isBaseless ? 'text-zinc-500' : 'text-blue-600'}`}>
                          {item.isBaseless ? 'Sem base' : 'Com base'}
                        </Text>
                      </View>
                      {item.isSituacaoDeCampo ? (
                        <View className="rounded-full bg-violet-100 px-2 py-0.5">
                          <Text className="text-xs font-medium text-violet-700">
                            {item.situacaoTitulo || 'Situação de Campo'}
                          </Text>
                        </View>
                      ) : null}
                      <Text className="text-xs text-zinc-400">{formatDate(item.updatedAt)}</Text>
                    </View>

                    {/* Mensagem de erro */}
                    {isError && result.message ? (
                      <View className="mt-2 rounded-lg bg-red-50 px-2.5 py-2">
                        <Text className="text-xs leading-4 text-red-600">{result.message}</Text>
                      </View>
                    ) : null}
                  </View>

                  <StatusDot isSyncing={isSyncing} result={result} />
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Rodapé */}
      <View
        className="bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: '#e4e4e7' }}
      >
        {isDone ? (
          <Pressable
            className="min-h-14 flex-row items-center justify-center gap-2.5 rounded-xl bg-zinc-900 px-4 active:bg-zinc-800 disabled:opacity-60"
            disabled={isFinishing}
            onPress={handleDone}
          >
            {isFinishing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-base font-semibold text-white">Atualizando dados...</Text>
              </>
            ) : (
              <Text className="text-base font-semibold text-white">Concluir</Text>
            )}
          </Pressable>
        ) : drafts.length > 0 ? (
          <Pressable
            className={`min-h-14 flex-row items-center justify-center gap-2.5 rounded-xl px-4 ${
              isSyncing || !isOnline ? 'bg-primary-300' : 'bg-primary-500 active:bg-primary-600'
            }`}
            disabled={isSyncing || !isOnline}
            onPress={handleSync}
          >
            {isSyncing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-base font-semibold text-white">Enviando...</Text>
              </>
            ) : !isOnline ? (
              <Text className="text-base font-semibold text-white">Sem conexão</Text>
            ) : (
              <Text className="text-base font-semibold text-white">
                Enviar {drafts.length} formulário{drafts.length === 1 ? '' : 's'}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
