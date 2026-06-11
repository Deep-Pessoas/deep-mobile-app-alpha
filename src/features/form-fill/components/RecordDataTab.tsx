import { ScrollView, Text, View } from 'react-native';

type Props = {
  data: Record<string, unknown>;
};

const HIDDEN_KEY_PATTERN = /(id|guid)$/i;

function formatLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function RecordDataTab({ data }: Props) {
  const entries = Object.entries(data).filter(
    ([key, value]) => value !== undefined && !HIDDEN_KEY_PATTERN.test(key),
  );

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {entries.map(([key, value]) => (
        <View className="mb-3 rounded-2xl border border-zinc-200 bg-white p-4" key={key}>
          <Text className="mb-1 text-xs font-semibold uppercase text-zinc-500">{formatLabel(key)}</Text>
          <Text className="text-base leading-5 text-zinc-800">{formatValue(value)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
