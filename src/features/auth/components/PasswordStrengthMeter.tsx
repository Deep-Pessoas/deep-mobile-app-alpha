import { Text, View } from 'react-native';

import { getPasswordStrength } from '../utils/passwordStrength';

type Props = {
  password: string;
};

function PasswordStrengthMeter({ password }: Props) {
  const strength = getPasswordStrength(password);

  return (
    <View className="mt-4 px-1">
      <View className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <View className="h-full rounded-full" style={{ backgroundColor: strength.color, width: strength.width }} />
      </View>
      <Text className="mt-2 text-xs text-zinc-500">Seguranca: {strength.label}</Text>
    </View>
  );
}

export { PasswordStrengthMeter };
