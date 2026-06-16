import type { SQLiteDatabase } from 'expo-sqlite';

import { logActivity } from './activityRepository';
import type { Coordinates } from '../../form-fill/services/locationService';
import { getTrackingCoordinates } from '../../form-fill/services/locationService';

// Le a situacao de backoffice atual do registro (no momento do evento). Registros sem base
// (BASELESS_GUID) e sinteticos simplesmente nao constam — retorna null.
async function readRecordStatus(database: SQLiteDatabase, recordGuid: string): Promise<string | null> {
  try {
    const row = await database.getFirstAsync<{ backoffice_status_guid: string | null }>(
      'SELECT backoffice_status_guid FROM offline_records WHERE guid = ?',
      recordGuid,
    );
    return row?.backoffice_status_guid ?? null;
  } catch {
    return null;
  }
}

// Momento do login. Equipe/grupo do agente vao no cabecalho do POST (equipe_id/grupo_id) — o
// servidor enriquece o restante a partir dos seus proprios dados; aqui so registramos o evento.
export async function logLogin(database: SQLiteDatabase, agentGuid: string): Promise<void> {
  await logActivity(database, { agenteGuid: agentGuid, tipo: 'login' });
}

// Momento em que o agente recebeu o formulario. Form/base/contagem sao derivaveis no servidor
// pela equipe (equipe_id do cabecalho) — aqui basta o carimbo temporal do evento.
export async function logFormReceived(database: SQLiteDatabase, agentGuid: string): Promise<void> {
  await logActivity(database, { agenteGuid: agentGuid, tipo: 'formulario_recebido' });
}

/** registro_primeira_abertura: clique em "Preencher" — data/hora, coordenadas e situacao atual. */
export async function logRecordOpen(database: SQLiteDatabase, agentGuid: string, recordGuid: string): Promise<void> {
  const [coords, situacao] = await Promise.all([
    getTrackingCoordinates(),
    readRecordStatus(database, recordGuid),
  ]);
  await logActivity(database, {
    agenteGuid: agentGuid,
    tipo: 'abertura_registro',
    registroGuid: recordGuid,
    situacaoBackofficeGuid: situacao,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  });
}

/**
 * Encerramento do registro: conclusao do preenchimento offline OU registro de situacao de campo.
 * Reaproveita as coordenadas ja capturadas (alta precisao) no momento da conclusao.
 */
export async function logRecordClose(
  database: SQLiteDatabase,
  agentGuid: string,
  recordGuid: string,
  coords: Coordinates | null,
): Promise<void> {
  const situacao = await readRecordStatus(database, recordGuid);
  await logActivity(database, {
    agenteGuid: agentGuid,
    tipo: 'encerramento_registro',
    registroGuid: recordGuid,
    situacaoBackofficeGuid: situacao,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  });
}
