import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { logActivity } from '../services/activityRepository';
import { currentHourBucket, getLastTrackingBucket, setLastTrackingBucket } from '../services/trackingState';
import { getTrackingFix } from '../../form-fill/services/locationService';

// Periodicidade do "tick" que verifica se entramos em uma nova hora. NAO e a frequencia de
// captura — o GPS so e acionado quando o balde de hora muda. Mantem o ponto de cada hora
// proximo do inicio dela, com ticks praticamente gratuitos (apenas comparacao em memoria).
const TRACKING_CHECK_INTERVAL_MS = 10 * 60_000;

/**
 * Rastreamento HORARIO de coordenadas, apenas em primeiro plano (app ativo). Resumo por hora:
 * no maximo UMA captura por hora => teto de 24 linhas/dia. O teto e garantido por um marcador
 * persistente (tracking_state), entao reabrir o app na mesma hora NAO gera ponto extra.
 *
 * Tudo e leve e nao impacta a fluidez: os ticks fazem so uma comparacao de string em memoria;
 * o GPS (fix fresco) so dispara na virada de hora; a gravacao e fire-and-forget. Quando o app
 * e minimizado, os timers de JS sao suspensos e o AppState ainda barra qualquer captura.
 */
export function useLocationTracking(database: SQLiteDatabase, agentGuid: string | null | undefined) {
  useEffect(() => {
    if (!agentGuid) return;

    let cancelled = false;
    // Evita capturas sobrepostas se um fix de GPS demorar mais que o intervalo do tick.
    let capturing = false;
    // Ultimo balde de hora ja capturado (carregado do banco uma vez; depois mantido em memoria).
    let lastBucket: string | null = null;
    let loadedBucket = false;

    const capture = async () => {
      if (cancelled || capturing || AppState.currentState !== 'active') return;
      capturing = true;
      try {
        if (!loadedBucket) {
          lastBucket = await getLastTrackingBucket(database, agentGuid);
          loadedBucket = true;
          if (cancelled) return;
        }

        const bucket = currentHourBucket();
        if (bucket === lastBucket) return; // ja capturou nesta hora

        const coords = await getTrackingFix();
        // GPS indisponivel: NAO marca a hora — tenta de novo no proximo tick (nao "queima" a hora).
        if (cancelled || !coords) return;

        await logActivity(database, {
          agenteGuid: agentGuid,
          tipo: 'rastreiamento',
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        lastBucket = bucket;
        void setLastTrackingBucket(database, agentGuid, bucket);
      } finally {
        capturing = false;
      }
    };

    // Tenta uma captura ao montar (cobre a hora atual se ainda nao houver ponto) + a cada tick.
    void capture();
    const interval = setInterval(() => {
      void capture();
    }, TRACKING_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [database, agentGuid]);
}
