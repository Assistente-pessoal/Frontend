import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { checkVoxApiHealth, type VoxInterpretation } from '@/services/vox-api';

type ApiStatus = 'unknown' | 'online' | 'offline';
type ReminderSessionValue = {
  draftText: string;
  setDraftText: (text: string) => void;
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
  const [draftText, setDraftText] = useState('');
  const [lastSaved, setLastSaved] = useState<VoxInterpretation | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unknown');
  const [apiChecking, setApiChecking] = useState(true);
  const [apiStatusMessage, setApiStatusMessage] = useState('Verificando conexão com a Agenda API…');

  const mounted = useRef(false);
  const sequence = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const reportApiResult = useCallback((status: ApiStatus, message: string) => {
    // A completed functional request supersedes an earlier health probe.
    sequence.current += 1;
    inFlight.current?.abort();
    setApiStatus(status);
    setApiStatusMessage(message);
    setApiChecking(false);
  }, []);

  const performCheck = useCallback(async (controller: AbortController, expected: number) => {
    try {
      await checkVoxApiHealth({ signal: controller.signal });
      if (!mounted.current || controller.signal.aborted || expected !== sequence.current) return;
      setApiStatus('online');
      setApiStatusMessage('Agenda API conectada e respondendo.');
    } catch (error) {
      if (!mounted.current || controller.signal.aborted || expected !== sequence.current) return;
      setApiStatus('offline');
      setApiStatusMessage(error instanceof Error ? error.message : 'Não foi possível conectar à Agenda API.');
    } finally {
      if (mounted.current && !controller.signal.aborted && expected === sequence.current) setApiChecking(false);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const expected = ++sequence.current;
    setApiChecking(true);
    setApiStatusMessage('Verificando conexão com a Agenda API…');
    await performCheck(controller, expected);
  }, [performCheck]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    inFlight.current = controller;
    const expected = ++sequence.current;
    // Initial checking state is already rendered; only async results update it.
    void performCheck(controller, expected);
    return () => {
      mounted.current = false;
      inFlight.current?.abort();
    };
  }, [performCheck]);

  const value = useMemo(() => ({
    draftText, setDraftText, lastSaved, setLastSaved, apiStatus, apiChecking, apiStatusMessage, checkConnection, reportApiResult,
  }), [draftText, lastSaved, apiStatus, apiChecking, apiStatusMessage, checkConnection, reportApiResult]);

  return <ReminderSessionContext.Provider value={value}>{children}</ReminderSessionContext.Provider>;
}

export function useReminderSession() {
  const context = useContext(ReminderSessionContext);
  if (!context) throw new Error('useReminderSession requer ReminderSessionProvider.');
  return context;
}
