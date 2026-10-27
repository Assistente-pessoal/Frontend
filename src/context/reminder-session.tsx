import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { checkVoxApiHealth, type VoxInterpretation } from '@/services/vox-api';

type ApiStatus = 'unknown' | 'online' | 'offline';
type ReminderSessionValue = {
  lastSaved: VoxInterpretation | null;
  setLastSaved: (reminder: VoxInterpretation | null) => void;
  apiStatus: ApiStatus;
  apiChecking: boolean;
  apiStatusMessage: string;
  checkConnection: () => Promise<void>;
  reportApiResult: (status: ApiStatus, message: string) => void;
};

const ReminderSessionContext = createContext<ReminderSessionValue | null>(null);

export function ReminderSessionProvider({ children }: PropsWithChildren) {
  const [lastSaved, setLastSaved] = useState<VoxInterpretation | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unknown');
  const [apiChecking, setApiChecking] = useState(true);
  const [apiStatusMessage, setApiStatusMessage] = useState('Verificando conexão com a Agenda API…');

  const reportApiResult = useCallback((status: ApiStatus, message: string) => {
    setApiStatus(status);
    setApiStatusMessage(message);
  }, []);

  const checkConnection = useCallback(async () => {
    setApiChecking(true);
    setApiStatusMessage('Verificando conexão com a Agenda API…');
    try {
      await checkVoxApiHealth();
      reportApiResult('online', 'Agenda API conectada e respondendo.');
    } catch (error) {
      reportApiResult('offline', error instanceof Error ? error.message : 'Não foi possível conectar à Agenda API.');
    } finally {
      setApiChecking(false);
    }
  }, [reportApiResult]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  const value = useMemo(() => ({
    lastSaved, setLastSaved, apiStatus, apiChecking, apiStatusMessage, checkConnection, reportApiResult,
  }), [lastSaved, apiStatus, apiChecking, apiStatusMessage, checkConnection, reportApiResult]);

  return <ReminderSessionContext.Provider value={value}>{children}</ReminderSessionContext.Provider>;
}

export function useReminderSession() {
  const context = useContext(ReminderSessionContext);
  if (!context) throw new Error('useReminderSession requer ReminderSessionProvider.');
  return context;
}
