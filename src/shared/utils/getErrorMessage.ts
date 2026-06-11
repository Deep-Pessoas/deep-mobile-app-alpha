import axios from 'axios';

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || 'Nao foi possivel conectar com a API.';
  }

  return error instanceof Error ? error.message : fallback;
}
