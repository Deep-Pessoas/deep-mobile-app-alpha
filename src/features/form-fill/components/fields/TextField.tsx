import { useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';

import { detectNumericValueType, formatNumericValue, isValidCpf } from '../../engine/valueValidation';
import type { DynamicField, FormValue } from '../../types/form';
import { useKeyboardScrollContext } from '../KeyboardScrollContext';
import { FieldContainer } from './FieldContainer';

type Props = {
  error?: string;
  field: DynamicField;
  multiline?: boolean;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

// Espaco extra acima do campo focado ao rolar para deixa-lo visivel acima do teclado.
const FOCUS_SCROLL_OFFSET = 96;

export function TextField({ error, field, multiline = false, onChange, value }: Props) {
  const isNumber = field.type === 'number';
  const valueType = isNumber ? detectNumericValueType(field.config.name, field.config.label) : null;
  const [validationError, setValidationError] = useState<string | undefined>();
  const inputRef = useRef<TextInput>(null);
  const keyboardScroll = useKeyboardScrollContext();
  const changeText = (text: string) => {
    setValidationError(undefined);
    onChange(isNumber ? formatNumericValue(text, valueType) : text);
  };

  const scrollIntoView = () => {
    const performScroll = () => {
      const scrollView = keyboardScroll?.scrollViewRef.current;
      const y = keyboardScroll?.fieldOffsets.current.get(field.id);
      if (!scrollView || y === undefined) return;

      scrollView.scrollTo({ animated: true, y: Math.max(y - FOCUS_SCROLL_OFFSET, 0) });
    };

    if (Keyboard.isVisible()) {
      // Teclado ja esta aberto (trocando de campo): a area visivel do ScrollView
      // ja esta no tamanho final, basta medir e rolar.
      requestAnimationFrame(performScroll);
      return;
    }

    // Com windowSoftInputMode "resize", a janela so encolhe (e o ScrollView so
    // ganha sua altura final) quando o teclado termina de aparecer. Rolar antes
    // disso faz o calculo de offset usar a altura antiga e o campo continua
    // coberto pelo teclado.
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      subscription.remove();
      requestAnimationFrame(performScroll);
    });
  };

  return (
    <FieldContainer
      error={error ?? validationError}
      helper={field.config.placeholder}
      label={field.config.label}
      required={field.config.required}
    >
      <TextInput
        className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-base text-zinc-900 ${
          multiline ? 'min-h-28 py-3' : 'min-h-12 py-3'
        }`}
        keyboardType={isNumber ? 'numeric' : 'default'}
        multiline={multiline}
        onBlur={() => {
          if (valueType === 'cpf' && typeof value === 'string' && value && !isValidCpf(value)) {
            setValidationError('CPF invalido');
          }
        }}
        onChangeText={changeText}
        onFocus={scrollIntoView}
        placeholder={field.config.placeholder}
        placeholderTextColor="#a1a1aa"
        ref={inputRef}
        showSoftInputOnFocus
        textAlignVertical={multiline ? 'top' : 'center'}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
      />
    </FieldContainer>
  );
}
