import * as Network from 'expo-network';
import axios, { type InternalAxiosRequestConfig } from 'axios';

import { env } from '../config/env';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  params: {
    mobile: true,
    app_service: 'v2',
  },
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export function setApiAccessToken(token: string | null) {
  apiClient.defaults.headers.common.Authorization = token ? `Bearer ${token}` : undefined;
}

// Verifica conectividade antes de qualquer requisicao ao backend
apiClient.interceptors.request.use(async (config) => {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false || state.isInternetReachable === false) {
      return Promise.reject(
        Object.assign(new Error('Sem conexão com a internet.'), { isNetworkError: true }),
      );
    }
  } catch {
    // Se a verificacao falhar, permite a requisicao prosseguir
  }
  return config;
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _sessionRetry?: boolean };

/**
 * Resolve com o novo token apos o usuario reautenticar pelo modal de sessao expirada,
 * ou com `null` se o usuario cancelar/sair.
 */
type SessionExpiredHandler = () => Promise<string | null>;

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let pendingReauth: Promise<string | null> | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler;
}

// Rotas de autenticacao nao devem disparar o fluxo de "sessao expirada" (ex.: senha
// incorreta no login tambem pode retornar 401).
const AUTH_ROUTES = ['/auth/login', '/auth/verificar-acesso', '/auth/primeiro-acesso'];

function isAuthRoute(url?: string) {
  if (!url) return false;
  return AUTH_ROUTES.some((route) => url.includes(route));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && config && !config._sessionRetry && !isAuthRoute(config.url) && sessionExpiredHandler) {
      config._sessionRetry = true;

      if (!pendingReauth) {
        pendingReauth = sessionExpiredHandler().finally(() => {
          pendingReauth = null;
        });
      }

      const token = await pendingReauth;

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  },
);
