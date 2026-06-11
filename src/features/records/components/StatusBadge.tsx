import { Text, View } from 'react-native';

type Props = {
  color?: string;
  name: string;
};

export function StatusBadge({ color, name }: Props) {
  if (!color) {
    return (
      <View className="flex-row items-center rounded-full bg-zinc-100 px-3 py-1.5">
        <Text className="text-xs font-medium text-zinc-600">{name}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: `${color}20` }}>
      <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-medium" style={{ color }}>{name}</Text>
    </View>
  );
}
