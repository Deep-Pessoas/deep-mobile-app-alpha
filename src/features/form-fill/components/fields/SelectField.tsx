import { Pressable, Text } from 'react-native';

import { useSelectionSheet } from '../SelectionSheet';
import type { DynamicField, FormValue } from '../../types/form';
import { FieldContainer } from './FieldContainer';

type Props = {
  error?: string;
  field: DynamicField;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

export function SelectField({ error, field, onChange, value }: Props) {
  const { openSelection } = useSelectionSheet();
  const selected = (field.config.options ?? []).find((option) => String(option.value) === String(value));

  return (
    <FieldContainer error={error} label={field.config.label} required={field.config.required}>
      <Pressable
        className="h-12 justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3"
        onPress={() => openSelection({
          onChange,
          options: field.config.options ?? [],
          required: Boolean(field.config.required),
          selectedValue: value,
          title: field.config.label,
        })}
      >
        <Text className={`text-base ${selected ? 'text-zinc-900' : 'text-zinc-400'}`}>
          {selected?.label ?? field.config.placeholder ?? 'Selecione uma opcao'}
        </Text>
      </Pressable>
    </FieldContainer>
  );
}
