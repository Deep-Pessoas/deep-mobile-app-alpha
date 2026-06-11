import { createContext, useContext, type RefObject } from 'react';
import type { ScrollView } from 'react-native';

/**
 * Contexto compartilhado pelo formulario dinamico para rolar o campo focado
 * para cima do teclado (Android).
 *
 * - scrollViewRef: referencia ao ScrollView do formulario.
 * - scrollY: offset vertical atual do ScrollView, atualizado via onScroll.
 *
 * O campo focado mede sua propria posicao na janela (measureInWindow) e, junto
 * com o topo do teclado e o scrollY atual, calcula exatamente quanto rolar.
 * Geometria ao vivo: funciona em qualquer formulario, com grupos aninhados e
 * campos de mesmo id em grupos diferentes (mede o no nativo do input focado).
 */
export type KeyboardScrollContextValue = {
  scrollViewRef: RefObject<ScrollView | null>;
  scrollY: RefObject<number>;
};

export const KeyboardScrollContext = createContext<KeyboardScrollContextValue | null>(null);

export function useKeyboardScrollContext() {
  return useContext(KeyboardScrollContext);
}
