export type SyncableDraft = {
  draftId: string;
  recordGuid: string;
  recordName: string;
  formGuid: string;
  formName: string;
  status: 'Rascunho' | 'Preenchendo offline';
  updatedAt: string;
  fieldsCount: number;
  isBaseless: boolean;
  isSituacaoDeCampo: boolean;
  situacaoTitulo: string;
};

export type SyncResult = {
  draftId: string;
  recordGuid: string;
  formGuid: string;
  recordName: string;
  success: boolean;
  message?: string;
};
