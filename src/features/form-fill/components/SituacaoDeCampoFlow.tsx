import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteDraftDirectory, persistDraftFiles, uuidv4 } from '../services/draftFileService';
import { saveSituacaoDeCampo } from '../services/fillRecordService';
import { getCurrentCoordinates } from '../services/locationService';
import type { FillRecordLocalStatus } from '../types/form';

type Situacao = {
  guid: string;
  nome: string;
  cor: string | null;
};

type Phase = 'list' | 'preview' | 'saved';

type PendingCapture = {
  draftId: string;
  situacao: Situacao;
  timestamp: number;
};

const PENDING_FILE = new File(Paths.document, 'form-drafts', 'situacao-camera-pending.json');
const PENDING_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutos

async function savePendingCapture(draftId: string, situacao: Situacao) {
  try {
    const dir = new Directory(Paths.document, 'form-drafts');
    await dir.create({ idempotent: true, intermediates: true });
    await PENDING_FILE.write(JSON.stringify({ draftId, situacao, timestamp: Date.now() }));
    console.log('[SituacaoDeCampoFlow] pending salvo', { draftId, situacaoGuid: situacao.guid });
  } catch (err) {
    console.log('[SituacaoDeCampoFlow] erro ao salvar pending', { error: err });
  }
}

async function loadPendingCapture(): Promise<PendingCapture | null> {
  try {
    if (!PENDING_FILE.exists) return null;
    const content = await PENDING_FILE.readString();
    const parsed = JSON.parse(content) as PendingCapture;
    const age = Date.now() - parsed.timestamp;
    console.log('[SituacaoDeCampoFlow] pending carregado', { parsed, age });
    if (age > PENDING_MAX_AGE_MS) {
      await clearPendingCapture();
      return null;
    }
    return parsed;
  } catch (err) {
    console.log('[SituacaoDeCampoFlow] erro ao carregar pending', { error: err });
    return null;
  }
}

async function clearPendingCapture() {
  try {
    if (PENDING_FILE.exists) await PENDING_FILE.delete();
    console.log('[SituacaoDeCampoFlow] pending limpo');
  } catch (err) {
    console.log('[SituacaoDeCampoFlow] erro ao limpar pending', { error: err });
  }
}

type Props = {
  formGuid: string;
  onLocalStateSaved: (recordGuid: string, status: FillRecordLocalStatus) => void;
  onBack: () => void;
  recordGuid: string;
};

