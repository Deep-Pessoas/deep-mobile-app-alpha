import type { SQLiteDatabase } from 'expo-sqlite';

import { logActivity } from './activityRepository';
import type { Coordinates } from '../../form-fill/services/locationService';
import { getTrackingCoordinates } from '../../form-fill/services/locationService';

type RecordInfo = {
  situacaoBackofficeGuid: string | null;
  registroNome: string | null;
  registroEndereco: string | null;
};

// Snapshot do registro no momento do evento: situacao de backoffice, nome e endereco. O modo
// sem base usa um registro sintetico (nome "Preenchimento sem base", endereco/situacao null).
async function readRecordInfo(database: SQLiteDatabase, recordGuid: string): Promise<RecordInfo> {
  try {
    const row = await database.getFirstAsync<{
      backoffice_status_guid: string | null;
      name: string | null;
      address: string | null;
    }>(
      'SELECT backoffice_status_guid, name, address FROM offline_records WHERE guid = ?',
      recordGuid,
    );
    return {
      situacaoBackofficeGuid: row?.backoffice_status_guid ?? null,
      registroNome: row?.name ?? null,
      registroEndereco: row?.address ?? null,
    };
  } catch {
    return { situacaoBackofficeGuid: null, registroNome: null, registroEndereco: null };
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

/** registro_primeira_abertura: clique em "Preencher" — data/hora, coordenadas e snapshot do registro. */
export async function logRecordOpen(database: SQLiteDatabase, agentGuid: string, recordGuid: string): Promise<void> {
  const [coords, info] = await Promise.all([
    getTrackingCoordinates(),
    readRecordInfo(database, recordGuid),
  ]);
  await logActivity(database, {
    agenteGuid: agentGuid,
    tipo: 'abertura_registro',
    registroGuid: recordGuid,
    situacaoBackofficeGuid: info.situacaoBackofficeGuid,
    registroNome: info.registroNome,
    registroEndereco: info.registroEndereco,
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
  const info = await readRecordInfo(database, recordGuid);
  await logActivity(database, {
    agenteGuid: agentGuid,
    tipo: 'encerramento_registro',
    registroGuid: recordGuid,
    situacaoBackofficeGuid: info.situacaoBackofficeGuid,
    registroNome: info.registroNome,
    registroEndereco: info.registroEndereco,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  });
}
