import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { StatusFilter } from '../types/records';

type Props = {
  onClear: () => void;
  onClose: () => void;
  onSelect: (guid: string) => void;
  selectedStatus: string;
  statuses: StatusFilter[];
  visible: boolean;
};

export function FilterModal({ onClear, onClose, onSelect, selectedStatus, statuses, visible }: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/30 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-white p-5">
          <Text className="text-base font-semibold text-zinc-950">Filtrar por situacao</Text>

          <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
            {statuses.map((status) => {
              const isSelected = selectedStatus === status.guid;

              return (
                <Pressable
                  className={`mt-2 flex-row items-center rounded-xl px-4 py-3 ${
                    isSelected ? 'bg-primary-500' : 'bg-zinc-50'
                  }`}
                  key={status.guid}
                  onPress={() => onSelect(status.guid)}
                >
                  <View className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color || '#a1a1aa' }} />
                  <Text className={`ml-3 flex-1 text-base font-normal ${isSelected ? 'text-white' : 'text-zinc-700'}`}>
                    {status.displayName}
                  </Text>
                  {isSelected ? <Text className="text-base font-semibold text-white">✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="mt-5 flex-row gap-2">
            <Pressable
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white active:bg-zinc-50"
              onPress={onClear}
            >
              <Text className="text-base font-normal text-zinc-700">Limpar</Text>
            </Pressable>
            <Pressable
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-zinc-100 active:bg-zinc-200"
              onPress={onClose}
            >
              <Text className="text-base font-normal text-zinc-700">Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
