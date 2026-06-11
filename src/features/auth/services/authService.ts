import { apiClient } from '../../../shared/api/apiClient';
import type {
  AuthSession,
  LoginInput,
  LoginResponse,
  PrimeiroAcessoInput,
  PrimeiroAcessoResponse,
  VerificarAcessoResponse,
} from '../types/auth';

export async function verificarAcesso(cpf: string): Promise<VerificarAcessoResponse['data']> {
  const response = await apiClient.post<VerificarAcessoResponse>('/auth/verificar-acesso', { cpf });

  if (response.data.code !== 200) {
    throw new Error(response.data.message || 'Erro ao verificar acesso.');
  }

  return response.data.data;
}

export async function primeiroAcesso(guid: string, input: PrimeiroAcessoInput): Promise<void> {
  const response = await apiClient.post<PrimeiroAcessoResponse>(`/auth/primeiro-acesso/${guid}?navegador=true`, input);

  if (response.data.code !== 200) {
    throw new Error(response.data.message || 'Erro ao redefinir senha.');
  }
}

type AgentProfileResponse = {
  code: number;
  status: boolean;
  message?: string;
  data: import('../types/auth').AuthenticatedAgent;
};

type JoinTeamResponse = {
  code: number;
  status: boolean;
  message?: string;
  data?: unknown;
};

type LeaveTeamResponse = {
  code: number;
  status: boolean;
  message?: string;
  data?: {
    guid?: string;
    equipe_id?: null;
    grupo_equipe_guid?: null;
    contrato_id?: null;
  };
};

export async function getAgentProfile(agenteGuid: string): Promise<import('../types/auth').AuthenticatedAgent> {
  const response = await apiClient.get<AgentProfileResponse>(`/campo-agentes/${agenteGuid}?mobile=true`);
  if (response.data.code !== 200 || !response.data.data) {
    throw new Error(response.data.message || 'Não foi possível buscar os dados do agente.');
  }
  return response.data.data;
}

export async function joinTeam(agenteGuid: string, codeEquipe: string): Promise<void> {
  const response = await apiClient.post<JoinTeamResponse>(
    '/campo-equipe/ingressar?navegador=true',
    { agente_guid: agenteGuid, code_equipe: codeEquipe },
  );
  if (response.data.code !== 200) {
    throw new Error(response.data.message || 'Código inválido ou equipe não encontrada.');
  }
}

export async function leaveTeam(agenteGuid: string): Promise<void> {
  const response = await apiClient.put<LeaveTeamResponse>(
    `/campo-agentes/${agenteGuid}?mobile=true`,
    { equipe_id: null, grupo_equipe_guid: null, contrato_id: null },
  );
  if (response.data.code !== 200) {
    throw new Error(response.data.message || 'Não foi possível sair da equipe.');
  }
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const response = await apiClient.post<LoginResponse>('/auth/login', input);

  if (response.data.code !== 200 || !response.data.status || !response.data.data?.token || !response.data.data?.agente) {
    throw new Error(response.data.message || 'Nao foi possivel realizar o login.');
  }

  return {
    agent: response.data.data.agente,
    token: response.data.data.token,
  };
}
