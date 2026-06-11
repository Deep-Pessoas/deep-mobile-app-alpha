import { createContext, useContext } from 'react';

import type { AppScreen } from '../components/AuthenticatedLayout';

type AppNavContextValue = {
  navigateTo: (screen: AppScreen) => void;
};

export const AppNavContext = createContext<AppNavContextValue>({
  navigateTo: () => {},
});

export function useAppNav() {
  return useContext(AppNavContext);
}
