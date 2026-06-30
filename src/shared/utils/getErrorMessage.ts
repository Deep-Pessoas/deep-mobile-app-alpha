import axios from 'axios';

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    // A mensagem do servidor tem prioridade. Sem corpo util, diferencia "sem resposta"
    // (rede/timeout) de "respondeu com erro" (ex.: 500) — em vez de sempre dizer que nao
    // conseguiu conectar, o que era enganoso quando a API de fato respondeu.
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return 'Nao foi possivel conectar com a API. Verifique sua conexao.';
    return `A API respondeu com um erro (codigo ${error.response.status}).`;
  }

  return error instanceof Error ? error.message : fallback;
}
