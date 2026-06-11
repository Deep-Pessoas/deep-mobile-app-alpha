import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';

import { isFieldVisible } from '../engine/formEngine';
import type { DynamicField, FormErrors, FormValue, FormValues } from '../types/form';
import { useKeyboardScrollContext } from './KeyboardScrollContext';
import { useRetornos } from './RetornosContext';
import { CheckboxField } from './fields/CheckboxField';
import { DateTimeField } from './fields/DateTimeField';
import { MultiCaptureField } from './fields/MultiCaptureField';
import { NumberField } from './fields/NumberField';
import { RadioField } from './fields/RadioField';
import { SelectField } from './fields/SelectField';
import { SignatureField } from './fields/SignatureField';
import { DividerField, TitleField } from './fields/StructuralFields';
import { TextField } from './fields/TextField';
import { TextareaField } from './fields/TextareaField';
import { UploadField } from './fields/UploadField';

type Props = {
  draftScope: {
    formGuid: string;
    recordGuid: string;
  };
  errors: FormErrors;
  effectiveValues: FormValues;
  field: DynamicField;
  isLastChild?: boolean;
  isTopLevel?: boolean;
  onChange: (fieldId: string, value: FormValue) => void;
  parentVisible?: boolean;
  values: FormValues;
};

// Coleta o id do campo e, recursivamente, os ids de todos os campos filhos (grupos),
// para que o foco em um campo dentro de um grupo role ate o topo do grupo.
function collectFieldIds(field: DynamicField): string[] {
  const ids = [field.id];
  for (const child of field.config.children ?? []) {
    ids.push(...collectFieldIds(child));
  }
  return ids;
}

function DynamicFieldRendererComponent({
  draftScope,
  errors,
  effectiveValues,
  field,
  isLastChild = false,
  isTopLevel = false,
  onChange,
  parentVisible = true,
  values,
}: Props) {
  const keyboardScroll = useKeyboardScrollContext();
  const reprovados = useRetornos();
  const changeFieldValue = useCallback(
    (value: FormValue) => onChange(field.id, value),
    [field.id, onChange],
  );
  const visible = isFieldVisible(field, effectiveValues, parentVisible);
  if (!visible) return null;

  const commonProps = {
    error: errors[field.id],
    field,
    onChange: changeFieldValue,
    value: values[field.id],
  };

  const rejection = reprovados.get(field.id);

  const fieldSpacingStyle = { marginTop: 8, marginBottom: isLastChild ? 0 : 8 };

  const wrapWithRejection = (node: React.ReactNode) => {
    if (!rejection) return node;
    return (
      <>
        {node}
        <View className="mt-1.5 flex-row items-start rounded-lg bg-red-50 px-3 py-2">
          <Text className="flex-1 text-xs font-medium leading-4 text-red-600">⚠ {rejection}</Text>
        </View>
      </>
    );
  };

  const wrap = (node: React.ReactNode) => {
    if (!isTopLevel || !keyboardScroll) {
      return <View style={fieldSpacingStyle}>{node}</View>;
    }

    return (
      <View
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          for (const id of collectFieldIds(field)) {
            keyboardScroll.fieldOffsets.current.set(id, y);
          }
        }}
        style={fieldSpacingStyle}
      >
        {node}
      </View>
    );
  };

  switch (field.type.toLowerCase()) {
    case 'text':
      return wrap(wrapWithRejection(<TextField {...commonProps} />));
    case 'number':
      return wrap(wrapWithRejection(<NumberField {...commonProps} />));
    case 'datetime':
      return wrap(wrapWithRejection(<DateTimeField {...commonProps} />));
    case 'textarea':
      return wrap(wrapWithRejection(<TextareaField {...commonProps} />));
    case 'select':
      return wrap(wrapWithRejection(<SelectField {...commonProps} />));
    case 'radio':
      return wrap(wrapWithRejection(<RadioField {...commonProps} />));
    case 'checkbox':
      return wrap(wrapWithRejection(<CheckboxField {...commonProps} />));
    case 'title':
      return wrap(<TitleField field={field} isLastChild={isLastChild} />);
    case 'divider':
      return wrap(<DividerField isLastChild={isLastChild} />);
    case 'group':
      return wrap(
        <View className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <View className="border-b border-zinc-200 px-3 py-2.5">
            <Text className="text-base font-bold text-zinc-800">{field.config.label}</Text>
          </View>
          <View className="px-3 pb-2 pt-0">
            {(field.config.children ?? []).map((child, index) => (
              <View key={child.id}>
                <DynamicFieldRenderer
                  draftScope={draftScope}
                  errors={errors}
                  effectiveValues={effectiveValues}
                  field={child}
                  isLastChild={index === (field.config.children ?? []).length - 1}
                  onChange={onChange}
                  parentVisible={visible}
                  values={values}
                />
              </View>
            ))}
          </View>
        </View>,
      );
    case 'mult_capturas':
      return wrap(<MultiCaptureField {...commonProps} />);
    case 'signature':
      return wrap(<SignatureField {...commonProps} />);
    case 'upload':
      return wrap(<UploadField {...commonProps} draftScope={draftScope} />);
    default:
      return (
        <View className="mb-4 rounded-xl bg-red-50 p-3">
          <Text className="text-sm text-red-700">Tipo de campo nao suportado: {field.type}</Text>
        </View>
      );
  }
}

function propsAreEqual(previous: Props, next: Props) {
  if (
    previous.field !== next.field
    || previous.onChange !== next.onChange
    || previous.parentVisible !== next.parentVisible
    || previous.isLastChild !== next.isLastChild
    || previous.draftScope.formGuid !== next.draftScope.formGuid
    || previous.draftScope.recordGuid !== next.draftScope.recordGuid
  ) {
    return false;
  }

  if (next.field.type.toLowerCase() === 'group') return false;

  const fieldId = next.field.id;
  return Object.is(previous.values[fieldId], next.values[fieldId])
    && previous.errors[fieldId] === next.errors[fieldId]
    && isFieldVisible(previous.field, previous.effectiveValues, previous.parentVisible)
      === isFieldVisible(next.field, next.effectiveValues, next.parentVisible);
}

export const DynamicFieldRenderer = memo(DynamicFieldRendererComponent, propsAreEqual);
