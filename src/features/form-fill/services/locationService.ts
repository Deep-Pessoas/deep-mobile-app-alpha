import * as Location from 'expo-location';

export type Coordinates = { latitude: string; longitude: string };

/**
 * Pede a permissao de localizacao em primeiro plano (best-effort). Chamado na tela de login
 * para que, dali em diante, o monitoramento (abertura de registro e rastreamento) sempre tenha
 * coordenadas — sem precisar pedir permissao no meio do uso. Retorna se foi concedida; o login
 * NUNCA deve ser bloqueado por isso.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Obtem a coordenada do aparelho para o preenchimento em curso (as variaveis latitude/longitude
 * enviadas no topo do registro, fora de `dados`). Cada preenchimento — formulario com base,
 * sem base ou situacao de campo — captura a SUA propria coordenada no momento em que e concluido.
 * Nao e global nem derivada do campo `mult_capturas`. Retorna null quando a permissao e negada
 * ou o GPS nao responde; o chamador bloqueia a conclusao nesse caso.
 */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    // Timeout defensivo: o GPS de alta precisao pode demorar muito (ou nunca responder) em
    // local fechado/sinal fraco. Sem isto, a conclusao do preenchimento ficava aguardando
    // indefinidamente. Se o fix novo nao vier a tempo, cai para a ultima posicao conhecida;
    // se nem isso existir, retorna null e o chamador bloqueia a conclusao pedindo o GPS.
    const position =
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15000)) ??
      (await Location.getLastKnownPositionAsync());
    if (!position) return null;
    return {
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    };
  } catch {
    return null;
  }
}

/**
 * Coordenada "leve" para o MONITORAMENTO (abertura de registro e rastreamento). Diferente de
 * getCurrentCoordinates, NUNCA pede permissao (so usa a ja concedida) e prioriza a ultima
 * posicao conhecida — instantanea, sem ligar o GPS — para nao travar a navegacao nem o app.
 * Retorna null silenciosamente se nao ha permissao ou posicao disponivel; o evento ainda e
 * registrado, so sem coordenadas.
 */
export async function getTrackingCoordinates(): Promise<Coordinates | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return null;
    // Prioriza a ultima posicao conhecida (instantanea). Se nao houver, pede um fix novo —
    // mas com timeout, para um GPS travado nunca segurar a promise indefinidamente.
    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8000));
    if (!position) return null;
    return {
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    };
  } catch {
    return null;
  }
}

/**
 * Fix "fresco" para o RASTREAMENTO horario. Diferente de getTrackingCoordinates, prioriza uma
 * posicao nova (precisao Balanced, com timeout), caindo para a ultima conhecida so se o fix
 * demorar. Como roda no maximo 1x por hora, o custo de bateria e irrelevante e a posicao
 * reflete onde o agente realmente esta naquela hora. Tambem NUNCA pede permissao.
 */
export async function getTrackingFix(): Promise<Coordinates | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const position =
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8000)) ??
      (await Location.getLastKnownPositionAsync());
    if (!position) return null;
    return {
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    };
  } catch {
    return null;
  }
}

// Resolve com `null` se a promise nao concluir dentro de `ms` (para um fix de GPS travado).
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
