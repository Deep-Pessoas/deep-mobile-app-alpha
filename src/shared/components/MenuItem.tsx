import { Pressable, Text, View } from 'react-native';

function MenuItem({ active = false, label, symbol, onPress }: { active?: boolean; label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      className={`min-h-14 flex-row items-center rounded-2xl px-4 ${active ? 'bg-primary-500' : 'active:bg-zinc-100'}`}
      onPress={onPress}
    >
      <View className={`h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white/20' : 'bg-zinc-200'}`}>
        <Text className={`font-bold ${active ? 'text-white' : 'text-zinc-600'}`}>{symbol}</Text>
      </View>
      <Text className={`ml-3 font-semibold ${active ? 'text-white' : 'text-zinc-700'}`}>{label}</Text>
    </Pressable>
  );
}

export { MenuItem };
