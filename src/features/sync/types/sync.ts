export type SyncableDraft = {
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
  recordGuid: string;
  formGuid: string;
  recordName: string;
  success: boolean;
  message?: string;
};