export function SituacaoDeCampoFlow({ formGuid, onBack, onLocalStateSaved, recordGuid }: Props) {
  const database = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [situacoes, setSituacoes] = useState<Situacao[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Situacao | null>(null);
  // URI persistida no diretorio do app (file:// estavel) — usada para preview e envio.
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('list');
  const [saving, setSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Id proprio desta situacao (linha independente no banco), URI ja persistida (usada no
  // save/envio) e flag de "ja salvo" para limpar a foto se a situacao for abandonada.
  const draftIdRef = useRef(uuidv4());
  const persistedUriRef = useRef<string | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    database
      .getAllAsync<{ guid: string; nome: string; cor: string | null }>(
        'SELECT guid, nome, cor FROM offline_situacoes_campo ORDER BY nome ASC',
      )
      .then(setSituacoes)
      .catch(() => setSituacoes([]))
      .finally(() => setLoadingList(false));
  }, [database]);

  // Limpa a foto persistida caso a situacao tenha sido capturada mas nunca salva (abandono).
  useEffect(() => () => {
    console.log('[SituacaoDeCampoFlow] desmontando', { draftId: draftIdRef.current, saved: savedRef.current });
    if (!savedRef.current) deleteDraftDirectory(draftIdRef.current);
  }, []);

  useEffect(() => {
    console.log('[SituacaoDeCampoFlow] montado', { draftId: draftIdRef.current, recordGuid, formGuid });
    let cancelled = false;
    loadPendingCapture().then((pending) => {
      if (cancelled || !pending) return;
      console.log('[SituacaoDeCampoFlow] restaurando captura pendente', pending);
      draftIdRef.current = pending.draftId;
      setSelected(pending.situacao);
      // Reabre a camera automaticamente porque a foto foi perdida no Activity restart.
      handleSelect(pending.situacao);
    });
    return () => { cancelled = true; };
  }, [formGuid, recordGuid]);

  const handleSelect = async (situacao: Situacao) => {
    console.log('[SituacaoDeCampoFlow] handleSelect iniciado', { situacaoGuid: situacao.guid, situacaoNome: situacao.nome });
    setCaptureError(null);
    await clearPendingCapture();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    console.log('[SituacaoDeCampoFlow] permissao camera', { status });
    if (status !== 'granted') {
      setCaptureError('Permissão de câmera negada. Ative nas configurações do dispositivo.');
      return;
    }

    // Salva estado pendente para recuperacao caso o Android destrua a Activity ao abrir a camera.
    await savePendingCapture(draftIdRef.current, situacao);

    console.log('[SituacaoDeCampoFlow] abrindo camera...');
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    } catch (cameraErr) {
      console.log('[SituacaoDeCampoFlow] erro ao abrir camera', { error: cameraErr });
      setCaptureError('Não foi possível abrir a câmera. Tente novamente.');
      return;
    }
    console.log('[SituacaoDeCampoFlow] camera retornou', { canceled: result.canceled, assetsCount: result.assets?.length, assets: result.assets?.map((a) => ({ uri: a.uri, fileSize: a.fileSize, type: a.type, width: a.width, height: a.height })) });
    if (result.canceled || result.assets.length === 0) {
      console.log('[SituacaoDeCampoFlow] camera cancelada ou sem assets, abortando');
      return;
    }

    const cameraUri = result.assets[0].uri;
    console.log('[SituacaoDeCampoFlow] camera URI', { cameraUri });

    // Persiste a foto para sobreviver ao cache volatil do SO ate o envio (mesma funcao do
    // upload). O preview usa a URI persistida no diretorio do app, nunca a URI temporaria
    // da camera, que pode ser invalidada pelo SO logo apos a captura.
    console.log('[SituacaoDeCampoFlow] chamando persistDraftFiles', { draftId: draftIdRef.current, cameraUri });
    const [persisted] = await persistDraftFiles(draftIdRef.current, 'foto', [cameraUri]);
    console.log('[SituacaoDeCampoFlow] resultado persistencia', { persisted });
    if (!persisted?.ok) {
      setCaptureError('Não foi possível salvar a foto. Tente novamente.');
      return;
    }

    persistedUriRef.current = persisted.uri;
    console.log('[SituacaoDeCampoFlow] setando preview', { persistedUri: persisted.uri, selectedGuid: situacao.guid });
    setSelected(situacao);
    setPhotoUri(persisted.uri);
    setPhase('preview');
  };

  const handleSave = async () => {
    const persistedUri = persistedUriRef.current;
    console.log('[SituacaoDeCampoFlow] handleSave iniciado', { selectedGuid: selected?.guid, persistedUri });
    if (!selected || !persistedUri) return;
    setSaving(true);
    try {
      // Coordenada da propria situacao (latitude/longitude), capturada do GPS agora.
      // Nenhuma situacao pode ser salva/enviada sem latitude/longitude.
      const coordinates = await getCurrentCoordinates();
      if (!coordinates) {
        Alert.alert(
          'Localização necessária',
          'Não foi possível obter a localização (latitude/longitude). Ative o GPS e a permissão de localização e tente salvar novamente.',
        );
        return;
      }
      await saveSituacaoDeCampo(database, draftIdRef.current, recordGuid, formGuid, { guid: selected.guid, titulo: selected.nome }, persistedUri, coordinates);
      savedRef.current = true;
      onLocalStateSaved(recordGuid, 'Preenchendo offline');
      setPhase('saved');
      console.log('[SituacaoDeCampoFlow] handleSave sucesso', { selectedGuid: selected.guid, persistedUri });
    } catch (err) {
      console.log('[SituacaoDeCampoFlow] handleSave erro', { error: err });
      Alert.alert('Erro', 'Não foi possível salvar a situação de campo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = async () => {
    console.log('[SituacaoDeCampoFlow] handleRetake', { selectedGuid: selected?.guid });
    if (!selected) return;
    await handleSelect(selected);
  };

  if (phase === 'saved') {
    console.log('[SituacaoDeCampoFlow] renderizando saved', { phase, selectedGuid: selected?.guid });
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <Text className="text-3xl">✓</Text>
        </View>
        <Text className="mt-4 text-center text-lg font-bold text-zinc-900">Situação registrada</Text>
        <Text className="mt-1.5 text-center text-sm text-zinc-500">
          {selected?.nome} salvo offline. Sincronize para enviar.
        </Text>
        <Pressable
          className="mt-6 min-h-12 items-center justify-center rounded-xl bg-primary-500 px-8 active:bg-primary-600"
          onPress={onBack}
        >
          <Text className="text-base font-semibold text-white">Concluir</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'preview') {
    console.log('[SituacaoDeCampoFlow] branch preview', { phase, selected: !!selected, photoUri, persistedUri: persistedUriRef.current });
  }

  if (phase === 'preview' && selected && photoUri) {
    console.log('[SituacaoDeCampoFlow] renderizando preview', { phase, selectedGuid: selected.guid, photoUri, persistedUri: persistedUriRef.current, screenWidth });
    const imageHeight = (screenWidth - 32) * 0.75;
    return (
      <View className="flex-1 bg-zinc-50" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mx-4 mt-4 overflow-hidden rounded-xl bg-zinc-200">
          <Image
            resizeMode="cover"
            source={{ uri: photoUri }}
            style={{ width: '100%', height: imageHeight }}
            onLoad={() => console.log('[SituacaoDeCampoFlow] Image onLoad', { photoUri })}
            onError={(e) => console.log('[SituacaoDeCampoFlow] Image onError', { photoUri, error: e.nativeEvent?.error })}
          />
        </View>

        <View className="mx-4 mt-3 flex-row items-center rounded-xl bg-white px-4 py-3.5" style={{ elevation: 1 }}>
          {selected.cor ? (
            <View className="mr-3 h-4 w-4 rounded-full" style={{ backgroundColor: selected.cor }} />
          ) : null}
          <View className="flex-1">
            <Text className="text-xs text-zinc-400">Situação selecionada</Text>
            <Text className="text-sm font-semibold text-zinc-900">{selected.nome}</Text>
          </View>
        </View>

        <View className="mx-4 mt-3 flex-row gap-3">
          <Pressable
            className="min-h-12 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 active:bg-zinc-50"
            onPress={handleRetake}
          >
            <Text className="text-sm font-semibold text-zinc-700">Tirar outra</Text>
          </Pressable>
          <Pressable
            className="min-h-12 flex-1 items-center justify-center rounded-xl bg-primary-500 px-4 active:bg-primary-600 disabled:opacity-50"
            disabled={saving}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-white">Salvar offline</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  console.log('[SituacaoDeCampoFlow] renderizando lista', { phase, situacoesCount: situacoes.length, loadingList, captureError, selected: !!selected, photoUri, persistedUri: persistedUriRef.current });
  return (
    <View className="flex-1 bg-zinc-50">
      <View className="border-b border-zinc-200 bg-white px-4 py-3.5">
        <Text className="text-base font-bold text-zinc-900">Situações de Campo</Text>
        <Text className="mt-0.5 text-xs text-zinc-500">Selecione uma situação e fotografe</Text>
      </View>

      {captureError ? (
        <View className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-700">{captureError}</Text>
        </View>
      ) : null}

      {loadingList ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" />
        </View>
      ) : situacoes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-zinc-400">
            Nenhuma situação de campo disponível.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
          {situacoes.map((situacao) => (
            <Pressable
              className="flex-row items-center rounded-xl bg-white px-4 py-4 active:bg-zinc-50"
              key={situacao.guid}
              onPress={() => handleSelect(situacao)}
              style={{ elevation: 1 }}
            >
              {situacao.cor ? (
                <View
                  className="mr-3 h-5 w-5 rounded-full"
                  style={{ backgroundColor: situacao.cor }}
                />
              ) : (
                <View className="mr-3 h-5 w-5 rounded-full bg-zinc-200" />
              )}
              <Text className="flex-1 text-sm font-medium text-zinc-900">{situacao.nome}</Text>
              <Text className="text-lg text-zinc-400">›</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
