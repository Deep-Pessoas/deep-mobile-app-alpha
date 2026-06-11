import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FormOption, FormValue } from '../types/form';

type SelectionRequest = {
  onChange: (value: FormValue) => void;
  options: FormOption[];
  required: boolean;
  selectedValue: FormValue;
  title?: string;
};

type SelectionSheetContextValue = {
  openSelection: (request: SelectionRequest) => void;
};

const SelectionSheetContext = createContext<SelectionSheetContextValue | null>(null);

export function useSelectionSheet() {
  const context = useContext(SelectionSheetContext);
  if (!context) throw new Error('SelectionSheetProvider nao encontrado.');
  return context;
}

export function SelectionSheetProvider({ children }: PropsWithChildren) {
  const [request, setRequest] = useState<SelectionRequest | null>(null);
  const [search, setSearch] = useState('');
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const filteredOptions = useMemo(() => {
    if (!request) return [];
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedSearch) return request.options;
    return request.options.filter((option) => option.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
  }, [request, search]);

  const close = useCallback(() => {
    setSearch('');
    setRequest(null);
  }, []);

  const openSelection = useCallback((nextRequest: SelectionRequest) => {
    setSearch('');
    setRequest(nextRequest);
  }, []);
  const contextValue = useMemo(() => ({ openSelection }), [openSelection]);

  return (
    <SelectionSheetContext.Provider value={contextValue}>
      <View className="flex-1">
        {children}

        {request ? (
          <View className="absolute inset-0 z-50 justify-end bg-black/40">
            <Pressable className="absolute inset-0" onPress={close} />
            <View
              className="rounded-t-3xl bg-white px-4 pb-6 pt-4"
              style={{ height: height * 0.7, paddingBottom: insets.bottom + 24 }}
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="flex-1 text-lg font-bold text-zinc-900" numberOfLines={1}>{request.title ?? 'Selecione uma opcao'}</Text>
                <Pressable className="ml-3 min-h-10 justify-center px-2" onPress={close}>
                  <Text className="text-sm font-semibold text-zinc-500">Fechar</Text>
                </Pressable>
              </View>

              <TextInput
                className="mb-3 h-12 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900"
                onChangeText={setSearch}
                placeholder="Pesquisar opcao"
                placeholderTextColor="#a1a1aa"
                value={search}
              />

              <FlatList
                className="flex-1"
                contentContainerStyle={{ paddingBottom: insets.bottom }}
                data={filteredOptions}
                initialNumToRender={12}
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="always"
                keyExtractor={(option) => String(option.value)}
                ListEmptyComponent={<Text className="py-6 text-center text-sm text-zinc-500">Nenhuma opcao encontrada.</Text>}
                maxToRenderPerBatch={12}
                renderItem={({ item: option }) => {
                  const selected = String(option.value) === String(request.selectedValue);
                  return (
                    <Pressable
                      className={`mb-2 min-h-12 justify-center rounded-xl border px-4 ${
                        selected ? 'border-primary-500 bg-primary-50' : 'border-zinc-200 bg-zinc-50'
                      }`}
                      onPress={() => {
                        request.onChange(String(option.value));
                        close();
                      }}
                    >
                      <Text className="text-base text-zinc-800">{option.label}</Text>
                    </Pressable>
                  );
                }}
                windowSize={5}
              />

              {request.selectedValue !== null && request.selectedValue !== undefined && !request.required ? (
                <Pressable
                  className="mt-2 min-h-12 items-center justify-center rounded-xl bg-zinc-100"
                  onPress={() => {
                    request.onChange(null);
                    close();
                  }}
                >
                  <Text className="text-sm font-semibold text-zinc-600">Limpar selecao</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </SelectionSheetContext.Provider>
  );
}
