import baseConfig from './app.json';

export default {
  ...baseConfig.expo,
  extra: {
    apiUrl: process.env.API_URL,
    eas: {
      projectId: '16a7ebc8-5154-4f69-bcbb-efcbf82da804',
    },
  },
};
