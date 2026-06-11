import { useCallback, useMemo, useState } from 'react';

import { collectVisibleFormValues, createOfflineDraftData, getEffectiveValues, getInitialFormValues, validateVisibleRequiredFields } from '../engine/formEngine';
import type { DynamicField, FormErrors, FormValue, FormValues } from '../types/form';

export function useDynamicForm(fields: DynamicField[], draftValues: FormValues = {}) {
  const initialValues = useMemo(
    () => ({ ...getInitialFormValues(fields), ...draftValues }),
    [draftValues, fields],
  );
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [changeVersion, setChangeVersion] = useState(0);
  const effectiveValues = useMemo(() => getEffectiveValues(fields, values), [fields, values]);
  const draftData = useMemo(() => createOfflineDraftData(fields, values, effectiveValues), [effectiveValues, fields, values]);

  const setValue = useCallback((fieldId: string, value: FormValue) => {
    setIsDirty(true);
    setChangeVersion((current) => current + 1);
    setValues((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const nextErrors = validateVisibleRequiredFields(fields, effectiveValues);
    setErrors(nextErrors);
    return { errors: nextErrors, isValid: Object.keys(nextErrors).length === 0 };
  }, [fields, effectiveValues]);

  const collectValues = useCallback(() => collectVisibleFormValues(fields, values), [fields, values]);
  const markSaved = useCallback(() => setIsDirty(false), []);

  const reset = useCallback((nextDraftValues: FormValues = {}) => {
    setValues({ ...getInitialFormValues(fields), ...nextDraftValues });
    setErrors({});
    setIsDirty(false);
    setChangeVersion((current) => current + 1);
  }, [fields]);

  return {
    changeVersion,
    collectValues,
    draftData,
    effectiveValues,
    errors,
    isDirty,
    markSaved,
    reset,
    setValue,
    validate,
    values,
  };
}
