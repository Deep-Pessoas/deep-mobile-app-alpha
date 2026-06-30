import { Pressable, Text, View } from 'react-native';

export type RecordsTabKey = 'available' | 'pending' | 'todos';

type Props = {
  activeTab: RecordsTabKey;
  onChange: (tab: RecordsTabKey) => void;
  pendingCount: number;
};

const TABS: { key: RecordsTabKey; label: string }[] = [
  { key: 'available', label: 'Disponíveis' },
  { key: 'pending', label: 'Sync' },
  { key: 'todos', label: 'Todos' },
];

export function RecordsTabs({ activeTab, onChange, pendingCount }: Props) {
  return (
    <View className="flex-row border-b border-zinc-200 bg-white px-2">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        const showBadge = tab.key === 'pending' && pendingCount > 0;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center active:opacity-70"
            onPress={() => onChange(tab.key)}
          >
            <View className="flex-row items-center gap-1.5 py-3">
              <Text
                className={`text-sm font-semibold ${isActive ? 'text-primary-600' : 'text-zinc-500'}`}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {showBadge ? (
                <View
                  className={`min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-primary-500' : 'bg-zinc-300'
                  }`}
                >
                  <Text className="text-[11px] font-bold text-white">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className={`h-0.5 w-full ${isActive ? 'bg-primary-500' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
