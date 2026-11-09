export const GOOGLE_SIGN_IN_AVAILABLE = false;

export async function requestGoogleIdToken(): Promise<string | null> {
  throw new Error('O login com Google está disponível apenas no aplicativo para Android.');
}

export async function signOutFromGoogle(): Promise<void> {}
