import { Text, View } from 'react-native';

function StatusIcon({ success = false }: { success?: boolean }) {
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-full ${success ? 'bg-green-100' : 'bg-primary-100'}`}>
      <Text className={`text-2xl font-bold ${success ? 'text-green-600' : 'text-primary-600'}`}>
        {success ? '✓' : '!'}
      </Text>
    </View>
  );
}

export { StatusIcon };
