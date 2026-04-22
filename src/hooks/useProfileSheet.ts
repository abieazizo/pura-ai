import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Consistent handle for opening the Profile bottom sheet from any screen.
 * Avatars call `open()` in their onPress.
 */
export function useProfileSheet() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  return {
    open: () => nav.navigate('ProfileSheet'),
  };
}
