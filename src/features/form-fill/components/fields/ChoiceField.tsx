import { Pressable, Text, View } from 'react-native';

import type { DynamicField, FormValue } from '../../types/form';
import { FieldContainer } from './FieldContainer';

type Props = {
  error?: string;
  field: DynamicField;
  multiple?: boolean;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

export type ChoiceFieldProps = Props;

export function ChoiceField({ error, field, multiple = false, onChange, value }: Props) {
  const selectedValues = (Array.isArray(value) ? value : value ? [value] : []).map(String);
  const maxSelect = Number(field.config.maxSelect ?? 0);

  const select = (optionValue: string) => {
    if (!multiple) {
      onChange(optionValue);
      return;
    }

    if (selectedValues.includes(optionValue)) {
      if (field.config.required && selectedValues.length === 1) return;
      onChange(selectedValues.filter((item) => item !== optionValue));
      return;
    }

    const nextValues = maxSelect > 0 && selectedValues.length >= maxSelect
      ? [optionValue]
      : [...selectedValues, optionValue];
    onChange(nextValues);
  };

  return (
    <FieldContainer error={error} label={field.config.label} required={field.config.required}>
      {maxSelect > 0 ? <Text className="mb-2 text-xs text-zinc-500">Selecione ate {maxSelect}</Text> : null}
      <View className="gap-2">
        {(field.config.options ?? []).map((option) => {
          const selected = selectedValues.includes(String(option.value));
          return (
            <Pressable
              className={`min-h-12 flex-row items-center rounded-xl border px-3 py-2 ${
                selected ? 'border-primary-500 bg-primary-50' : 'border-zinc-200 bg-zinc-50'
              }`}
              key={String(option.value)}
              onPress={() => select(String(option.value))}
            >
              <View className={`mr-3 h-5 w-5 items-center justify-center border ${
                multiple ? 'rounded-md' : 'rounded-full'
              } ${selected ? 'border-primary-500 bg-primary-500' : 'border-zinc-300 bg-white'}`}>
                {selected ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
              </View>
              <Text className="flex-1 text-base text-zinc-800">{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldContainer>
  );
}
