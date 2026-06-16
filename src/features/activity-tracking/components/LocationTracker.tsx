import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../../auth/context/AuthContext';
import { useLocationTracking } from '../hooks/useLocationTracking';

/**
 * Componente invisivel: liga o rastreamento de coordenadas (1 min, primeiro plano) enquanto o
 * agente esta autenticado. Montado dentro do stack autenticado.
 */
export function LocationTracker() {
  const database = useSQLiteContext();
  const { session } = useAuth();

  useLocationTracking(database, session?.agent.guid);

  return null;
}
