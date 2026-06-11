import type { SQLiteDatabase } from 'expo-sqlite';

import type { AuthSession } from '../types/auth';

type StoredSession = {
  token: string;
  agent_guid: string;
  agent_name: string;
  agent_cpf: string;
  agent_type: string;
  agent_type_guid: string;
  agent_type_name: string;
};

export async function loadSession(database: SQLiteDatabase): Promise<AuthSession | null> {
  const session = await database.getFirstAsync<StoredSession>('SELECT * FROM auth_session WHERE id = 1');

  if (!session) return null;

  return {
    token: session.token,
    agent: {
      guid: session.agent_guid,
      nome: session.agent_name,
      cpf: session.agent_cpf,
      tipo: session.agent_type,
      tipo_agente: {
        guid: session.agent_type_guid,
        nome: session.agent_type_name,
      },
    },
  };
}

export async function saveSession(database: SQLiteDatabase, session: AuthSession) {
  await database.runAsync(
    `INSERT OR REPLACE INTO auth_session (
      id, token, agent_guid, agent_name, agent_cpf, agent_type,
      agent_type_guid, agent_type_name, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.token,
    session.agent.guid,
    session.agent.nome,
    session.agent.cpf,
    session.agent.tipo,
    session.agent.tipo_agente.guid,
    session.agent.tipo_agente.nome,
    new Date().toISOString(),
  );
}

export async function clearSession(database: SQLiteDatabase) {
  await database.runAsync('DELETE FROM auth_session WHERE id = 1');
}
