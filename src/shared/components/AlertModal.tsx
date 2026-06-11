import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon } from './Icon';

type Props = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel?: string;
  description: string;
  onCancel?: () => void;
  onConfirm: () => void;
  onClose: () => void;
  title: string;
  variant?: 'default' | 'success';
  visible: boolean;
};

export function AlertModal({
  cancelLabel = 'Cancelar',
  children,
  confirmLabel = 'OK',
  description,
  onCancel,
  onConfirm,
  onClose,
  title,
  variant = 'default',
  visible,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const modalWidth = Math.min(width - 48, 420);
  const isSuccess = variant === 'success';
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { friction: 8, tension: 80, toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { duration: 220, toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, visible]);

  const footer = (action: () => void, label: string, primary: boolean): ReactNode => (
    <Pressable
      className={`min-h-12 flex-1 items-center justify-center rounded-2xl px-4 ${
        primary
          ? isSuccess
            ? 'bg-green-600 active:bg-green-700'
            : 'bg-primary-500 active:bg-primary-600'
          : 'border border-zinc-300 bg-white active:bg-zinc-50'
      }`}
      onPress={action}
    >
      <Text className={`font-semibold ${primary ? 'text-white' : 'text-zinc-700'}`}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
      transparent
      visible={visible}
    >
      <View
        className="flex-1 items-center justify-center bg-black/50 px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Animated.View
          className="items-center rounded-3xl bg-white p-6"
          style={{ opacity, transform: [{ scale }], width: modalWidth }}
        >
          {isSuccess ? (
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckIcon color="#16a34a" size={28} />
            </View>
          ) : null}
          <Text className={`text-center text-lg font-bold ${isSuccess ? 'text-green-700' : 'text-zinc-950'}`}>{title}</Text>
          <Text className="mt-3 text-center text-sm leading-5 text-zinc-600">{description}</Text>
          {children}
          <View className="mt-6 w-full flex-row gap-3">
            {onCancel ? footer(() => {
              onCancel();
              onClose();
            }, cancelLabel, false) : null}
            {footer(onConfirm, confirmLabel, !onCancel)}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
