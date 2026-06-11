import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useAuthLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalPadding = width < 360 ? 18 : 24;

  return {
    insets,
    horizontalPadding,
    contentWidth: Math.min(width - horizontalPadding * 2, 480),
    modalWidth: Math.min(width - horizontalPadding * 2, 420),
  };
}
