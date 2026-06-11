export type AgentType = {
  guid: string;
  nome: string;
};

export type AuthenticatedAgent = {
  guid: string;
  nome: string;
  cpf: string;
  tipo: string;
  tipo_agente: AgentType;
  equipe_id?: string | null;
  equipe_guid?: string | null;
  equipe_nome?: string | null;
  grupo_equipe_guid?: string | null;
  grupo_nome?: string | null;
  contrato_id?: string | null;
};

export type AuthSession = {
  agent: AuthenticatedAgent;
  token: string;
};

export type LoginInput = {
  cpf: string;
  senha: string;
};

export type LoginResponse = {
  code: number;
  data: {
    agente: AuthenticatedAgent;
    token: string;
  };
  message: string;
  status: boolean;
};

export type VerificarAcessoResponse = {
  code: number;
  status: boolean;
  message: string;
  data: {
    liberado: boolean;
    guid: string;
    tipo_agente: string;
  };
};

export type PrimeiroAcessoInput = {
  senha: string;
};

export type PrimeiroAcessoResponse = {
  code: number;
  status: boolean;
  message: string;
  data?: unknown;
};
