import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  clearAppData,
  createDefaultAppData,
  loadAppData,
  saveAppData,
  type AppData
} from "../data/appData";
import { hydrateFromBackend } from "../api/backend";

interface AppStateValue {
  data: AppData;
  ready: boolean;
  /** False when the backend is unreachable; the UI still runs from local data. */
  online: boolean;
  updateData: (updater: (current: AppData) => AppData) => void;
  /** Re-pulls server state after a write. Safe to call when offline. */
  refresh: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createDefaultAppData());
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);

  /**
   * Local IndexedDB stays the immediate source of truth so Check-In and
   * Reflection keep working offline (docs/PRODUCT_GUARDRAILS.md); this
   * overlays whatever the server already knows on top of it.
   */
  const refresh = useCallback(async () => {
    try {
      const snapshot = await loadAppData();
      const { patch } = await hydrateFromBackend(snapshot);
      setData((current) => ({ ...current, ...patch }));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    loadAppData()
      .then((storedData) => {
        if (!active) return undefined;
        setData(storedData);
        setReady(true);
        return refresh();
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (ready) {
      void saveAppData(data);
    }
  }, [data, ready]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      ready,
      online,
      updateData: setData,
      refresh,
      resetDemo: async () => {
        await clearAppData();
        setData(createDefaultAppData());
      }
    }),
    [data, ready, online, refresh]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);

  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return value;
}
