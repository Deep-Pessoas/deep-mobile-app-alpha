import { Text, View } from 'react-native';

type AuthStep = 'cpf' | 'password' | 'reset-password';

function StepIndicator({ current }: { current: AuthStep }) {
  return (
    <View className="flex-row items-center">
      <View className="h-1.5 flex-1 rounded-full bg-primary-500" />
      <View className={`mx-2 h-1.5 flex-1 rounded-full ${current === 'cpf' ? 'bg-primary-100' : 'bg-primary-500'}`} />
    </View>
  );
}

export type { AuthStep };
export { StepIndicator };
