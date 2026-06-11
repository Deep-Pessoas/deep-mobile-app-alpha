import { createContext, useContext, type RefObject } from 'react';
import type { ScrollView } from 'react-native';

/**
 * Contexto compartilhado pelo formulario dinamico para rolar automaticamente o
 * campo focado para cima do teclado (Android).
 *
 * - `scrollViewRef`: referencia ao ScrollView do formulario.
 * - `fieldOffsets`: mapa (fieldId -> y relativo ao conteudo do ScrollView), preenchido
 *   via `onLayout` pelos containers de campo. Evita usar `measureLayout`, que em apps
 *   com a New Architecture pode lancar "ref.measureLayout must be called with a ref to
 *   a native component" e nao chega a rolar a tela.
 */
export type KeyboardScrollContextValue = {
  fieldOffsets: RefObject<Map<string, number>>;
  scrollViewRef: RefObject<ScrollView | null>;
};

export const KeyboardScrollContext = createContext<KeyboardScrollContextValue | null>(null);

export function useKeyboardScrollContext() {
  return useContext(KeyboardScrollContext);
}
