import './global.css';

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/features/auth/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { migrateDatabase } from './src/shared/database/migrations';
import { NetworkProvider } from './src/shared/context/NetworkContext';
import { queryClient } from './src/shared/query/queryClient';

export default function App() {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <SQLiteProvider databaseName="deep-agente.db" onInit={migrateDatabase}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <AppNavigator />
              </NavigationContainer>
            </AuthProvider>
          </QueryClientProvider>
        </SQLiteProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
