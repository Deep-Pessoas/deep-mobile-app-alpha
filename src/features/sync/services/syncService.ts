import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { apiClient } from '../../../shared/api/apiClient';
import { getErrorMessage } from '../../../shared/utils/getErrorMessage';
import { getFormBaseDados } from '../../consolidated-data/services/offlineQueries';
import { collectFieldsByType } from '../../form-fill/engine/formEngine';
import { deleteDraftDirectory } from '../../form-fill/services/draftFileService';
import { clearFillRecordDraft, parseFields } from '../../form-fill/services/fillRecordService';
import type { DynamicField, FormValue, FormValues } from '../../form-fill/types/form';
import type { SyncableDraft, SyncResult } from '../types/sync';

type AgentProfileRow = {
  guid: string;
  contract_guid: string;
  team_guid: string;
  group_guid: string;
};

type DraftRow = {
  dados_json: string | null;
  form_guid: string;
  latitude: string | null;
  longitude: string | null;
  record_guid: string;
  state_json: string | null;
  updated_at: string;
  values_json: string | null;
};

type RecordRow = {
  base_dados_guid: string | null;
};

type SyncApiResponse = {
  codigo?: number;
  status?: string;
  mensagem?: string;
  dados?: {
    registro_campo_guid?: string;
    visita_guid?: string;
    base_dados_guid?: string;
  };
};

// Upload de anexos agora e via multipart/form-data, streamado direto do disco (nunca base64
// nem bufferizado inteiro em memoria) — timeout generoso porque o tempo de upload ainda escala
// com o tamanho/quantidade de arquivos, mesmo sem o overhead de memoria do base64.
const SYNC_TIMEOUT_MS = 300000;

