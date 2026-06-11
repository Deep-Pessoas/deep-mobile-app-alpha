import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;

if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
  throw new Error('API_URL nao foi configurada no arquivo .env.');
}

export const env = {
  apiUrl,
};
