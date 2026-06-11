import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';

import type { DynamicField, FormValue } from '../../types/form';
import { FieldContainer } from './FieldContainer';

type Props = {
  error?: string;
  field: DynamicField;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

function parseValue(value: FormValue) {
  if (typeof value !== 'string' || !value) return new Date();
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatValue(date: Date, type: DynamicField['config']['dateType']) {
  if (type === 'time') return date.toTimeString().slice(0, 5);
  if (type === 'datetime') return date.toISOString().slice(0, 16);
  return date.toISOString().slice(0, 10);
}

export function DateTimeField({ error, field, onChange, value }: Props) {
  const [visible, setVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>(field.config.dateType === 'time' ? 'time' : 'date');
  const [draftDate, setDraftDate] = useState(parseValue(value));

  const change = (event: DateTimePickerChangeEvent, date: Date) => {
    if (field.config.dateType === 'datetime' && pickerMode === 'date') {
      setDraftDate(date);
      setPickerMode('time');
      return;
    }

    const finalDate = field.config.dateType === 'datetime'
      ? new Date(
        draftDate.getFullYear(),
        draftDate.getMonth(),
        draftDate.getDate(),
        date.getHours(),
        date.getMinutes(),
      )
      : date;
    onChange(formatValue(finalDate, field.config.dateType));
    if (Platform.OS === 'android') setVisible(false);
    setPickerMode(field.config.dateType === 'time' ? 'time' : 'date');
  };

  const dismiss = () => {
    if (Platform.OS === 'android') setVisible(false);
  };

  return (
    <FieldContainer error={error} label={field.config.label} required={field.config.required}>
      <Pressable
        className="h-12 justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3"
        onPress={() => {
          setDraftDate(parseValue(value));
          setPickerMode(field.config.dateType === 'time' ? 'time' : 'date');
          setVisible(true);
        }}
      >
        <Text className={`text-base ${value ? 'text-zinc-900' : 'text-zinc-400'}`}>
          {typeof value === 'string' && value ? value : 'Selecionar data/hora'}
        </Text>
      </Pressable>
      {visible ? (
        <DateTimePicker
          display="default"
          mode={pickerMode}
          onDismiss={dismiss}
          onValueChange={change}
          value={parseValue(value)}
        />
      ) : null}
    </FieldContainer>
  );
}
