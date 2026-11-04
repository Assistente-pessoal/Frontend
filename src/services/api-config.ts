import { Platform } from 'react-native';

import { resolveApiBaseUrl } from '@/utils/api-url';

// Acesso direto necessário para o Expo substituir a variável no bundle.
export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, Platform.OS);
export const API_TIMEOUT_MS = 75_000;

export function connectionHint(): string {
  if (API_BASE_URL.startsWith('https://')) {
    return 'Verifique sua conexão e a disponibilidade da API publicada.';
  }
  return Platform.OS === 'android'
    ? 'No emulador Android use http://10.0.2.2:8080; em aparelho físico use uma API acessível pela rede.'
    : 'Confirme o backend em execução e a origem do navegador na configuração CORS.';
}
