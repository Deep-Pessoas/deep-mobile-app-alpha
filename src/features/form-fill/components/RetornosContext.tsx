import { createContext, useContext } from 'react';

type RetornosContextValue = {
  reprovados: ReadonlyMap<string, string>;
};

export const RetornosContext = createContext<RetornosContextValue>({
  reprovados: new Map(),
});

export function useRetornos(): ReadonlyMap<string, string> {
  return useContext(RetornosContext).reprovados;
}
