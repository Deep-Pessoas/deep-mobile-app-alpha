import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

type Props = PropsWithChildren<{
  error?: string;
  helper?: string;
  label?: string;
  required?: boolean;
}>;

export function FieldContainer({ children, error, helper, label, required }: Props) {
  return (
    <View>
      {label ? (
        <Text className="mb-2 text-base font-semibold text-zinc-800">
          {label}
          {required ? <Text className="text-red-500"> *</Text> : null}
        </Text>
      ) : null}
      <View className={error ? 'rounded-xl border-2 border-red-400' : ''}>
        {children}
      </View>
      {helper && !error ? <Text className="mt-2 text-xs text-zinc-500">{helper}</Text> : null}
      {error ? <Text className="mt-2 text-xs font-medium text-red-600">{error}</Text> : null}
    </View>
  );
}
