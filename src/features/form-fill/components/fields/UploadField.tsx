import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteDraftFile, persistDraftFiles } from '../../services/draftFileService';
import type { DynamicField, FormValue } from '../../types/form';
import { FieldContainer } from './FieldContainer';
import { CameraIcon, ImageIcon, PlusIcon, TrashIcon } from '../../../../shared/components/Icon';

type Props = {
  draftScope: {
    draftId: string;
    formGuid: string;
    recordGuid: string;
  };
  error?: string;
  field: DynamicField;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type BusyAction = 'camera' | 'gallery' | 'document' | 'persist' | null;

function isImageUpload(field: DynamicField) {
  const configuredTypes = [
    field.config.fileType,
    field.config.accept,
    field.config.acceptedTypes,
    field.config.mimeType,
    field.config.mimeTypes,
    field.config.tipoArquivo,
    field.config.tipo_arquivo,
  ].flat().filter((value): value is string => typeof value === 'string');

  const configuredAsImage = configuredTypes.some((value) => {
    const normalized = value.trim().toLocaleLowerCase('pt-BR');
    return normalized === 'image'
      || normalized === 'images'
      || normalized === 'imagem'
      || normalized === 'imagens'
      || normalized === 'foto'
      || normalized === 'fotos'
      || normalized.startsWith('image/');
  });
  if (configuredAsImage) return true;

  const fieldDescription = [
    field.config.label,
    field.config.name,
    field.config.placeholder,
  ].filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase('pt-BR');

  return /\b(imagem|foto|fotografia|camera)\b/.test(fieldDescription);
}

export function UploadField({ draftScope, error, field, onChange, value }: Props) {
  const insets = useSafeAreaInsets();
  const [isImageSheetVisible, setIsImageSheetVisible] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isImageSheetVisible) {
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isImageSheetVisible]);
  const files = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const maxFiles = Number(field.config.maxFiles ?? 1);
  const isImage = isImageUpload(field);
  const remainingFiles = Math.max(maxFiles - files.length, 0);

  const addFiles = async (uris: string[]) => {
    if (remainingFiles === 0) {
      Alert.alert('Limite atingido', `Este campo permite no maximo ${maxFiles} arquivo(s).`);
      return;
    }

    setBusyAction('persist');
    try {
      // Persiste apenas ate o limite restante: evita copiar para o disco arquivos que seriam
      // descartados em seguida, deixando arquivos orfaos na pasta do rascunho (vazamento).
      const urisToPersist = uris.slice(0, remainingFiles);
      const results = await persistDraftFiles(draftScope.draftId, field.id, urisToPersist);
      const persistedUris = results
        .filter((result): result is { ok: true; uri: string } => result.ok)
        .map((result) => result.uri);
      const failedCount = results.length - persistedUris.length;

      if (persistedUris.length > 0) {
        onChange([...files, ...persistedUris]);
      }

      if (failedCount > 0) {
        Alert.alert(
          'Falha ao salvar arquivo',
          persistedUris.length > 0
            ? `${failedCount} de ${results.length} arquivo(s) nao puderam ser salvos. Os demais foram adicionados normalmente.`
            : 'Nao foi possivel preservar o arquivo no rascunho offline.',
        );
      }
    } catch {
      Alert.alert('Falha ao salvar arquivo', 'Nao foi possivel preservar o arquivo no rascunho offline.');
    } finally {
      setBusyAction(null);
    }
  };

  const openGallery = async () => {
    setIsImageSheetVisible(false);
    if (remainingFiles === 0) {
      Alert.alert('Limite atingido', `Este campo permite no maximo ${maxFiles} imagem(ns).`);
      return;
    }
    setBusyAction('gallery');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissao necessaria', 'Autorize o acesso a galeria para selecionar imagens.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: maxFiles > 1,
        mediaTypes: ['images'],
        quality: 0.85,
        selectionLimit: remainingFiles,
      });
      if (!result.canceled) {
        const validAssets = result.assets.filter((asset) => !asset.fileSize || asset.fileSize <= MAX_FILE_SIZE);
        if (validAssets.length !== result.assets.length) {
          Alert.alert('Arquivo muito grande', 'Cada arquivo deve possuir no maximo 10 MB.');
        }
        await addFiles(validAssets.map((asset) => asset.uri));
      }
    } finally {
      setBusyAction(null);
    }
  };

  const openCamera = async () => {
    setIsImageSheetVisible(false);
    if (remainingFiles === 0) {
      Alert.alert('Limite atingido', `Este campo permite no maximo ${maxFiles} imagem(ns).`);
      return;
    }
    setBusyAction('camera');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissao necessaria', 'Autorize o acesso a camera para tirar uma foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
          Alert.alert('Arquivo muito grande', 'A imagem deve possuir no maximo 10 MB.');
          return;
        }
        await addFiles([asset.uri]);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const openDocument = async () => {
    if (remainingFiles === 0) {
      Alert.alert('Limite atingido', `Este campo permite no maximo ${maxFiles} arquivo(s).`);
      return;
    }
    setBusyAction('document');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: maxFiles > 1,
        type: String(field.config.fileType).toLocaleLowerCase('pt-BR') === 'pdf' ? 'application/pdf' : '*/*',
      });
      if (!result.canceled) {
        const validAssets = result.assets.filter((asset) => !asset.size || asset.size <= MAX_FILE_SIZE);
        if (validAssets.length !== result.assets.length) {
          Alert.alert('Arquivo muito grande', 'Cada arquivo deve possuir no maximo 10 MB.');
        }
        await addFiles(validAssets.map((asset) => asset.uri));
      }
    } finally {
      setBusyAction(null);
    }
  };

  const isBusy = busyAction !== null;

  const closeSheet = () => {
    if (isBusy) return;
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsImageSheetVisible(false);
    });
  };

  return (
    <FieldContainer error={error} label={field.config.label} required={field.config.required}>
      <View className="flex-row gap-2">
        {isImage ? (
          <Pressable
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 px-3 active:bg-primary-600 disabled:opacity-60"
            disabled={isBusy || remainingFiles === 0}
            onPress={() => setIsImageSheetVisible(true)}
          >
            {busyAction === 'persist' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <PlusIcon color="#ffffff" size={18} />
            )}
            <Text className="text-sm font-semibold text-white">
              {busyAction === 'persist' ? 'Salvando...' : 'Adicionar imagem'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-zinc-100 px-3 disabled:opacity-60"
            disabled={isBusy || remainingFiles === 0}
            onPress={openDocument}
          >
            {busyAction === 'document' || busyAction === 'persist' ? (
              <ActivityIndicator color="#3f3f46" size="small" />
            ) : (
              <PlusIcon color="#3f3f46" size={18} />
            )}
            <Text className="text-sm font-semibold text-zinc-700">
              {busyAction === 'document' ? 'Abrindo...' : busyAction === 'persist' ? 'Salvando...' : 'Selecionar arquivo'}
            </Text>
          </Pressable>
        )}
      </View>
      <Text className="mt-2 text-xs text-zinc-500">{files.length} de {maxFiles} selecionado(s)</Text>

      {files.map((uri, index) => (
        <View className="mt-2 flex-row items-center rounded-xl bg-zinc-50 p-2" key={`${uri}-${index}`}>
          {isImage ? (
            <Image className="h-14 w-14 rounded-lg" resizeMode="cover" source={{ uri }} />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-lg bg-zinc-200">
              <Text className="text-xs font-semibold text-zinc-500">FILE</Text>
            </View>
          )}
          <Text className="ml-3 flex-1 text-xs text-zinc-600" numberOfLines={1}>{uri.split('/').pop()}</Text>
          <Pressable
            className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-white"
            disabled={isBusy}
            onPress={() => {
              deleteDraftFile(uri);
              onChange(files.filter((_, fileIndex) => fileIndex !== index));
            }}
          >
            <TrashIcon color="#dc2626" size={16} />
          </Pressable>
        </View>
      ))}

      <Modal
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
        transparent
        visible={isImageSheetVisible}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" disabled={isBusy} onPress={closeSheet} />
          <Animated.View
            className="rounded-t-3xl bg-white px-5 pt-5"
            style={{
              paddingBottom: insets.bottom + 24,
              transform: [{
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            }}
          >
            <Text className="text-lg font-bold text-zinc-900">Adicionar imagem</Text>
            <Text className="mt-1 text-sm text-zinc-500">Escolha a origem da imagem.</Text>
            <Pressable
              className="mt-5 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-500 disabled:opacity-60"
              disabled={isBusy}
              onPress={openCamera}
            >
              {busyAction === 'camera' ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <CameraIcon color="#ffffff" size={20} />
              )}
              <Text className="text-base font-semibold text-white">
                {busyAction === 'camera' ? 'Abrindo camera...' : 'Abrir camera'}
              </Text>
            </Pressable>
            <Pressable
              className="mt-2 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-zinc-100 disabled:opacity-60"
              disabled={isBusy}
              onPress={openGallery}
            >
              {busyAction === 'gallery' ? (
                <ActivityIndicator color="#3f3f46" size="small" />
              ) : (
                <ImageIcon color="#3f3f46" size={20} />
              )}
              <Text className="text-base font-semibold text-zinc-700">
                {busyAction === 'gallery' ? 'Abrindo galeria...' : 'Escolher da galeria'}
              </Text>
            </Pressable>
            <Pressable
              className="mt-2 min-h-12 items-center justify-center disabled:opacity-60"
              disabled={isBusy}
              onPress={closeSheet}
            >
              <Text className="text-sm font-semibold text-zinc-500">Cancelar</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </FieldContainer>
  );
}
