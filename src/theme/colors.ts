import { useColorScheme } from 'react-native';

const light = {
  background: '#FBF7F2',
  card: '#FFFFFF',
  text: '#2B2118',
  textSecondary: '#7A6E63',
  tint: '#C8553D',
  tintSoft: '#F6E3DD',
  border: '#EADFD3',
  danger: '#B3261E',
  placeholder: '#F1E6DA',
};

const dark: typeof light = {
  background: '#17120E',
  card: '#241D17',
  text: '#F5EDE4',
  textSecondary: '#A89B8E',
  tint: '#E8785F',
  tintSoft: '#3A2620',
  border: '#372D25',
  danger: '#FF7A70',
  placeholder: '#2E241C',
};

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = 20;

export const shadow = {
  shadowColor: '#3B2414',
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;