function parseJsonObject(rawJson: string | null | undefined): Record<string, unknown> {
  if (!rawJson) return {};
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseFormValues(rawJson: string | null | undefined): FormValues {
  const parsed = parseJsonObject(rawJson);
  return parsed as FormValues;
}

function inferMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

function asStringArray(value: FormValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

type UploadFileRef = { uri: string; name: string; type: string; size: number };
type UploadFieldFiles = { field_id: string; files: UploadFileRef[] };

/**
 * Tamanho do arquivo em bytes (leitura do metadado, NÃO carrega o conteúdo).
 * Lança se o arquivo não existe ou está vazio — assim nunca tentamos enviar
 * (e nunca declaramos no manifesto) um arquivo que o servidor não conseguiria
 * receber íntegro. O preenchimento fica retido para reenvio.
 */
function requireFileSize(uri: string, fileName: string, fieldId: string): number {
  let size: number | null = null;
  try {
    size = new File(uri).size;
  } catch {
    size = null;
  }
  if (size == null || size <= 0) {
    throw new Error(`Arquivo "${fileName}" do campo ${fieldId} não foi encontrado ou está vazio.`);
  }
  return size;
}

/**
 * Resolve os arquivos dos campos "upload" para referencias {uri, name, type, size} prontas
 * pra multipart/form-data — nunca le o conteudo do arquivo nem gera base64. O arquivo e
 * streamado direto do disco pela camada nativa quando a requisicao e enviada. O `size` vai
 * no manifesto enviado a API, que valida byte-a-byte que cada imagem chegou completa.
 */
function buildUploadFileRefs(uploadFields: DynamicField[], dados: FormValues, stateValues: FormValues): UploadFieldFiles[] {
  const uploads: UploadFieldFiles[] = [];

  for (const field of uploadFields) {
    const fileNames = asStringArray(dados[field.id]);
    if (fileNames.length === 0) continue;

    const uris = asStringArray(stateValues[field.id]);
    const files: UploadFileRef[] = [];

    // Tudo-ou-nada por preenchimento: cada nome em `dados[field]` precisa ter seu arquivo
    // na MESMA posicao em `uris`. Se um arquivo referenciado nao existir, falha o
    // preenchimento inteiro (mantido para reenvio) em vez de enviar uma lista parcial e
    // desalinhada — o que apagaria o rascunho com dado faltando (falso positivo).
    for (let index = 0; index < fileNames.length; index += 1) {
      const uri = uris[index];
      if (!uri) {
        throw new Error(`Arquivo "${fileNames[index]}" do campo ${field.id} nao foi encontrado para envio.`);
      }
      const size = requireFileSize(uri, fileNames[index], field.id);
      files.push({ uri, name: fileNames[index], type: inferMimeType(fileNames[index]), size });
    }

    if (files.length > 0) {
      uploads.push({ field_id: field.id, files });
    }
  }

  return uploads;
}

const BASELESS_GUID = '00000000-0000-0000-0000-000000000000';

export async function getSyncableDrafts(database: SQLiteDatabase): Promise<SyncableDraft[]> {
  const rows = await database.getAllAsync<{
    id: string;
    dados_json: string | null;
    form_guid: string;
    form_name: string | null;
    record_guid: string;
    record_name: string | null;
    base_dados_guid: string | null;
    status: string;
    updated_at: string;
  }>(
    `SELECT
      drafts.id,
      drafts.record_guid,
      records.name AS record_name,
      records.base_dados_guid,
      drafts.form_guid,
      forms.name AS form_name,
      drafts.status,
      drafts.updated_at,
      drafts.dados_json
    FROM offline_form_drafts AS drafts
    LEFT JOIN offline_records AS records ON records.guid = drafts.record_guid
    LEFT JOIN offline_forms AS forms ON forms.guid = drafts.form_guid
    WHERE drafts.status = 'Preenchendo offline'
    ORDER BY drafts.updated_at DESC`,
  );

  return rows.map((row) => {
    const dados = parseJsonObject(row.dados_json).dados;
    const dadosObj = dados && typeof dados === 'object' && !Array.isArray(dados)
      ? (dados as Record<string, unknown>)
      : null;

    const fieldsCount = dadosObj ? Object.keys(dadosObj).length : 0;
    const situacao = dadosObj?.situacao;
    const isSituacaoDeCampo = !!(situacao && typeof situacao === 'object' && !Array.isArray(situacao));
    const situacaoTitulo = isSituacaoDeCampo
      ? String((situacao as Record<string, unknown>).titulo ?? '')
      : '';

    return {
      draftId: row.id,
      fieldsCount,
      formGuid: row.form_guid,
      formName: row.form_name ?? '',
      isBaseless: row.base_dados_guid === BASELESS_GUID,
      isSituacaoDeCampo,
      recordGuid: row.record_guid,
      recordName: row.record_name ?? '',
      situacaoTitulo,
      status: row.status as 'Rascunho' | 'Preenchendo offline',
      updatedAt: row.updated_at,
    };
  });
}

/**
 * Envia um preenchimento offline para a API e, em caso de sucesso (code === 200),
 * remove o rascunho e os arquivos locais correspondentes.
 *
 * Em caso de falha, o rascunho permanece salvo no aparelho para nova tentativa.
 */
export async function syncDraft(
  database: SQLiteDatabase,
  agentGuid: string,
  draft: SyncableDraft,
  onUploadProgress?: (ratio: number) => void,
): Promise<SyncResult> {
  const failure = (message: string): SyncResult => ({
    draftId: draft.draftId,
    formGuid: draft.formGuid,
    message,
    recordGuid: draft.recordGuid,
    recordName: draft.recordName,
    success: false,
  });

  try {
    const agentProfile = await database.getFirstAsync<AgentProfileRow>(
      'SELECT guid, contract_guid, team_guid, group_guid FROM agent_profiles WHERE guid = ?',
      agentGuid,
    );
    if (!agentProfile) {
      return failure('Perfil do agente nao encontrado nos dados offline.');
    }

    const formRow = await database.getFirstAsync<{ raw_json: string }>(
      'SELECT raw_json FROM offline_forms WHERE guid = ?',
      draft.formGuid,
    );
    if (!formRow) {
      return failure('Formulario nao encontrado nos dados offline.');
    }

    const draftRow = await database.getFirstAsync<DraftRow>(
      'SELECT record_guid, form_guid, dados_json, state_json, values_json, latitude, longitude, updated_at FROM offline_form_drafts WHERE id = ? LIMIT 1',
      draft.draftId,
    );
    if (!draftRow?.dados_json) {
      return failure('Dados do preenchimento nao encontrados nos dados offline.');
    }

    const recordRow = await database.getFirstAsync<RecordRow>(
      'SELECT base_dados_guid FROM offline_records WHERE guid = ?',
      draft.recordGuid,
    );
    if (!recordRow) {
      return failure('Registro nao encontrado nos dados offline.');
    }

    const baseDadosGuid = recordRow.base_dados_guid;
    if (typeof baseDadosGuid !== 'string' || !baseDadosGuid) {
      return failure('O registro nao possui "base_dados_guid" nos dados consolidados.');
    }

    const fields = parseFields(formRow.raw_json);
    const dados = (parseJsonObject(draftRow.dados_json).dados ?? {}) as FormValues;
    const stateValues = parseFormValues(draftRow.state_json ?? draftRow.values_json);

    const uploadFields = collectFieldsByType(fields, ['upload']);

    const uploads = buildUploadFileRefs(uploadFields, dados, stateValues);

    // Situação de Campo: o "campo" da foto e identificado pelo GUID da situacao selecionada
    // (mesma chave usada em dados[guid] e em situacao_campo_id) — nao por um literal "foto".
    const dadosRecord = dados as Record<string, unknown>;
    const situacaoData = dadosRecord.situacao as Record<string, unknown> | undefined;
    const situacaoCampoId = typeof situacaoData?.guid === 'string' ? situacaoData.guid : null;

    const situacaoFotoUris = asStringArray(stateValues['__situacao_foto__']);
    if (situacaoFotoUris.length > 0 && situacaoCampoId) {
      const uri = situacaoFotoUris[0];
      const fileName = uri.split('/').pop() ?? 'foto.jpg';
      const size = requireFileSize(uri, fileName, situacaoCampoId);
      uploads.push({ field_id: situacaoCampoId, files: [{ uri, name: fileName, type: inferMimeType(fileName), size }] });
    }

    // Coordenada do proprio preenchimento (capturada na conclusao). Nenhum preenchimento pode
    // ser enviado sem latitude/longitude — sem elas, falha o envio e mantem o rascunho.
    const latitude = draftRow.latitude ?? '';
    const longitude = draftRow.longitude ?? '';
    if (!latitude || !longitude) {
      return failure('Este preenchimento não possui localização (latitude/longitude). Refaça o preenchimento com o GPS ativo.');
    }

    // Manifesto: um item por arquivo anexado, com o tamanho exato em bytes. A API valida
    // que TODOS chegaram com o byte-count correto antes de criar a visita — se faltar ou
    // chegar incompleto, nada e salvo (rollback no servidor) e o rascunho fica para reenvio.
    const expectedUploads = uploads.flatMap((upload) =>
      upload.files.map((file) => ({ field_id: upload.field_id, name: file.name, size: file.size })),
    );

    const payloadJson = {
      contrato_id: agentProfile.contract_guid,
      base_dados_guid: baseDadosGuid,
      equipe_id: agentProfile.team_guid,
      agente_id: agentProfile.guid,
      form_id: draft.formGuid,
      dados,
      latitude,
      longitude,
      registro_campo_guid: '',
      form_base_dados: await getFormBaseDados(database),
      situacao_campo_id: situacaoCampoId,
      expected_uploads: expectedUploads,
      // created_at acompanha o envio de situacao de campo (data em que foi registrada).
      ...(situacaoCampoId ? { created_at: draftRow.updated_at } : {}),
    };

    // multipart/form-data: campo de texto "payload" (JSON sem os arquivos) + um arquivo por
    // imagem, streamado direto do disco pela camada nativa — nunca base64, nunca bufferizado
    // inteiro em memoria. "payload" precisa ser o primeiro campo (a API espera os metadados
    // antes dos arquivos pra saber a quem cada imagem pertence).
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payloadJson));
    for (const upload of uploads) {
      for (const file of upload.files) {
        formData.append(upload.field_id, {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as unknown as Blob);
      }
    }

    const response = await apiClient.post<SyncApiResponse>('/campo-visitas/registro', formData, {
      timeout: SYNC_TIMEOUT_MS,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onUploadProgress) return;
        // event.total inclui payload + arquivos; ratio chega a 1 quando o corpo
        // inteiro (todas as imagens) terminou de subir para o servidor.
        const total = event.total ?? 0;
        const ratio = total > 0 ? Math.min(1, event.loaded / total) : 0;
        onUploadProgress(ratio);
      },
    });

    // Sucesso apenas quando a API retorna exatamente: { codigo: 200, status: "sucesso", ... }
    const isSyncSuccess = response.data?.codigo === 200 && response.data?.status === 'sucesso';
    if (!isSyncSuccess) {
      return failure(response.data?.mensagem || 'A API retornou uma resposta inesperada ao processar o preenchimento.');
    }

    await clearFillRecordDraft(database, draft.draftId);
    deleteDraftDirectory(draft.draftId);

    return {
      draftId: draft.draftId,
      formGuid: draft.formGuid,
      recordGuid: draft.recordGuid,
      recordName: draft.recordName,
      success: true,
    };
  } catch (error) {
    return failure(getErrorMessage(error, 'Falha ao enviar o preenchimento.'));
  }
}

/**
 * Sincroniza todos os preenchimentos prontos, um por vez (uma requisicao por preenchimento).
 * Falhas em um item nao interrompem o envio dos demais.
 */
export async function syncAll(
  database: SQLiteDatabase,
  agentGuid: string,
  drafts: SyncableDraft[],
  onProgress?: (result: SyncResult, completed: number, total: number) => void,
  onUploadRatio?: (ratio: number) => void,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (let index = 0; index < drafts.length; index += 1) {
    // Reinicia o anel interno (upload de imagens) no começo de cada item.
    onUploadRatio?.(0);
    const result = await syncDraft(database, agentGuid, drafts[index], (ratio) => onUploadRatio?.(ratio));
    results.push(result);
    onProgress?.(result, index + 1, drafts.length);
  }

  return results;
}
