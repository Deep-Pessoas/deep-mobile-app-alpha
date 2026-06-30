import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 17;

async function ensureRecordsSearchTriggers(database: SQLiteDatabase) {
  await database.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS offline_records_fts USING fts5(
      name,
      address,
      street,
      customer_code,
      content = 'offline_records',
      content_rowid = 'rowid',
      tokenize = 'unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER IF NOT EXISTS offline_records_fts_insert AFTER INSERT ON offline_records BEGIN
      INSERT INTO offline_records_fts(rowid, name, address, street, customer_code)
      VALUES (new.rowid, new.name, new.address, new.street, new.customer_code);
    END;

    CREATE TRIGGER IF NOT EXISTS offline_records_fts_delete AFTER DELETE ON offline_records BEGIN
      INSERT INTO offline_records_fts(offline_records_fts, rowid, name, address, street, customer_code)
      VALUES ('delete', old.rowid, old.name, old.address, old.street, old.customer_code);
    END;

    CREATE TRIGGER IF NOT EXISTS offline_records_fts_update AFTER UPDATE ON offline_records BEGIN
      INSERT INTO offline_records_fts(offline_records_fts, rowid, name, address, street, customer_code)
      VALUES ('delete', old.rowid, old.name, old.address, old.street, old.customer_code);
      INSERT INTO offline_records_fts(rowid, name, address, street, customer_code)
      VALUES (new.rowid, new.name, new.address, new.street, new.customer_code);
    END;
  `);
}

export async function migrateDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    await ensureRecordsSearchTriggers(database);
    return;
  }

  // Todas as etapas de migracao rodam em UMA transacao e o PRAGMA user_version so e gravado no
  // fim dela. Se qualquer passo falhar (app encerrado, erro de IO), a transacao inteira e
  // revertida (ROLLBACK) e o user_version NAO avanca — o proximo boot re-executa o passo do
  // zero, sem deixar o schema "meio aplicado" (ex.: um ADD COLUMN que ja existe), o que faria
  // o onInit lancar e impediria o app de abrir.
  await database.execAsync('BEGIN');
  try {
  if (currentVersion === 0) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `);
  }

  if (currentVersion < 2) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS auth_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        token TEXT NOT NULL,
        agent_guid TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        agent_cpf TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        agent_type_guid TEXT NOT NULL,
        agent_type_name TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  if (currentVersion < 3) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS agent_profiles (
        guid TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        cpf TEXT NOT NULL,
        phone TEXT,
        agent_type_guid TEXT NOT NULL,
        contract_guid TEXT NOT NULL,
        team_guid TEXT NOT NULL,
        team_name TEXT,
        group_guid TEXT NOT NULL,
        group_name TEXT,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_sync_state (
        agent_guid TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        records_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS offline_contracts (
        guid TEXT PRIMARY KEY NOT NULL,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_groups (
        guid TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_teams (
        guid TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        contract_guid TEXT,
        group_guid TEXT,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_forms (
        guid TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        contract_guid TEXT,
        team_guid TEXT,
        number TEXT,
        is_main INTEGER NOT NULL DEFAULT 0,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_records (
        guid TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        address TEXT,
        street TEXT,
        neighborhood TEXT,
        customer_code TEXT,
        latitude REAL,
        longitude REAL,
        team_guid TEXT,
        contract_guid TEXT,
        agent_guid TEXT,
        field_record_guid TEXT,
        backoffice_status_guid TEXT,
        created_at TEXT,
        modified_at TEXT,
        visits INTEGER NOT NULL DEFAULT 0,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_backoffice (
        guid TEXT PRIMARY KEY NOT NULL,
        record_guid TEXT NOT NULL,
        status_guid TEXT,
        contract_guid TEXT,
        team_guid TEXT,
        agent_guid TEXT,
        created_at TEXT,
        status_name TEXT,
        raw_json TEXT NOT NULL,
        FOREIGN KEY (record_guid) REFERENCES offline_records(guid) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_offline_records_team ON offline_records(team_guid);
      CREATE INDEX IF NOT EXISTS idx_offline_records_contract ON offline_records(contract_guid);
      CREATE INDEX IF NOT EXISTS idx_offline_records_agent ON offline_records(agent_guid);
      CREATE INDEX IF NOT EXISTS idx_offline_records_status ON offline_records(backoffice_status_guid);
      CREATE INDEX IF NOT EXISTS idx_offline_backoffice_record ON offline_backoffice(record_guid);
      CREATE INDEX IF NOT EXISTS idx_offline_backoffice_status ON offline_backoffice(status_guid);
    `);
  }

  if (currentVersion < 4) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_situacoes_campo (
        guid TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        cor TEXT,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_situacoes_backoffice (
        guid TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        cor TEXT,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  if (currentVersion < 5) {
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_records_name ON offline_records(name);
      CREATE INDEX IF NOT EXISTS idx_offline_records_address ON offline_records(address);
      CREATE INDEX IF NOT EXISTS idx_offline_records_customer_code ON offline_records(customer_code);
      CREATE INDEX IF NOT EXISTS idx_offline_records_street ON offline_records(street);
    `);
  }

  if (currentVersion < 6) {
    await database.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS offline_records_fts USING fts5(
        name,
        address,
        street,
        customer_code,
        content = 'offline_records',
        content_rowid = 'rowid',
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS offline_records_fts_insert AFTER INSERT ON offline_records BEGIN
        INSERT INTO offline_records_fts(rowid, name, address, street, customer_code)
        VALUES (new.rowid, new.name, new.address, new.street, new.customer_code);
      END;

      CREATE TRIGGER IF NOT EXISTS offline_records_fts_delete AFTER DELETE ON offline_records BEGIN
        INSERT INTO offline_records_fts(offline_records_fts, rowid, name, address, street, customer_code)
        VALUES ('delete', old.rowid, old.name, old.address, old.street, old.customer_code);
      END;

      CREATE TRIGGER IF NOT EXISTS offline_records_fts_update AFTER UPDATE ON offline_records BEGIN
        INSERT INTO offline_records_fts(offline_records_fts, rowid, name, address, street, customer_code)
        VALUES ('delete', old.rowid, old.name, old.address, old.street, old.customer_code);
        INSERT INTO offline_records_fts(rowid, name, address, street, customer_code)
        VALUES (new.rowid, new.name, new.address, new.street, new.customer_code);
      END;

      INSERT INTO offline_records_fts(offline_records_fts) VALUES ('rebuild');
    `);
  }

  if (currentVersion < 7) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_form_drafts (
        record_guid TEXT NOT NULL,
        form_guid TEXT NOT NULL,
        values_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (record_guid, form_guid)
      );

      CREATE INDEX IF NOT EXISTS idx_offline_form_drafts_updated_at
      ON offline_form_drafts(updated_at);
    `);
  }

  if (currentVersion < 8) {
    await database.execAsync(`
      ALTER TABLE offline_form_drafts ADD COLUMN state_json TEXT;
      ALTER TABLE offline_form_drafts ADD COLUMN dados_json TEXT;
      ALTER TABLE offline_form_drafts ADD COLUMN status TEXT NOT NULL DEFAULT 'Preenchendo offline';
      ALTER TABLE offline_form_drafts ADD COLUMN updated_at_ms INTEGER NOT NULL DEFAULT 0;

      UPDATE offline_form_drafts
      SET state_json = values_json,
          dados_json = json_object('dados', json(values_json)),
          updated_at_ms = CAST(strftime('%s', updated_at) AS INTEGER) * 1000
      WHERE state_json IS NULL;
    `);
  }

  if (currentVersion < 9) {
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_form_drafts_status_record
      ON offline_form_drafts(status, record_guid);
    `);
  }

  if (currentVersion < 10) {
    await database.execAsync(`
      ALTER TABLE offline_records ADD COLUMN base_dados_guid TEXT;
    `);
    await database.execAsync(`
      UPDATE offline_records SET base_dados_guid = guid;
    `);
  }

  if (currentVersion < 11) {
    await database.execAsync(`
      UPDATE offline_records SET base_dados_guid = guid WHERE base_dados_guid IS NULL;
    `);
  }

  if (currentVersion < 12) {
    await database.execAsync(`
      ALTER TABLE auth_session ADD COLUMN equipe_guid TEXT;
      ALTER TABLE auth_session ADD COLUMN grupo_equipe_guid TEXT;
    `);
  }

  if (currentVersion < 13) {
    // Recria offline_form_drafts com identidade unica por preenchimento (id), em vez da
    // antiga PK (record_guid, form_guid) — que so permitia UM rascunho por registro+formulario
    // e fazia situacao de campo / preenchimentos sem base sobrescreverem uns aos outros.
    // Linhas existentes recebem id deterministico "record_guid:form_guid".
    await database.execAsync(`
      CREATE TABLE offline_form_drafts_v13 (
        id TEXT PRIMARY KEY NOT NULL,
        record_guid TEXT NOT NULL,
        form_guid TEXT NOT NULL,
        values_json TEXT NOT NULL,
        state_json TEXT,
        dados_json TEXT,
        status TEXT NOT NULL DEFAULT 'Preenchendo offline',
        updated_at TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL DEFAULT 0
      );

      INSERT INTO offline_form_drafts_v13
        (id, record_guid, form_guid, values_json, state_json, dados_json, status, updated_at, updated_at_ms)
      SELECT
        record_guid || ':' || form_guid,
        record_guid, form_guid, values_json, state_json, dados_json, status, updated_at, updated_at_ms
      FROM offline_form_drafts;

      DROP TABLE offline_form_drafts;
      ALTER TABLE offline_form_drafts_v13 RENAME TO offline_form_drafts;

      CREATE INDEX IF NOT EXISTS idx_offline_form_drafts_updated_at
        ON offline_form_drafts(updated_at);
      CREATE INDEX IF NOT EXISTS idx_offline_form_drafts_status_record
        ON offline_form_drafts(status, record_guid);
      CREATE INDEX IF NOT EXISTS idx_offline_form_drafts_record_form
        ON offline_form_drafts(record_guid, form_guid);
    `);
  }

  if (currentVersion < 14) {
    // Coordenada do proprio preenchimento (latitude/longitude do topo do registro, fora de
    // `dados`), capturada do GPS no momento da conclusao. Uma por preenchimento — formulario
    // com/sem base e situacao de campo. Nao e global nem vem do campo mult_capturas.
    await database.execAsync(`
      ALTER TABLE offline_form_drafts ADD COLUMN latitude TEXT;
      ALTER TABLE offline_form_drafts ADD COLUMN longitude TEXT;
    `);
  }

  if (currentVersion < 15) {
    // Identidade unica desta INSTALACAO do app. Persistida no banco local: sobrevive ao uso
    // normal (e ao "limpar cache", que nao apaga o DB), mas e recriada quando o usuario limpa
    // os DADOS do app ou reinstala — gerando um novo codigo, exatamente como pedido. Enviada
    // no body do /auth/login (campo mobile_app_device_id). NUNCA e apagada no logout.
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS device_identity (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        device_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Fila local de atividades do agente para monitoramento (login, formulario recebido,
    // abertura/encerramento de registro e rastreamento de coordenadas). Tudo e gravado aqui de
    // forma fire-and-forget para nao impactar a fluidez do app e enviado em UMA requisicao na
    // tela de Sincronizacao (POST /agente-ativdades-mobile); ao receber code=200, as linhas
    // enviadas sao apagadas.
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS agente_atividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agente_guid TEXT NOT NULL,
        tipo TEXT NOT NULL,
        registro_guid TEXT,
        situacao_backoffice_guid TEXT,
        latitude TEXT,
        longitude TEXT,
        ocorrido_em TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_agente_atividades_agente
        ON agente_atividades(agente_guid, id);
    `);
  }

  if (currentVersion < 16) {
    // Marcador persistente do ultimo "balde de hora" (YYYY-MM-DDTHH) ja capturado no
    // rastreamento, por agente. Sobrevive ao esvaziamento da fila de atividades (que apaga as
    // linhas no envio) e a reinicios do app — garantindo no maximo UMA captura por hora
    // (teto de 24 linhas/dia), em vez de uma a cada minuto.
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS tracking_state (
        agente_guid TEXT PRIMARY KEY NOT NULL,
        last_hour_bucket TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  if (currentVersion < 17) {
    // Nome e endereco do registro no momento do evento (eventos de registro). Snapshot — evita
    // depender de um JOIN no envio e preserva o valor mesmo se o registro mudar/sair do banco.
    // Nomes alinhados com a API (registro_nome / registro_endereco) de ponta a ponta.
    await database.execAsync(`
      ALTER TABLE agente_atividades ADD COLUMN registro_nome TEXT;
      ALTER TABLE agente_atividades ADD COLUMN registro_endereco TEXT;
    `);
  }

    await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK').catch(() => undefined);
    throw error;
  }

  await ensureRecordsSearchTriggers(database);
}
