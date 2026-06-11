import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ReauthModal } from '../features/auth/components/ReauthModal';
import { useAuth } from '../features/auth/context/AuthContext';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { OfflinePreparationScreen } from '../features/consolidated-data/screens/OfflinePreparationScreen';
import { AlertModal } from '../shared/components/AlertModal';
import { AuthenticatedLayout } from '../shared/components/AuthenticatedLayout';
import { LoadingScreen } from '../shared/components/LoadingScreen';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Preparation: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const {
    clearForceFullRefresh,
    dismissDataRefreshPrompt,
    forceFullRefresh,
    isLoading,
    isOfflineReady,
    markOfflineReady,
    requestFullRefresh,
    session,
    shouldPromptDataRefresh,
  } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && (!isOfflineReady || forceFullRefresh) ? (
          <Stack.Screen name="Preparation">
            {() => (
              <OfflinePreparationScreen
                forceFullRefresh={forceFullRefresh}
                onAdvance={() => {
                  markOfflineReady();
                  clearForceFullRefresh();
                }}
              />
            )}
          </Stack.Screen>
        ) : session ? (
          <Stack.Screen name="Home">
            {() => (
              <AuthenticatedLayout>
                <HomeScreen />
              </AuthenticatedLayout>
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen component={LoginScreen} name="Login" />
        )}
      </Stack.Navigator>
      <AlertModal
        cancelLabel="Agora nao"
        confirmLabel="Buscar novamente"
        description="Os dados gerais deste aparelho ja estao disponiveis. Deseja baixa-los novamente agora?"
        onCancel={dismissDataRefreshPrompt}
        onClose={dismissDataRefreshPrompt}
        onConfirm={() => {
          dismissDataRefreshPrompt();
          requestFullRefresh();
        }}
        title="Atualizar dados gerais?"
        visible={Boolean(session && isOfflineReady && shouldPromptDataRefresh && !forceFullRefresh)}
      />
      <ReauthModal />
    </>
  );
}
