import * as Location from 'expo-location';

export type Coordinates = { latitude: string; longitude: string };

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
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return {
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    };
  } catch {
    return null;
  }
}
