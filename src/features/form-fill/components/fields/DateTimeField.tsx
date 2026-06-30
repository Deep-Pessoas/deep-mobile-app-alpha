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

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parseValue(value: FormValue) {
  if (typeof value !== 'string' || !value) return new Date();
  // "HH:mm" — hora local de hoje.
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  // "YYYY-MM-DD" e "YYYY-MM-DDTHH:mm" (sem fuso) sao interpretados como horario LOCAL. Sem isto,
  // `new Date("YYYY-MM-DD")` assume UTC e desloca a data em 1 dia em fusos negativos (Brasil = -3).
  const localMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (localMatch) {
    const [, y, m, d, hh, mm] = localMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh ?? 0), Number(mm ?? 0));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatValue(date: Date, type: DynamicField['config']['dateType']) {
  // Sempre em horario LOCAL (mesmo formato de string de antes), para que o valor salvo/enviado
  // reflita o que o agente selecionou — sem a conversao para UTC que adiantava/atrasava o horario.
  if (type === 'time') return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (type === 'datetime') return `${ymd}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return ymd;
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
