import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { currentUserOnApi, loginOnApi, logoutOnApi, registerOnApi, type SynapseUser } from '@/services/auth-api';
import { clearAccessToken, getAccessToken, restoreAccessToken, saveAccessToken, subscribeSessionExpired } from '@/services/auth-token';
import { clearScheduledReminders } from '@/services/vox-notifications';

type AuthContextValue = {
  user: SynapseUser | null;
  initializing: boolean;
  startupMessage: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SynapseUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [startupMessage, setStartupMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSessionExpired(() => {
      if (active) {
        setUser(null);
        setStartupMessage('Sua sessão expirou. Entre novamente.');
      }
    });
    void (async () => {
      try {
        const token = await restoreAccessToken();
        if (!token) return;
        const restored = await currentUserOnApi(token);
        if (active && getAccessToken() === token) setUser(restored);
      } catch (error) {
        // Falhas de rede NÃO revogam a sessão no servidor. Por segurança, pedir login.
        if (active) {
          setUser(null);
          setStartupMessage(error instanceof Error && error.message.includes('conectar')
            ? 'Não foi possível validar a sessão. Conecte-se à internet e entre novamente.'
            : 'Entre novamente para continuar.');
        }
      } finally { if (active) setInitializing(false); }
    })();
    return () => { active = false; unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginOnApi(email, password);
    try {
      await saveAccessToken(result.accessToken);
    } catch {
      try { await logoutOnApi(result.accessToken); } catch { /* servidor expira a sessão */ }
      throw new Error('Não foi possível proteger a sessão neste aparelho. Login cancelado.');
    }
    setUser(result.user);
    setStartupMessage(null);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await registerOnApi(name, email, password);
    try {
      await signIn(email, password);
    } catch {
      throw new Error('Sua conta foi criada, mas não foi possível entrar automaticamente. Selecione Entrar e tente novamente.');
    }
  }, [signIn]);

  const signOut = useCallback(async () => {
    const token = getAccessToken();
    // Tirar os dados privados da tela imediatamente, antes das chamadas de rede.
    setUser(null);
    setStartupMessage(null);
    const results = await Promise.allSettled([
      clearAccessToken(),
      token ? logoutOnApi(token) : Promise.resolve(),
      clearScheduledReminders(),
    ]);
    if (results[0].status === 'rejected') {
      throw new Error('Você saiu da tela, mas não foi possível excluir o token armazenado no aparelho. Verifique o armazenamento seguro antes de usar outra conta.');
    }
    if (results[1].status === 'rejected') {
      throw new Error('Sessão removida do aparelho, mas não foi possível confirmar o logout no servidor. O token remoto expira automaticamente.');
    }
    if (results[2].status === 'rejected') {
      throw new Error('Sessão encerrada, mas algumas notificações locais podem continuar agendadas.');
    }
  }, []);

  const value = useMemo(() => ({
    user, initializing, startupMessage, signIn, signUp, signOut,
  }), [user, initializing, startupMessage, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuthSession requer AuthSessionProvider.');
  return value;
}
