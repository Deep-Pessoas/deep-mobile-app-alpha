import { Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  activeFilterLabel?: string;
  onChangeSearch: (value: string) => void;
  onOpenFilter: () => void;
  search: string;
};

export function RecordsToolbar({ activeFilterLabel, onChangeSearch, onOpenFilter, search }: Props) {
  const hasActiveFilter = Boolean(activeFilterLabel);

  return (
    <View className="border-b border-zinc-200 bg-white px-4 py-1.5">
      <View className="flex-row items-center gap-2">
        <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4">
          <Text className="mr-2 text-lg text-zinc-400">⌕</Text>
          <TextInput
            className="flex-1 p-0 text-base text-zinc-900"
            onChangeText={onChangeSearch}
            placeholder="Buscar por nome, endereco, codigo ou rua..."
            placeholderTextColor="#a1a1aa"
            value={search}
          />
        </View>

        <Pressable
          accessibilityLabel="Abrir filtros"
          className={`h-12 flex-row items-center justify-center rounded-2xl border px-4 ${
            hasActiveFilter ? 'border-primary-500 bg-primary-500' : 'border-zinc-200 bg-zinc-50'
          }`}
          onPress={onOpenFilter}
        >
          <Text className={`text-sm font-semibold ${hasActiveFilter ? 'text-white' : 'text-zinc-600'}`}>
            Filtro
          </Text>
        </Pressable>
      </View>

      {activeFilterLabel ? (
        <View className="mt-1 flex-row items-center">
          <Text className="text-xs text-zinc-400">Filtro: </Text>
          <Text className="text-xs font-medium text-primary-600">{activeFilterLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
