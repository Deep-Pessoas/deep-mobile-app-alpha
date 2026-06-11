import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { CheckIcon, LocationIcon, RefreshIcon, TrashIcon } from '../../../../shared/components/Icon';
import type { DynamicField, FormValue } from '../../types/form';
import { FieldContainer } from './FieldContainer';

type CaptureValue = {
  id: string;
  label: string;
  latitude: string;
  longitude: string;
};

type Props = {
  error?: string;
  field: DynamicField;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

function getCaptures(value: FormValue) {
  return Array.isArray(value) ? value as CaptureValue[] : [];
}

// Cada captura configurada (field.config.capturas) e independente: tem seu proprio
// rotulo (ex.: "CAPTURA 1", "CAPTURA 2") e seu proprio botao de captura de
// coordenadas. Nao sao passos de uma sequencia — qualquer uma pode ser capturada,
// recapturada ou removida a qualquer momento, na ordem que o usuario quiser.
export function MultiCaptureField({ error, field, onChange, value }: Props) {
  const values = getCaptures(value);
  const [busyId, setBusyId] = useState<string | null>(null);
  const capturas = field.config.capturas ?? [];

  const capture = async (captureId: string, label: string) => {
    if (busyId) return;
    setBusyId(captureId);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissao necessaria', 'Autorize o acesso a localizacao para realizar a captura.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = values.filter((item) => item.id !== captureId);
      next.push({
        id: captureId,
        label,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      });
      onChange(next);
    } catch {
      Alert.alert('Falha na captura', 'Nao foi possivel obter a localizacao atual.');
    } finally {
      setBusyId(null);
    }
  };

  const removeCapture = (captureId: string) => {
    if (busyId) return;
    onChange(values.filter((item) => item.id !== captureId));
  };

  return (
    <FieldContainer error={error} label={field.config.label} required={field.config.required}>
      <Text className="mb-2 text-xs text-zinc-500">{values.length} de {capturas.length} capturadas</Text>

      {capturas.map((meta) => {
        const item = values.find((existing) => existing.id === meta.id);
        const isBusy = busyId === meta.id;

        if (!item) {
          return (
            <Pressable
              className="mt-2 min-h-14 flex-row items-center rounded-xl border border-zinc-200 bg-white px-3 active:bg-zinc-50 disabled:opacity-60"
              disabled={isBusy}
              key={meta.id}
              onPress={() => capture(meta.id, meta.label)}
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                {isBusy ? (
                  <ActivityIndicator color="#8b5cf6" size="small" />
                ) : (
                  <LocationIcon color="#8b5cf6" size={22} />
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-zinc-800" numberOfLines={1}>{meta.label}</Text>
                <Text className="mt-0.5 text-xs text-zinc-400">
                  {isBusy ? 'Obtendo localizacao...' : 'Toque para capturar a localizacao'}
                </Text>
              </View>
            </Pressable>
          );
        }

        return (
          <View className="mt-2 flex-row items-center rounded-xl bg-zinc-50 p-2" key={meta.id}>
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              {isBusy ? (
                <ActivityIndicator color="#047857" size="small" />
              ) : (
                <CheckIcon color="#047857" size={20} />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-medium text-zinc-800" numberOfLines={1}>{meta.label}</Text>
              <Text className="mt-0.5 text-xs text-zinc-500" numberOfLines={1}>
                {isBusy ? 'Atualizando...' : `${item.latitude}, ${item.longitude}`}
              </Text>
            </View>
            <Pressable
              className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-white"
              disabled={isBusy}
              onPress={() => capture(meta.id, meta.label)}
            >
              {isBusy ? (
                <ActivityIndicator color="#3f3f46" size="small" />
              ) : (
                <RefreshIcon color="#3f3f46" size={16} />
              )}
            </Pressable>
            <Pressable
              className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-white"
              disabled={isBusy}
              onPress={() => removeCapture(meta.id)}
            >
              <TrashIcon color="#dc2626" size={16} />
            </Pressable>
          </View>
        );
      })}

      {capturas.length === 0 ? (
        <View className="mt-2 rounded-xl border border-dashed border-zinc-300 p-4">
          <Text className="text-center text-xs text-zinc-500">Nenhuma captura configurada.</Text>
        </View>
      ) : null}
    </FieldContainer>
  );
}
