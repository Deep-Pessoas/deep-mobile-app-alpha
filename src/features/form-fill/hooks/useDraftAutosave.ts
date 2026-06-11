import { Directory, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clearFillRecordDraft, saveFillRecordDraft } from '../services/fillRecordService';
import type { FillRecordData, FillRecordLocalStatus, FormValues } from '../types/form';

export type DraftSaveState = 'error' | 'idle' | 'saved' | 'saving';

type Params = {
  changeVersion: number;
  data: FillRecordData;
  database: SQLiteDatabase;
  draftData: FormValues;
  draftPromptHandled: boolean;
  isDirty: boolean;
  markSaved: () => void;
  onLocalStateSaved: (recordGuid: string, status: FillRecordLocalStatus) => void;
  reset: (nextDraftValues?: FormValues) => void;
  values: FormValues;
};

/**
 * Centraliza o estado e os efeitos de persistencia do rascunho:
 * autosave com debounce, salvamento ao desmontar e reinicio do formulario.
 */
export function useDraftAutosave({
  changeVersion,
  data,
  database,
  draftData,
  draftPromptHandled,
  isDirty,
  markSaved,
  onLocalStateSaved,
  reset,
  values,
}: Params) {
  const [localStatus, setLocalStatusState] = useState<FillRecordLocalStatus>(data.draftStatus ?? 'Rascunho');
  const [saveState, setSaveState] = useState<DraftSaveState>(data.hasDraft ? 'saved' : 'idle');

  const latestValues = useRef(values);
  const latestDraftData = useRef(draftData);
  const latestChangeVersion = useRef(changeVersion);
  const latestLocalStatus = useRef(localStatus);
  const hasPendingChanges = useRef(false);
  const onLocalStateSavedRef = useRef(onLocalStateSaved);
  const dataRef = useRef(data);

  useEffect(() => {
    latestValues.current = values;
    latestDraftData.current = draftData;
    latestChangeVersion.current = changeVersion;
    latestLocalStatus.current = localStatus;
    hasPendingChanges.current = isDirty;
  });

  useEffect(() => {
    onLocalStateSavedRef.current = onLocalStateSaved;
    dataRef.current = data;
  });

  const setLocalStatus = useCallback((status: FillRecordLocalStatus) => {
    latestLocalStatus.current = status;
    setLocalStatusState(status);
  }, []);

  const persistDraft = useCallback(async (
    state: FormValues,
    dados: FormValues,
    status: FillRecordLocalStatus,
    savedVersion = latestChangeVersion.current,
  ) => {
    const current = dataRef.current;
    await saveFillRecordDraft(database, current.record.guid, current.form.guid, state, dados, status);
    const isLatestVersion = latestChangeVersion.current === savedVersion;
    hasPendingChanges.current = !isLatestVersion;
    if (isLatestVersion) markSaved();
    onLocalStateSavedRef.current(current.record.guid, status);
    if (isLatestVersion) setSaveState('saved');
  }, [database, markSaved]);

  useEffect(() => () => {
    if (hasPendingChanges.current) {
      saveFillRecordDraft(
        database,
        dataRef.current.record.guid,
        dataRef.current.form.guid,
        latestValues.current,
        latestDraftData.current,
        latestLocalStatus.current,
      ).then(() => onLocalStateSavedRef.current(dataRef.current.record.guid, latestLocalStatus.current)).catch(() => undefined);
    }
  }, [database]);

  const startFresh = useCallback(async () => {
    const current = dataRef.current;
    const draftDirectory = new Directory(Paths.document, 'form-drafts', current.record.guid, current.form.guid);
    if (draftDirectory.exists) {
      try {
        draftDirectory.delete();
      } catch {
        // The draft will still be cleared from the database even if files cannot be removed.
      }
    }
    try {
      await clearFillRecordDraft(database, current.record.guid, current.form.guid);
    } catch {
      // Database cleanup is best-effort; resetting the form is what matters here.
    }
    reset();
    setLocalStatus('Rascunho');
    setSaveState('idle');
    onLocalStateSavedRef.current(current.record.guid, 'Rascunho');
  }, [database, reset, setLocalStatus]);

  const draftPromptHandledRef = useRef(draftPromptHandled);
  useEffect(() => {
    draftPromptHandledRef.current = draftPromptHandled;
  });

  useEffect(() => {
    if (!draftPromptHandled) return;
    if (!isDirty) return;
    setSaveState('saving');
    const timeout = setTimeout(() => {
      if (!draftPromptHandledRef.current) return;
      persistDraft(latestValues.current, latestDraftData.current, latestLocalStatus.current, latestChangeVersion.current)
        .catch(() => setSaveState('error'));
    }, 500);

    return () => clearTimeout(timeout);
  }, [changeVersion, draftPromptHandled, isDirty, persistDraft]);

  return { localStatus, persistDraft, saveState, setLocalStatus, startFresh };
}
