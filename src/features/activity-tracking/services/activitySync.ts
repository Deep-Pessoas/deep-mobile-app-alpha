import type { SQLiteDatabase } from 'expo-sqlite';

import { apiClient } from '../../../shared/api/apiClient';
import { getOrCreateDeviceId } from '../../../shared/device/deviceIdentity';
import { deleteActivities, listActivities, type ActivityRow } from './activityRepository';

type ActivitiesResponse = {
  code?: number;
};

// Cada linha vira um item do array `dados`. Apenas campos planos — sem objeto/array aninhado.
// `client_id` (o id local, monotonico e nunca reutilizado) + o `device_id` do body formam a
// chave natural de deduplicacao no servidor: um reenvio (resposta perdida) nao gera duplicata.
function toPayloadItem(row: ActivityRow) {
  return {
    client_id: row.id,
    tipo: row.tipo,
    registro_guid: row.registro_guid,
    situacao_backoffice_guid: row.situacao_backoffice_guid,
    registro_nome: row.registro_nome,
    registro_endereco: row.registro_endereco,
    latitude: row.latitude,
    longitude: row.longitude,
    ocorrido_em: row.ocorrido_em,
  };
}

// Evita envios concorrentes (ex.: flush no foco da tela + flush ao tocar em "Enviar").
let flushing = false;

/**
 * Envia TODAS as atividades pendentes do agente em UMA requisicao
 * (POST /agente-ativdades-mobile, body { agente_id, equipe_id, grupo_id, device_id, dados: [...] }).
 * Ao receber code=200, apaga do banco as linhas enviadas. E best-effort: qualquer falha e
 * engolida e as linhas permanecem para a proxima tentativa — NUNCA pode impedir a sincronizacao
 * dos preenchimentos.
 */
export async function flushActivities(database: SQLiteDatabase, agentGuid: string): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const rows = await listActivities(database, agentGuid);
    if (rows.length === 0) return;

    // Equipe/grupo (mesmos GUIDs usados no resto do sync) e o codigo da instalacao. So sao
    // lidos quando ha algo para enviar — sem custo no foco da tela quando a fila esta vazia.
    const [deviceId, profile] = await Promise.all([
      getOrCreateDeviceId(database),
      database.getFirstAsync<{ team_guid: string | null; group_guid: string | null }>(
        'SELECT team_guid, group_guid FROM agent_profiles WHERE guid = ?',
        agentGuid,
      ),
    ]);

    const response = await apiClient.post<ActivitiesResponse>('/agente-ativdades-mobile', {
      agente_id: agentGuid,
      equipe_id: profile?.team_guid ?? null,
      grupo_id: profile?.group_guid ?? null,
      device_id: deviceId,
      dados: rows.map(toPayloadItem),
    });

    if (response.data?.code === 200) {
      await deleteActivities(database, rows.map((row) => row.id));
    }
  } catch {
    // Falha aqui nunca pode impedir a sincronizacao dos preenchimentos.
  } finally {
    flushing = false;
  }
}
