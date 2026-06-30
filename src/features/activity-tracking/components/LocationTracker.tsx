import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../../auth/context/AuthContext';
import { useLocationTracking } from '../hooks/useLocationTracking';

/**
 * Componente invisivel: liga o rastreamento de coordenadas em primeiro plano enquanto o agente
 * esta autenticado. Verifica a virada de hora a cada ~10 min e captura no maximo 1 ponto por
 * hora (teto de 24/dia). Montado dentro do stack autenticado.
 */
export function LocationTracker() {
  const database = useSQLiteContext();
  const { session } = useAuth();

  useLocationTracking(database, session?.agent.guid);

  return null;
}
