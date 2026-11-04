import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  const transition = useRef(0);
  const cleanup = useRef<Promise<string | null>>(Promise.resolve(null));

  const clearLocalSession = useCallback((storageCleanup = clearAccessToken()) => {
    // Queue cleanup before showing login so a new account cannot race native work.
    const pending = Promise.allSettled([storageCleanup, clearScheduledReminders()]).then((results) => {
      const warnings: string[] = [];
      if (results[0].status === 'rejected') warnings.push('Não foi possível excluir o token armazenado no aparelho.');
      if (results[1].status === 'rejected') warnings.push('Não foi possível remover todas as notificações da conta anterior.');
      return warnings.length ? warnings.join(' ') : null;
    });
    cleanup.current = pending;
    return pending;
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSessionExpired((storageCleanup) => {
      const expected = ++transition.current;
      const pending = clearLocalSession(storageCleanup);
      setUser(null);
      setStartupMessage('Sua sessão expirou. Entre novamente.');
      void pending.then((warning) => {
        if (active && expected === transition.current && warning) {
          setStartupMessage(`Sua sessão expirou. ${warning} Tente entrar novamente para repetir a limpeza.`);
        }
      });
    });
    const expected = transition.current;
    void (async () => {
      try {
        const token = await restoreAccessToken();
        if (!active || expected !== transition.current) return;
        if (!token) {
          const warning = await clearLocalSession();
          if (active && expected === transition.current && warning) setStartupMessage(warning);
          return;
        }
        const restored = await currentUserOnApi(token);
        if (active && expected === transition.current && getAccessToken() === token) setUser(restored);
      } catch (error) {
        if (!active || expected !== transition.current) return;
        const warning = await clearLocalSession();
        if (!active || expected !== transition.current) return;
        setUser(null);
        const message = error instanceof Error && error.message.includes('conectar')
          ? 'Não foi possível validar a sessão. Conecte-se à internet e entre novamente.'
          : 'Entre novamente para continuar.';
        setStartupMessage([message, warning].filter(Boolean).join(' '));
      } finally { if (active) setInitializing(false); }
    })();
    return () => { active = false; unsubscribe(); };
  }, [clearLocalSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const expected = ++transition.current;
    let warning = await cleanup.current;
    if (warning) warning = await clearLocalSession();
    if (warning) throw new Error(`${warning} Não foi possível iniciar outra sessão com segurança. Tente novamente.`);
    if (expected !== transition.current) throw new Error('O login foi cancelado. Tente novamente.');
    const result = await loginOnApi(email, password);
    try {
      if (expected !== transition.current) throw new Error('O login foi cancelado. Tente novamente.');
      await saveAccessToken(result.accessToken);
      if (expected !== transition.current) throw new Error('O login foi cancelado. Tente novamente.');
    } catch {
      try { await logoutOnApi(result.accessToken); } catch { /* servidor expira a sessão */ }
      throw new Error('Não foi possível proteger a sessão neste aparelho. Login cancelado.');
    }
    setUser(result.user);
    setStartupMessage(null);
  }, [clearLocalSession]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await registerOnApi(name, email, password);
    try {
      await signIn(email, password);
    } catch {
      throw new Error('Sua conta foi criada, mas não foi possível entrar automaticamente. Selecione Entrar e tente novamente.');
    }
  }, [signIn]);

  const signOut = useCallback(async () => {
    const expected = ++transition.current;
    const token = getAccessToken();
    const localCleanup = clearLocalSession();
    // Hide private state immediately; warnings live in the provider/login screen.
    setUser(null);
    setStartupMessage(null);
    const [warning, remote] = await Promise.all([
      localCleanup,
      Promise.allSettled([token ? logoutOnApi(token) : Promise.resolve()]),
    ]);
    if (expected !== transition.current) return;
    const remoteWarning = remote[0].status === 'rejected'
      ? 'Não foi possível confirmar o logout no servidor. O token remoto expira automaticamente.'
      : null;
    setStartupMessage([warning, remoteWarning].filter(Boolean).join(' ') || null);
  }, [clearLocalSession]);

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
