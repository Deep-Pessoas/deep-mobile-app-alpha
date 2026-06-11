import type { SQLiteDatabase } from 'expo-sqlite';

export type SyncQueueItem = {
  id: number;
  method: string;
  endpoint: string;
  payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
};

export async function enqueueRequest(
  database: SQLiteDatabase,
  request: { method: string; endpoint: string; payload?: unknown },
) {
  return database.runAsync(
    'INSERT INTO sync_queue (method, endpoint, payload, created_at) VALUES (?, ?, ?, ?)',
    request.method,
    request.endpoint,
    request.payload === undefined ? null : JSON.stringify(request.payload),
    new Date().toISOString(),
  );
}

export async function listPendingRequests(database: SQLiteDatabase) {
  return database.getAllAsync<SyncQueueItem>('SELECT * FROM sync_queue ORDER BY id ASC');
}

export async function removePendingRequest(database: SQLiteDatabase, id: number) {
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function markRequestFailure(database: SQLiteDatabase, id: number, error: string) {
  await database.runAsync(
    'UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    error,
    id,
  );
}
