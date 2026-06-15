export type FormValue =
  | boolean
  | number
  | string
  | null
  | FormValue[]
  | { [key: string]: FormValue };
export type FormValues = Record<string, FormValue>;
export type FormErrors = Record<string, string>;

export type FormOption = {
  label: string;
  value: string;
};

export type LegacyConditionRule = {
  campo: string;
  operador: 'contains' | 'equals' | 'isEmpty' | 'isNotEmpty' | 'notContains' | 'notEquals' | string;
  valor?: unknown;
};

export type LegacyConditions = {
  action?: 'hide' | 'show';
  regras?: LegacyConditionRule[];
  tipo?: 'AND' | 'OR';
};

export type DynamicFieldConfig = {
  capturas?: { id: string; label: string }[];
  children?: DynamicField[];
  conditions?: LegacyConditions;
  dateType?: 'date' | 'datetime' | 'time';
  defaultValue?: FormValue;
  description?: string;
  label?: string;
  maxSelect?: number;
  maxFiles?: number;
  fileType?: 'all' | 'document' | 'image' | 'pdf' | string;
  name?: string;
  options?: FormOption[];
  placeholder?: string;
  required?: boolean;
  rows?: number;
  titleText?: string;
  visibility?: boolean;
  [key: string]: unknown;
};

export type DynamicField = {
  config: DynamicFieldConfig;
  id: string;
  type: string;
  visibility?: boolean;
};

export type OfflineDynamicForm = {
  contractGuid: string | null;
  fields: DynamicField[];
  guid: string;
  name: string;
};

export type RetornoItem = {
  id: string;
  observacao?: string;
  value?: string;
};

export type DadosRetornos = {
  reprovados: RetornoItem[];
  dados_aprovados: RetornoItem[];
};

export type FillRecordData = {
  isBaseless: boolean;
  hasDraft: boolean;
  draftStatus: FillRecordLocalStatus | null;
  draftValues: FormValues;
  computedInitialValues: FormValues;
  retornos: DadosRetornos | null;
  form: OfflineDynamicForm;
  record: {
    address: string;
    customerCode: string;
    guid: string;
    name: string;
    rawData: Record<string, unknown>;
  };
};

export type OfflineDraftPayload = {
  dados: FormValues;
};

export type FillRecordLocalStatus = 'Preenchendo offline' | 'Rascunho';
