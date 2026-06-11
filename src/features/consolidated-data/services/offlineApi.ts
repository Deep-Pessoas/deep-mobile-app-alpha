import { apiClient } from '../../../shared/api/apiClient';
import type { AgentWorkData, ConsolidatedData, SituacaoBackoffice, SituacaoCampo } from '../types/offline';

export type ApiResponse<T> = {
  code: number;
  status: boolean;
  message: string;
  data: T;
};

function requireWorkReferences(data: AgentWorkData) {
  if (!data.contrato_id) throw new Error('Nao encontramos um contrato de trabalho vinculado ao seu acesso.');
  if (!data.equipe_id && !data.equipe_guid) throw new Error('Nao encontramos uma equipe de trabalho vinculada ao seu acesso.');
  if (!data.grupo_equipe_guid) throw new Error('Nao encontramos uma area de trabalho vinculada ao seu acesso.');
}

export async function fetchAgentWorkData(agentGuid: string) {
  const response = await apiClient.get<ApiResponse<AgentWorkData>>(`/campo-agentes/${agentGuid}`, { timeout: 60_000 });
  if (response.data.code !== 200 || !response.data.status) throw new Error(response.data.message || 'Nao foi possivel buscar seus dados de trabalho.');
  requireWorkReferences(response.data.data);
  return response.data.data;
}

export async function fetchConsolidatedData(groupGuid: string) {
  const response = await apiClient.get<ApiResponse<ConsolidatedData>>(`/mobile/dados-consolidados/${groupGuid}`, {
    timeout: 300_000,
  });
  if (response.data.code !== 200 || !response.data.status) throw new Error(response.data.message || 'Nao foi possivel baixar os dados de trabalho.');
  return response.data.data;
}

export async function fetchSituacoesCampo() {
  const response = await apiClient.get<ApiResponse<SituacaoCampo[]>>('/situacao-campo', { timeout: 30_000 });
  if (response.data.code !== 200 || !response.data.status) throw new Error(response.data.message || 'Nao foi possivel buscar situacoes de campo.');
  return response.data.data;
}

export async function fetchSituacoesBackoffice() {
  const response = await apiClient.get<ApiResponse<SituacaoBackoffice[]>>('/situacao-backoffice', { timeout: 30_000 });
  if (response.data.code !== 200 || !response.data.status) throw new Error(response.data.message || 'Nao foi possivel buscar situacoes de backoffice.');
  return response.data.data;
}
