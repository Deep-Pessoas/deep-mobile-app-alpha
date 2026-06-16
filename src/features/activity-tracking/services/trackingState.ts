import type { SQLiteDatabase } from 'expo-sqlite';

// "Balde de hora" do instante atual no formato YYYY-MM-DDTHH (UTC). Dois instantes na mesma
// hora compartilham o mesmo balde — base do teto de 1 rastreamento por hora.
export function currentHourBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

export async function getLastTrackingBucket(database: SQLiteDatabase, agentGuid: string): Promise<string | null> {
  try {
    const row = await database.getFirstAsync<{ last_hour_bucket: string }>(
      'SELECT last_hour_bucket FROM tracking_state WHERE agente_guid = ?',
      agentGuid,
    );
    return row?.last_hour_bucket ?? null;
  } catch {
    return null;
  }
}

export async function setLastTrackingBucket(database: SQLiteDatabase, agentGuid: string, bucket: string): Promise<void> {
  try {
    await database.runAsync(
      'INSERT OR REPLACE INTO tracking_state (agente_guid, last_hour_bucket, updated_at) VALUES (?, ?, ?)',
      agentGuid,
      bucket,
      new Date().toISOString(),
    );
  } catch {
    // Best-effort: na pior das hipoteses, uma hora pode gerar um ponto a mais apos um restart.
  }
}
