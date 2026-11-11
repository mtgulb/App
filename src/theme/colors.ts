import { useColorScheme } from 'react-native';

const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#6C6C70',
  tint: '#007AFF',
  border: '#D1D1D6',
  danger: '#D70015',
};

const dark: typeof light = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#98989F',
  tint: '#0A84FF',
  border: '#38383A',
  danger: '#FF453A',
};

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = 14;
