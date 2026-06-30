import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { DynamicForm } from '../components/DynamicForm';
import { getFillRecordData } from '../services/fillRecordService';
import type { FillRecordData, FillRecordLocalStatus } from '../types/form';

type Props = {
  onBack: () => void;
  onLocalStateSaved: (recordGuid: string, status: FillRecordLocalStatus) => void;
  recordGuid: string;
};

export function FillRecordScreen({ onBack, onLocalStateSaved, recordGuid }: Props) {
  const database = useSQLiteContext();
  const [data, setData] = useState<FillRecordData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFillRecordData(database, recordGuid)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setError('Registro ou formulário offline não encontrado.');
          return;
        }
        setData(result);
      })
      .catch(() => {
        // Ignora respostas de um registro anterior se a tela ja trocou de registro/desmontou.
        if (active) setError('Nao foi possivel carregar o formulários offline.');
      });
    return () => { active = false; };
  }, [database, recordGuid]);

  return (
    <View className="flex-1 bg-white">
      {!data && !error ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : null}

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-red-700">{error}</Text>
        </View>
      ) : null}

      {data ? <DynamicForm data={data} onBack={onBack} onLocalStateSaved={onLocalStateSaved} /> : null}
    </View>
  );
}
