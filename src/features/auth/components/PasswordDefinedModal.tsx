import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { StatusIcon } from './StatusIcon';
import { useAuthLayout } from '../utils/useAuthLayout';

type Props = {
  onConfirm: () => void;
  visible: boolean;
};

function PasswordDefinedModal({ onConfirm, visible }: Props) {
  const { horizontalPadding, insets, modalWidth } = useAuthLayout();

  return (
    <Modal animationType="fade" statusBarTranslucent={Platform.OS === 'android'} transparent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/50" style={{ paddingHorizontal: horizontalPadding, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="items-center rounded-3xl bg-white p-6" style={{ width: modalWidth }}>
          <StatusIcon success />
          <Text className="mt-4 text-center text-xl font-semibold text-zinc-950">Senha definida</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-zinc-600">
            Sua senha foi definida. Use-a nos proximos acessos.
          </Text>
          <Pressable className="mt-6 min-h-12 w-full items-center justify-center rounded-2xl bg-primary-500 px-4" onPress={onConfirm}>
            <Text className="font-semibold text-white">Ok, entendi</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export { PasswordDefinedModal };
