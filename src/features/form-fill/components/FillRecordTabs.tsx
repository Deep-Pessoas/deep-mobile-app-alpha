import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export type FillRecordTab = 'actions' | 'form' | 'record';

type Props = {
  activeTab: FillRecordTab;
  onChange: (tab: FillRecordTab) => void;
  saveState: 'error' | 'idle' | 'saved' | 'saving';
};

const tabs: { id: FillRecordTab; label: string }[] = [
  { id: 'form', label: 'Formulário' },
  { id: 'record', label: 'Dados do registro' },
  { id: 'actions', label: 'Ações' },
];

export function FillRecordTabs({ activeTab, onChange, saveState }: Props) {
  return (
    <View className="flex-row border-b border-zinc-200 bg-white px-2">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            className={`flex-1 items-center border-b-2 px-1 py-3 ${active ? 'border-primary-500' : 'border-transparent'}`}
            key={tab.id}
            onPress={() => onChange(tab.id)}
          >
            <View className="flex-row items-center justify-center gap-1.5">
              <Text className={`text-center text-xs font-semibold ${active ? 'text-primary-600' : 'text-zinc-500'}`}>
                {tab.label}
              </Text>
              {tab.id === 'form' ? (
                <View className="h-4 w-4 items-center justify-center">
                  {saveState === 'saving' ? (
                    <ActivityIndicator color="#8b5cf6" size="small" style={{ transform: [{ scale: 0.7 }] }} />
                  ) : null}
                  {saveState === 'saved' ? <Text className="text-xs font-bold leading-4 text-green-600">✓</Text> : null}
                  {saveState === 'error' ? <Text className="text-xs font-bold leading-4 text-red-600">!</Text> : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
