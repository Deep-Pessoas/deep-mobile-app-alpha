import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { FillRecordScreen } from '../form-fill/screens/FillRecordScreen';
import type { FillRecordLocalStatus } from '../form-fill/types/form';
import { RecordsScreen } from './screens/records/RecordsScreen';

type Props = {
  active: boolean;
  onFillingChange?: (isFilling: boolean) => void;
  onTitleChange: (title: string) => void;
  resetSignal?: number;
};

export function RecordsFlow({ active, onFillingChange, onTitleChange, resetSignal }: Props) {
  const [selectedRecordGuid, setSelectedRecordGuid] = useState<string | null>(null);
  const [localState, setLocalState] = useState<{ recordGuid: string; status: FillRecordLocalStatus } | null>(null);
  const isFirstResetRef = useRef(true);

  useEffect(() => {
    if (active) {
      onTitleChange(selectedRecordGuid ? 'Preenchimento de Formulário' : 'Preenchimentos');
    }
  }, [active, onTitleChange, selectedRecordGuid]);

  useEffect(() => {
    onFillingChange?.(selectedRecordGuid !== null);
  }, [onFillingChange, selectedRecordGuid]);

  useEffect(() => {
    if (resetSignal === undefined) return;
    if (isFirstResetRef.current) {
      isFirstResetRef.current = false;
      return;
    }
    setSelectedRecordGuid(null);
  }, [resetSignal]);

  return (
    <View className="flex-1">
      {selectedRecordGuid ? (
        <FillRecordScreen
          onBack={() => setSelectedRecordGuid(null)}
          onLocalStateSaved={(recordGuid, status) => setLocalState({ recordGuid, status })}
          recordGuid={selectedRecordGuid}
        />
      ) : (
        <RecordsScreen
          localState={localState}
          onOpenRecord={setSelectedRecordGuid}
          visible={active}
        />
      )}
    </View>
  );
}
