import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

async function loadNotifications() {
  if (Constants.executionEnvironment === 'storeClient') {
    throw new Error('Push remoto exige um development build; nao funciona no Expo Go.');
  }

  return import('expo-notifications');
}

export async function configureNotificationHandling() {
  const Notifications = await loadNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string> {
  const Notifications = await loadNotifications();

  if (!Device.isDevice) {
    throw new Error('Notificacoes push exigem um dispositivo fisico.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      importance: Notifications.AndroidImportance.MAX,
      name: 'Padrao',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions =
    currentPermissions.status === 'granted'
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();

  if (permissions.status !== 'granted') {
    throw new Error('Permissao para notificacoes nao concedida.');
  }

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    throw new Error('projectId do EAS nao foi configurado.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
