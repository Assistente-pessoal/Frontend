import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export const GOOGLE_SIGN_IN_AVAILABLE = true;

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
let configured = false;

function ensureConfigured(): void {
  if (!webClientId) {
    throw new Error('Login com Google não configurado. Defina EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID e gere um novo build.');
  }
  if (configured) return;
  GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined });
  configured = true;
}

export async function requestGoogleIdToken(): Promise<string | null> {
  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('O Google não retornou o token de identidade. Confira o Web Client ID configurado.');
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.IN_PROGRESS) throw new Error('Já existe um login com Google em andamento.');
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Os serviços do Google Play não estão disponíveis ou precisam ser atualizados.');
      }
      throw new Error('Não foi possível entrar com o Google. Tente novamente.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Não foi possível entrar com o Google. Tente novamente.');
  }
}

export async function signOutFromGoogle(): Promise<void> {
  if (!webClientId) return;
  ensureConfigured();
  await GoogleSignin.signOut();
}
