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

// Folga entre a base do campo focado e o topo do teclado.
const FOCUS_MARGIN = 80;

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
      const input = inputRef.current;
      const metrics = Keyboard.metrics();
      if (!scrollView || !input || !metrics || !keyboardScroll) return;

      // Geometria ao vivo: mede onde o input esta na janela e onde o teclado
      // comeca. Se a base do input (mais a folga) passa do topo do teclado, rola
      // exatamente essa diferenca a partir do offset atual. Determinista e
      // independente do tamanho/estrutura do formulario.
      input.measureInWindow((_x, y, _w, h) => {
        const keyboardTop = metrics.screenY;
        const overlap = y + h + FOCUS_MARGIN - keyboardTop;
        if (overlap > 0) {
          scrollView.scrollTo({ animated: true, y: keyboardScroll.scrollY.current + overlap });
        }
      });
    };

    if (Keyboard.isVisible()) {
      // Teclado ja aberto (trocando de campo): metrics e a area visivel ja estao
      // no estado final, basta medir e rolar.
      requestAnimationFrame(performScroll);
      return;
    }

    // Teclado ainda fechado: so apos abrir o Keyboard.metrics() conhece a posicao
    // real do topo do teclado. Espera o evento para medir corretamente.
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
