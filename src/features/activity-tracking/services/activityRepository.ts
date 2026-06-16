import type { SQLiteDatabase } from 'expo-sqlite';

export type ActivityType =
  | 'login'
  | 'formulario_recebido'
  | 'abertura_registro'
  | 'encerramento_registro'
  | 'rastreiamento';

export type ActivityInput = {
  agenteGuid: string;
  tipo: ActivityType;
  registroGuid?: string | null;
  situacaoBackofficeGuid?: string | null;
  registroNome?: string | null;
  registroEndereco?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  /** ISO do momento do evento. Default: agora. */
  ocorridoEm?: string;
};

export type ActivityRow = {
  id: number;
  agente_guid: string;
  tipo: string;
  registro_guid: string | null;
  situacao_backoffice_guid: string | null;
  registro_nome: string | null;
  registro_endereco: string | null;
  latitude: string | null;
  longitude: string | null;
  ocorrido_em: string;
};

/**
 * Grava uma atividade na fila local. E intencionalmente best-effort: qualquer falha e
 * engolida para que o monitoramento NUNCA quebre o fluxo do app nem trave a navegacao.
 * Deve ser chamada sempre em modo fire-and-forget (`void logActivity(...)`).
 */
export async function logActivity(database: SQLiteDatabase, input: ActivityInput): Promise<void> {
  try {
    const now = new Date().toISOString();
    await database.runAsync(
      `INSERT INTO agente_atividades
         (agente_guid, tipo, registro_guid, situacao_backoffice_guid, registro_nome, registro_endereco, latitude, longitude, ocorrido_em, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.agenteGuid,
      input.tipo,
      input.registroGuid ?? null,
      input.situacaoBackofficeGuid ?? null,
      input.registroNome ?? null,
      input.registroEndereco ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.ocorridoEm ?? now,
      now,
    );
  } catch {
    // Monitoramento e best-effort: nunca pode quebrar o fluxo do app.
  }
}

export async function listActivities(database: SQLiteDatabase, agentGuid: string): Promise<ActivityRow[]> {
  return database.getAllAsync<ActivityRow>(
    'SELECT * FROM agente_atividades WHERE agente_guid = ? ORDER BY id ASC',
    agentGuid,
  );
}

export async function deleteActivities(database: SQLiteDatabase, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(`DELETE FROM agente_atividades WHERE id IN (${placeholders})`, ...ids);
}
