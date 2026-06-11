import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { RecordCard } from '../../consolidated-data/types/offline';
import { StatusBadge } from './StatusBadge';

type Props = {
  item: RecordCard;
  onOpenRecord: (recordGuid: string) => void;
};

function RecordCardItemComponent({ item, onOpenRecord }: Props) {
  const openRecord = () => onOpenRecord(item.guid);

  const borderColor = item.backofficeStatusColor ?? '#e4e4e7';

  const inner = (
    <>
      <View className="mb-3 flex-row items-start">
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
          <Text className="text-sm font-bold text-zinc-600">{item.sequentialNumber}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-zinc-900" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-zinc-500" numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>

      <View
        className="flex-row items-center justify-between border-t border-zinc-100 pt-1.5"
      >
        <StatusBadge
          color={item.backofficeStatusColor}
          name={item.backofficeStatusName}
        />

        {item.canFill ? (
          <Pressable
            className="items-center justify-center rounded-xl bg-primary-500 px-6 py-2.5 active:bg-primary-600"
            onPress={openRecord}
          >
            <Text className="text-sm font-semibold text-white">{item.hasOfflineDraft ? 'Continuar' : 'Preencher'}</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  const wrapperClass = 'flex-row bg-white';
  const wrapperStyle = { borderTopWidth: 4, borderTopColor: '#e4e4e7' };

  const cardBody = (
    <>
      <View style={{ width: 10, backgroundColor: borderColor }} />
      <View className="flex-1 p-4">
        {inner}
      </View>
    </>
  );

  if (!item.canFill) {
    return <View className={wrapperClass} style={wrapperStyle}>{cardBody}</View>;
  }

  return (
    <Pressable className={`${wrapperClass} active:bg-zinc-50`} style={wrapperStyle} onPress={openRecord}>
      {cardBody}
    </Pressable>
  );
}

export const RecordCardItem = memo(
  RecordCardItemComponent,
  (previous, next) => previous.item === next.item && previous.onOpenRecord === next.onOpenRecord,
);
