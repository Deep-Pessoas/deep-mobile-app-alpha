import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { StatusIcon } from './StatusIcon';
import { useAuthLayout } from '../utils/useAuthLayout';

type Props = {
  onClose: () => void;
  visible: boolean;
};

function AccessBlockedModal({ onClose, visible }: Props) {
  const { horizontalPadding, insets, modalWidth } = useAuthLayout();

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent={Platform.OS === 'android'} transparent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/50" style={{ paddingHorizontal: horizontalPadding, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="items-center rounded-3xl bg-white p-6" style={{ width: modalWidth }}>
          <StatusIcon />
          <Text className="mt-4 text-center text-xl font-semibold text-zinc-950">Acesso não permitido</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-zinc-600">
            Seu nivel de acesso nao tem permissao para esse aplicativo.
          </Text>
          <Pressable className="mt-6 min-h-12 w-full items-center justify-center rounded-2xl bg-primary-500 px-4" onPress={onClose}>
            <Text className="font-semibold text-white">Entendi</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export { AccessBlockedModal };
