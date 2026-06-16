import type { SQLiteDatabase } from 'expo-sqlite';

// Gerador de UUID v4 (mesmo formato usado em draftFileService). Suficiente para identificar
// uma instalacao — nao precisa ser criptografico.
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

// Cache em memoria: depois de lido/gerado uma vez, evita ir ao banco a cada login.
let cachedDeviceId: string | null = null;

/**
 * Retorna o codigo unico desta instalacao do app, gerando e persistindo um novo na primeira vez.
 *
 * Comportamento pedido: o codigo se mantem estavel durante o uso normal, mas se altera (novo
 * codigo) quando o usuario limpa os DADOS do app ou reinstala — pois a tabela `device_identity`
 * (e todo o banco local) e recriada do zero nesse caso. Observacao: no Android, "limpar cache"
 * NAO apaga o banco SQLite, entao o codigo so muda em "limpar dados"/reinstalacao (ou primeira
 * instalacao). Enviado no body do /auth/login como `mobile_app_device_id`.
 */
export async function getOrCreateDeviceId(database: SQLiteDatabase): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const row = await database.getFirstAsync<{ device_id: string }>(
    'SELECT device_id FROM device_identity WHERE id = 1',
  );

  if (row?.device_id) {
    cachedDeviceId = row.device_id;
    return row.device_id;
  }

  const deviceId = uuidv4();
  await database.runAsync(
    'INSERT OR REPLACE INTO device_identity (id, device_id, created_at) VALUES (1, ?, ?)',
    deviceId,
    new Date().toISOString(),
  );
  cachedDeviceId = deviceId;
  return deviceId;
}

// Util em testes/limpeza: descarta o cache em memoria (o proximo getOrCreateDeviceId vai reler
// do banco, gerando um novo codigo se o banco tiver sido limpo).
export function resetDeviceIdCache() {
  cachedDeviceId = null;
}
