import { ActivityIndicator, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-primary-50">
      <ActivityIndicator color="#ef561d" size="large" />
    </View>
  );
}
