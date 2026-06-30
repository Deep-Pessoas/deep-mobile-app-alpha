import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** Itens concluídos. */
  completed: number;
  /** Total de itens. */
  total: number;
  /** Fração (0..1) do upload do item que está sendo enviado AGORA. É somada ao
   *  progresso para o anel único avançar suavemente durante o upload das imagens,
   *  e não só em saltos quando um item inteiro termina. */
  inFlightRatio?: number;
  size?: number;
};

export function SyncProgressRing({ completed, total, inFlightRatio = 0, size = 104 }: Props) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const safeInFlight = Math.max(0, Math.min(1, inFlightRatio));
  // Anel ÚNICO: progresso geral incluindo o upload das imagens do item atual.
  const ratio = total > 0 ? Math.max(0, Math.min(1, (completed + safeInFlight) / total)) : 0;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
      toValue: ratio,
      useNativeDriver: false,
    }).start();
  }, [anim, ratio]);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  return (
    <View style={{ height: size, width: size }}>
      {/* Rotaciona o SVG inteiro -90° para o progresso começar no topo (12h). */}
      <Svg height={size} width={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={cx} cy={cy} fill="none" opacity={0.3} r={radius} stroke="#fff" strokeWidth={stroke} />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          fill="none"
          r={radius}
          stroke="#fff"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-2xl font-bold text-white">{completed}</Text>
        <Text className="-mt-1 text-[11px] font-medium text-primary-100">de {total}</Text>
      </View>
    </View>
  );
}
