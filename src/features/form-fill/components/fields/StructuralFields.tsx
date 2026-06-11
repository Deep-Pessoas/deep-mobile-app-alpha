import { Text, View } from 'react-native';

import type { DynamicField } from '../../types/form';

export function TitleField({ field, isLastChild }: { field: DynamicField; isLastChild?: boolean }) {
  return (
    <View
      className="border-l-2 border-primary-500 pl-3"
      style={{ marginBottom: isLastChild ? 0 : 6, marginTop: 2 }}
    >
      <Text className="text-lg font-bold text-zinc-900">{field.config.titleText}</Text>
      {field.config.description ? <Text className="mt-1 text-sm text-zinc-500">{field.config.description}</Text> : null}
    </View>
  );
}

export function DividerField({ isLastChild }: { isLastChild?: boolean }) {
  return <View className="h-px bg-zinc-200" style={{ marginBottom: isLastChild ? 0 : 8, marginTop: 2 }} />;
}
